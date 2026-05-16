import torch
import torch.nn as nn
import torch.optim as optim
import wandb
import os
import csv
import json
import matplotlib.pyplot as plt
import time
import torch_geometric.transforms as T
from sklearn.metrics import roc_auc_score
import argparse

from config import config
from preprocess import preprocess
from models.full_model import DDAPredictor
from models.contrastive_loss import GraphContrastiveLearning
from utils.metrics import compute_metrics

PROGRESS_FILE = 'training_progress.json'

def generate_bpr_k_negative_edges_strict(pos_edge_index, num_nodes_drug, num_nodes_disease, K=5):
    """
    Sinh Negative Edges tỷ lệ 1:K cho BPR.
    - Cùng Drug (src)
    - KHÔNG BAO GIỜ rơi vào Positive Edges.
    - Sử dụng Dense Mask + Multinomial để sample O(1) chống while loop vô hạn.
    """
    device = pos_edge_index.device
    num_pos = pos_edge_index.size(1)
    
    # 1. Tạo ma trận Cấm (1 = Hợp lệ, 0 = Đã trùng Positive Edge gốc)
    # (Đồ họa Colab thừa sức gánh mask float bộ nhớ ~200MB cho node 1403x663)
    dense_mask = torch.ones((num_nodes_drug, num_nodes_disease), dtype=torch.float, device=device)
    dense_mask[pos_edge_index[0], pos_edge_index[1]] = 0.0 # Cấm bốc trúng Positive
    
    # 2. Rút trích weights xác suất cho từng hàng Drug (src) của pos_edges
    weights = dense_mask[pos_edge_index[0]] # shape: (num_pos, num_nodes_disease)
    
    # 3. Sample K con số ngẫu nhiên MỖI HÀNG không lặp lại
    neg_dst_matrix = torch.multinomial(weights, num_samples=K, replacement=False) # shape: (num_pos, K)
    neg_dst = neg_dst_matrix.flatten() # shape: (num_pos * K)
    
    # 4. Expand src để match shape 1:K
    neg_src = pos_edge_index[0].repeat_interleave(K) # shape: (num_pos * K)
    
    return torch.stack([neg_src, neg_dst], dim=0)

def bpr_loss_k_fn(pos_scores, neg_scores, K):
    """
    Bayesian Personalized Ranking Loss v2 (1:K Ratio).
    So khớp hiệu số giữa (1 Positive) với (K Negatives).
    """
    # Reshape neg_scores thành ma trận (num_pos, K)
    neg_matrix = neg_scores.view(-1, K)
    
    # Đẩy pos_scores từ (num_pos) -> (num_pos, 1) để broadcast trừ ma trận
    diff = pos_scores.unsqueeze(1) - neg_matrix
    
    # Lấy logarith Softplus + Normalize trung bình toàn bộ
    return -torch.mean(torch.nn.functional.logsigmoid(diff))

def create_directories():
    os.makedirs(os.path.join(config.root_dir, 'logs'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'checkpoints'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'results', 'models'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'results', 'metrics'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'results', 'tables'), exist_ok=True)
    os.makedirs(os.path.join(config.root_dir, 'results', 'configs'), exist_ok=True)

def initialize_progress():
    progress_path = os.path.join(config.root_dir, PROGRESS_FILE)
    if os.path.exists(progress_path):
        with open(progress_path, 'r') as f:
            return json.load(f)
    return {}

def save_progress(progress):
    progress_path = os.path.join(config.root_dir, PROGRESS_FILE)
    with open(progress_path, 'w') as f:
        json.dump(progress, f, indent=4)

def check_if_completed(progress, dataset_name, fold):
    ds_str = str(dataset_name)
    fold_str = str(fold)
    if ds_str in progress and fold_str in progress[ds_str]:
        return progress[ds_str][fold_str]['metrics']
    return None

def train_fold(dataset_name, fold, epochs, device):
    print(f"\n{'='*50}\nStarting Fold {fold}/10 for Dataset {dataset_name}\n{'='*50}")
    
    # Set dynamic config
    config.dataset_name = dataset_name
    config.epochs = epochs
    
    model_type = config.gnn_type.lower()
    log_file_path = os.path.join(config.root_dir, 'logs', f'train_log_{model_type}_{dataset_name}_fold{fold}.csv')
    
    with open(log_file_path, mode='w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['epoch', 'total_loss', 'task_loss', 'contrastive_loss', 'val_auc'])

    data, drug_sim_emb, disease_sim_emb = preprocess()
    
    # 1. Split Isolation with Random State per fold
    torch.manual_seed(fold)
    
    # Sinh split mới nhất thời. Không lưu .pt file vào Drive để triệt để giới hạn tràn dung lượng!
    print("Generating Deterministic RandomLinkSplits to prevent Data Leakage...")
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
    
    train_data = train_data.to(device)
    val_data = val_data.to(device)
    test_data = test_data.to(device)
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

    val_edge_index = val_data[dd_edge_type].edge_label_index
    val_labels = val_data[dd_edge_type].edge_label

    best_val_auc = 0.0
    patience_counter = 0
    nan_counter = 0

    loss_list = []
    val_auc_list = []

    print(f"Training on {device}...")
    
    # File checkpoint tạm thời cho fold này
    fold_checkpoint_name = f'temp_model_{dataset_name}_fold{fold}.pth'
    fold_checkpoint_path = os.path.join(config.root_dir, 'checkpoints', fold_checkpoint_name)
    
    for epoch in range(config.epochs):
        model.train()
        optimizer.zero_grad()
        
        K_NEG = 5 # Tỷ lệ 1:5 cho BPR
        neg_edge_index = generate_bpr_k_negative_edges_strict(pos_edge_index, num_drugs, num_diseases, K=K_NEG).to(device)
        train_edge_index = torch.cat([pos_edge_index, neg_edge_index], dim=1)
        
        num_pos = pos_edge_index.size(1)
        num_neg = neg_edge_index.size(1) # Bằng num_pos * K_NEG
        labels = torch.cat([torch.ones(num_pos), torch.zeros(num_neg)]).to(device)
        
        preds, node_embs = model(train_data.x_dict, train_data.edge_index_dict, train_edge_index, drug_sim_emb, disease_sim_emb)
        
        # 1. Tính BCE Loss (Classification)
        task_loss_bce = bce_loss_fn(preds, labels)
        
        # 2. Tính BPR Loss Tỷ lệ 1:K (Ranking Enforcer)
        pos_preds = preds[:num_pos]
        neg_preds = preds[num_pos:]
        loss_bpr = bpr_loss_k_fn(pos_preds, neg_preds, K_NEG)
        
        # 3. Chuẩn hóa Loss
        lambda_bpr = 0.1 # Đề xuất λ = 0.1 để Model vừa học được liên kết tuyệt đối, vừa xếp rank mạnh
        task_loss = task_loss_bce + (lambda_bpr * loss_bpr)
        
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
        
        model.eval()
        with torch.no_grad():
            val_preds, _ = model(val_data.x_dict, val_data.edge_index_dict, val_edge_index, drug_sim_emb, disease_sim_emb)
            val_preds_prob = torch.sigmoid(val_preds).cpu().numpy()
            v_labels_np = val_labels.cpu().numpy()
            current_val_auc = roc_auc_score(v_labels_np, val_preds_prob)
            
        loss_list.append(total_loss.item())
        val_auc_list.append(current_val_auc)
        
        with open(log_file_path, mode='a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([epoch, total_loss.item(), task_loss.item(), task_loss_bce.item(), loss_bpr.item(), contrast_loss.item(), current_val_auc])

        if epoch % 50 == 0 or epoch == config.epochs - 1:
            print(f"Fold {fold} | Epoch {epoch:03d} | Total: {total_loss.item():.4f} | BCE: {task_loss_bce.item():.4f} | BPR: {loss_bpr.item():.4f} | Val AUC: {current_val_auc:.4f}")

        if current_val_auc > best_val_auc:
            best_val_auc = current_val_auc
            patience_counter = 0
            
            save_dict = {
                'state_dict': model.state_dict(),
                'config': vars(config),
                'val_auc': best_val_auc
            }
            # Lưu Model Tạm 
            torch.save(save_dict, fold_checkpoint_path)
        else:
            patience_counter += 1
            
        if patience_counter >= config.early_stopping_patience:
            print(f"Early stopping at epoch {epoch}")
            break
            
    print("\nEvaluating Best Model on Test Set...")
    if os.path.exists(fold_checkpoint_path):
        checkpoint = torch.load(fold_checkpoint_path, map_location=device, weights_only=False)
        model.load_state_dict(checkpoint['state_dict'])
        
    model.eval()
    test_edge_index = test_data[dd_edge_type].edge_label_index
    test_labels = test_data[dd_edge_type].edge_label

    with torch.no_grad():
        test_preds, _ = model(test_data.x_dict, test_data.edge_index_dict, test_edge_index, drug_sim_emb, disease_sim_emb)
        test_preds_prob = torch.sigmoid(test_preds).cpu().numpy()
        test_labels_np = test_labels.cpu().numpy()
        test_drug_ids_np = test_edge_index[0].cpu().numpy()

        test_metrics_standard = compute_metrics(test_labels_np, test_preds_prob, drug_ids=test_drug_ids_np)

        pos_test_edges = test_edge_index[:, test_labels == 1]
        num_pos_test = pos_test_edges.size(1)
        neg_ratio = 50
        neg_drug_coords = pos_test_edges[0].repeat_interleave(neg_ratio)
        neg_disease_coords = torch.randint(0, num_diseases, (num_pos_test * neg_ratio,), device=device)
        
        ranking_edge_index = torch.cat([pos_test_edges, torch.stack([neg_drug_coords, neg_disease_coords])], dim=1)
        ranking_labels = torch.cat([torch.ones(num_pos_test), torch.zeros(num_pos_test * neg_ratio)]).to(device)

        ranking_preds, _ = model(test_data.x_dict, test_data.edge_index_dict, ranking_edge_index, drug_sim_emb, disease_sim_emb)
        ranking_preds_prob = torch.sigmoid(ranking_preds).cpu().numpy()
        ranking_labels_np = ranking_labels.cpu().numpy()
        ranking_drug_ids_np = ranking_edge_index[0].cpu().numpy()

        ranking_metrics = compute_metrics(ranking_labels_np, ranking_preds_prob, drug_ids=ranking_drug_ids_np)

    final_test_metrics = test_metrics_standard.copy()
    final_test_metrics["Recall@10"] = ranking_metrics["Recall@10"]
    final_test_metrics["Recall@20"] = ranking_metrics["Recall@20"]
    final_test_metrics["Recall@50"] = ranking_metrics["Recall@50"]
    
    print(f"\n--- Best Fold {fold} Metrics ({dataset_name}) ---")
    for k, v in final_test_metrics.items():
        print(f"{k}: {v:.4f}")
        
    return final_test_metrics, best_val_auc, fold_checkpoint_path

def main():
    parser = argparse.ArgumentParser(description='Train DDA on Multiple Datasets & Folds on GPU')
    parser.add_argument('--datasets', type=str, nargs='+', default=['B-dataset', 'C-dataset', 'F-dataset'], help='Datasets to train on')
    parser.add_argument('--epochs', type=int, default=1000, help='Max epochs per fold')
    parser.add_argument('--folds', type=int, default=10, help='Number of folds')
    args = parser.parse_args()

    create_directories()
    progress = initialize_progress()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Hardware initialization! Device: {device}")
    
    overall_results = []
    
    for ds in args.datasets:
        print(f"\n{'*'*55}")
        print(f"*** BEGIN K-FOLD TRAINING FOR DATASET: {ds} ***")
        print(f"{'*'*55}\n")
        
        if str(ds) not in progress:
            progress[str(ds)] = {}
            
        fold_metrics = []
        best_dataset_val_auc = 0.0
        
        for fold in range(1, args.folds + 1):
            fold_str = str(fold)
            
            # --- CƠ CHẾ RESUME ---
            # ÉP MODEL KHÔNG ĐƯỢC CHỚP MẮT SKIP BẰNG CÁCH GÁN BẰNG None!
            completed_metrics = None # check_if_completed(progress, ds, fold)
            if completed_metrics is not None:
                print(f"-> [RESUME] Fold {fold} cho {ds} ĐÃ HOÀN THÀNH TRƯỚC ĐÓ. Skip training! Tự động nạp metrics lịch sử.")
                fold_metrics.append(completed_metrics)
                continue
            
            metrics, fold_best_val_auc, fold_checkpoint_path = train_fold(ds, fold, args.epochs, device)
            fold_metrics.append(metrics)
            
            # --- CƠ CHẾ TIẾT KIỆM DUNG LƯỢNG DRIVE TỐI ĐA ---
            dataset_best_model_path = os.path.join(config.root_dir, 'checkpoints', f'BEST_overall_{ds}.pth')
            if fold_best_val_auc > best_dataset_val_auc:
                print(f"-> Fold {fold} tạo đỉnh Validation AUC tuyệt đối ({fold_best_val_auc:.4f}) cho {ds}. Lưu File Model Chuẩn.")
                best_dataset_val_auc = fold_best_val_auc
                if os.path.exists(fold_checkpoint_path):
                    # Ghi đè file tốt nhất
                    os.replace(fold_checkpoint_path, dataset_best_model_path)
            else:
                # Xóa ngay lập tức file temp của fold này để chống tràn bộ nhớ
                if os.path.exists(fold_checkpoint_path):
                    os.remove(fold_checkpoint_path)
                    print(f"-> Đã xóa Temp Model của Fold {fold} nhằm tiết kiệm bộ nhớ.")
                    
            # Auto-save file log progress sau mỗi fold để Resume an toàn!
            progress[ds][fold_str] = {
                'metrics': metrics,
                'val_auc': float(fold_best_val_auc)
            }
            save_progress(progress)
            print(f"-> [SAVED] Dữ liệu Fold {fold} ({ds}) đã được sao lưu. Colab ngắt cũng không sao!")

        # Tính trung bình toàn bộ cho Dataset
        avg_metrics = {}
        for metric_name in fold_metrics[0].keys():
            avg_metrics[metric_name] = sum(fm[metric_name] for fm in fold_metrics) / args.folds
        
        print(f"\n--- TỔNG KẾT AVERAGE {args.folds}-FOLD CHO {ds} ---")
        for k, v in avg_metrics.items():
            print(f"{k}: {v:.4f}")
            
        overall_results.append((ds, avg_metrics))
        
        # In ngay kết quả
        agg_path = os.path.join(config.root_dir, 'results', 'tables', f'colab_Kfold_results_{ds}.csv')
        with open(agg_path, mode='w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Metric', f'Average of {args.folds} Folds'])
            for k, v in avg_metrics.items():
                writer.writerow([k, f"{v:.4f}"])

    print("\nDONE! Quá trình Train Pipeline ngắt nghỉ thông minh trên Google Colab đã kết thúc.")

if __name__ == '__main__':
    main()
