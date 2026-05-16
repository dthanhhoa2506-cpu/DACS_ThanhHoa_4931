import torch
import torch.nn as nn
import torch.optim as optim
import wandb
import os
import csv
import matplotlib.pyplot as plt
import time
import torch_geometric.transforms as T
from sklearn.metrics import roc_auc_score

from config import config
from preprocess import preprocess
from models.full_model import DDAPredictor
from models.contrastive_loss import GraphContrastiveLearning
from utils.metrics import compute_metrics

def generate_negative_edges(pos_edge_index, num_nodes_drug, num_nodes_disease):
    num_neg_edges = pos_edge_index.size(1)
    neg_src = torch.randint(0, num_nodes_drug, (num_neg_edges,))
    neg_dst = torch.randint(0, num_nodes_disease, (num_neg_edges,))
    neg_edge_index = torch.stack([neg_src, neg_dst], dim=0)
    return neg_edge_index

def create_directories():
    os.makedirs(os.path.join(config.root_dir, 'logs'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'checkpoints'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'results', 'models'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'results', 'metrics'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'results', 'tables'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'results', 'configs'), exist_ok=True)

def train():
    create_directories()
    
    model_type = config.gnn_type.lower()
    log_file_path = os.path.join(config.root_dir, 'logs', f'train_log_{model_type}.csv')
    
    if not os.path.exists(log_file_path):
        with open(log_file_path, mode='w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['epoch', 'total_loss', 'task_loss', 'contrastive_loss', 'val_auc'])

    if config.use_wandb:
        wandb.init(project=config.wandb_project, config=vars(config))

    device = torch.device(config.device if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device} | Model Type: {config.gnn_type}")

    data, drug_sim_emb, disease_sim_emb = preprocess()
    
    # 1. Strict Train/Val/Test Isolation using T.RandomLinkSplit to entirely halt Leakage!
    split_path = os.path.join(config.processed_dir, f'{config.dataset_name}_splits.pt')
    if os.path.exists(split_path):
        print(f"Loading existing identical Data Splits from {split_path}")
        train_data, val_data, test_data = torch.load(split_path, weights_only=False)
    else:
        print("Generating secure RandomLinkSplits to prevent Data Leakage...")
        # 1. Standard Split (1:1 neg ratio) - Safe for Classification Metrics (AUC, F1, MCC)
        transform = T.RandomLinkSplit(
            num_val=0.1,
            num_test=0.1,
            is_undirected=True,
            neg_sampling_ratio=1.0, 
            add_negative_train_samples=False,
            edge_types=[('drug', 'treats', 'disease')],
            rev_edge_types=[('disease', 'treated_by', 'drug')]
        )
        train_data, val_data, test_data = transform(data)
        torch.save((train_data, val_data, test_data), split_path)
        torch.save((train_data, val_data, test_data), split_path)
    
    train_data = train_data.to(device)
    val_data = val_data.to(device)
    drug_sim_emb = drug_sim_emb.to(device)
    disease_sim_emb = disease_sim_emb.to(device)
    
    num_drugs = data['drug'].x.size(0)
    num_diseases = data['disease'].x.size(0)
    in_channels_dict = {node_type: data[node_type].x.shape[1] for node_type in data.node_types}

    model = DDAPredictor(in_channels_dict, num_drugs, num_diseases, config).to(device)
    optimizer = optim.Adam(model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)
    
    bce_loss_fn = nn.BCEWithLogitsLoss()
    gcl = GraphContrastiveLearning(temperature=config.temperature).to(device)

    dd_edge_type = ('drug', 'treats', 'disease')
    pos_edge_index = train_data[dd_edge_type].edge_label_index

    # Pre-extract Validation target properties isolated from the general graph graph
    val_edge_index = val_data[dd_edge_type].edge_label_index
    val_labels = val_data[dd_edge_type].edge_label

    best_val_auc = 0.0
    patience_counter = 0
    nan_counter = 0

    loss_list = []
    val_auc_list = []

    print("Starting Training on securely isolated topology...")
    start_time = time.time()
    
    for epoch in range(config.epochs):
        model.train()
        optimizer.zero_grad()
        
        # 1. Dynamic Training Targets Processing
        neg_edge_index = generate_negative_edges(pos_edge_index, num_drugs, num_diseases).to(device)
        train_edge_index = torch.cat([pos_edge_index, neg_edge_index], dim=1)
        labels = torch.cat([torch.ones(pos_edge_index.size(1)), torch.zeros(neg_edge_index.size(1))]).to(device)
        
        # GNN now EXPLICITLY evaluates strictly on train_data.edge_index_dict (preventing all Val/Test leakage)
        preds, node_embs = model(train_data.x_dict, train_data.edge_index_dict, train_edge_index, drug_sim_emb, disease_sim_emb)
        task_loss = bce_loss_fn(preds, labels)
        
        # 2. Contrastive Learning augmenting over training features 
        v1_x, v1_edge = gcl.augment_graph(train_data.x_dict, train_data.edge_index_dict, config.edge_drop_prob, config.feat_mask_prob)
        v2_x, v2_edge = gcl.augment_graph(train_data.x_dict, train_data.edge_index_dict, config.edge_drop_prob, config.feat_mask_prob)
        
        _, z1 = model(v1_x, v1_edge, train_edge_index, drug_sim_emb, disease_sim_emb)
        _, z2 = model(v2_x, v2_edge, train_edge_index, drug_sim_emb, disease_sim_emb)
        
        loss_cl_drug = gcl.info_nce_loss(z1['drug'], z2['drug'])
        loss_cl_disease = gcl.info_nce_loss(z1['disease'], z2['disease'])
        contrast_loss = loss_cl_drug + loss_cl_disease
        
        total_loss = task_loss + config.contrast_weight * contrast_loss
        
        if torch.isnan(total_loss) or torch.isinf(total_loss):
            print(f"Warning: NaN or Inf loss detected at epoch {epoch}")
            nan_counter += 1
            if nan_counter >= 3:
                print("Early stopping triggered: loss is NaN.")
                break
            continue

        nan_counter = 0
        total_loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
        optimizer.step()
        
        # 3. Validation Evaluation
        model.eval()
        with torch.no_grad():
            # Evaluates Val targets using val_data.edge_index_dict structure map 
            val_preds, _ = model(val_data.x_dict, val_data.edge_index_dict, val_edge_index, drug_sim_emb, disease_sim_emb)
            val_preds_prob = torch.sigmoid(val_preds).cpu().numpy()
            v_labels_np = val_labels.cpu().numpy()
            current_val_auc = roc_auc_score(v_labels_np, val_preds_prob)
            
        loss_list.append(total_loss.item())
        val_auc_list.append(current_val_auc)
        
        with open(log_file_path, mode='a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([epoch, total_loss.item(), task_loss.item(), contrast_loss.item(), current_val_auc])

        if epoch % 5 == 0 or epoch == config.epochs - 1:
            print(f"Epoch {epoch:03d} | Total Loss: {total_loss.item():.4f} | Task Loss: {task_loss.item():.4f} | "
                  f"CL Loss: {contrast_loss.item():.4f} | Val AUC: {current_val_auc:.4f}")
            
        if config.use_wandb:
            wandb.log({'loss': total_loss.item(), 'val_auc': current_val_auc, 'epoch': epoch})

        # Save Logic relies strictly on Validation Set 
        if current_val_auc > best_val_auc:
            best_val_auc = current_val_auc
            patience_counter = 0
            
            save_dict = {
                'state_dict': model.state_dict(),
                'config': vars(config)
            }
            torch.save(save_dict, os.path.join(config.root_dir, 'checkpoints', 'best_model.pth'))
        else:
            patience_counter += 1
            
        if patience_counter >= config.early_stopping_patience:
            print(f"Early stopping at epoch {epoch}")
            break

    print("\nTraining finished.")
    
    last_model_path = os.path.join(config.root_dir, 'checkpoints', 'last_model.pth')
    torch.save({'state_dict': model.state_dict(), 'config': vars(config)}, last_model_path)
    
    plt.figure()
    plt.plot(range(len(val_auc_list)), val_auc_list, label="Val AUC", color="blue", linewidth=2)
    plt.title(f"Validation AUC vs Epoch ({config.gnn_type})")
    plt.xlabel("Epoch")
    plt.ylabel("AUC Score")
    plt.legend()
    plt.grid(True)
    plt.savefig(os.path.join(config.root_dir, 'results', f'auc_curve_{model_type}.png'))
    plt.close()

    plt.figure()
    plt.plot(range(len(loss_list)), loss_list, label="Total Loss", color="red", linewidth=2)
    plt.title(f"Loss vs Epoch ({config.gnn_type})")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True)
    plt.savefig(os.path.join(config.root_dir, 'results', f'loss_curve_{model_type}.png'))
    plt.close()

    # --- Final Isolated Test Evaluation ---
    print("\nLoading Best Model Checkpoint for Final True Test Evaluation...")
    best_model_path = os.path.join(config.root_dir, 'checkpoints', 'best_model.pth')
    if os.path.exists(best_model_path):
        checkpoint = torch.load(best_model_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint['state_dict'])
        
    model.eval()
    test_edge_index = test_data[dd_edge_type].edge_label_index
    test_labels = test_data[dd_edge_type].edge_label

    with torch.no_grad():
        # PHASE 1: Standard 1:1 Classification Metrics (AUC, AUPR, F1, Precision, MCC)
        test_preds, _ = model(test_data.x_dict, test_data.edge_index_dict, test_edge_index, drug_sim_emb, disease_sim_emb)
        test_preds_prob = torch.sigmoid(test_preds).cpu().numpy()
        test_labels_np = test_labels.cpu().numpy()
        test_drug_ids_np = test_edge_index[0].cpu().numpy()

        test_metrics_standard = compute_metrics(test_labels_np, test_preds_prob, drug_ids=test_drug_ids_np)

        # PHASE 2: Dynamic 1:50 Ranking Evaluation for Recall@K (Memory Safe on 8GB RAM)
        print("\nConstructing Dynamic 1:50 Negative Pool for True Recall@K Ranking...")
        pos_test_edges = test_edge_index[:, test_labels == 1]
        num_pos_test = pos_test_edges.size(1)
        
        # Manually generate 50 negative edges for each test positive edge
        neg_ratio = 50
        neg_drug_coords = pos_test_edges[0].repeat_interleave(neg_ratio)
        neg_disease_coords = torch.randint(0, num_diseases, (num_pos_test * neg_ratio,), device=device)
        
        # Combine Positives and the massive 50x Negative pool
        ranking_edge_index = torch.cat([pos_test_edges, torch.stack([neg_drug_coords, neg_disease_coords])], dim=1)
        ranking_labels = torch.cat([torch.ones(num_pos_test), torch.zeros(num_pos_test * neg_ratio)]).to(device)

        ranking_preds, _ = model(test_data.x_dict, test_data.edge_index_dict, ranking_edge_index, drug_sim_emb, disease_sim_emb)
        ranking_preds_prob = torch.sigmoid(ranking_preds).cpu().numpy()
        ranking_labels_np = ranking_labels.cpu().numpy()
        ranking_drug_ids_np = ranking_edge_index[0].cpu().numpy()

        ranking_metrics = compute_metrics(ranking_labels_np, ranking_preds_prob, drug_ids=ranking_drug_ids_np)

    # Merge results: Keep standard metrics from 1:1, but swap in the honest Recall@K from 1:50
    final_test_metrics = test_metrics_standard.copy()
    final_test_metrics["Recall@10"] = ranking_metrics["Recall@10"]
    final_test_metrics["Recall@20"] = ranking_metrics["Recall@20"]
    final_test_metrics["Recall@50"] = ranking_metrics["Recall@50"]
    
    print("\n--- Best Epoch Metrics (Test Set) ---")
    for k, v in final_test_metrics.items():
        print(f"{k}: {v:.4f}")

if __name__ == '__main__':
    train()
