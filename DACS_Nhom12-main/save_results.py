import torch
import os
import json

from config import Config
from preprocess import preprocess
from models.full_model import DDAPredictor
from utils.metrics import compute_metrics

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Load the globally saved highest Val-AUC checkpoint
    model_path = os.path.join(root_dir, 'checkpoints', 'best_model.pth')
    print(f"Loading strictly separated best model evaluation...")
    checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
    
    # 2. Replicate state Config cleanly
    config = Config()
    saved_config_dict = checkpoint['config']
    for k, v in saved_config_dict.items():
        setattr(config, k, v)
        
    device = torch.device('cpu')
    _, drug_sim_emb, disease_sim_emb = preprocess()
    drug_sim_emb = drug_sim_emb.to(device)
    disease_sim_emb = disease_sim_emb.to(device)

    # 3. Explicitly pull strictly isolated TEST data splits
    split_path = os.path.join(config.processed_dir, f'{config.dataset_name}_splits.pt')
    if not os.path.exists(split_path):
        raise FileNotFoundError("Split configurations missing! You must run train.py first to establish the disjoint RandomLinkSplit boundaries.")
        
    _, _, test_data = torch.load(split_path, map_location=device, weights_only=False)

    in_channels_dict = {node_type: test_data[node_type].x.shape[1] for node_type in test_data.node_types}
    num_drugs = test_data['drug'].x.size(0)
    num_diseases = test_data['disease'].x.size(0)
    
    model = DDAPredictor(in_channels_dict, num_drugs, num_diseases, config).to(device)
    model.load_state_dict(checkpoint['state_dict'])
    model.eval()
    print(f"Model ({config.gnn_type}) restored securely.")
    
    # 4. Use strict untouched target arrays. test_data.edge_index_dict explicitly has test edge_labels removed to prevent leakage!
    dd_edge_type = ('drug', 'treats', 'disease')
    test_edge_index = test_data[dd_edge_type].edge_label_index
    labels = test_data[dd_edge_type].edge_label
    
    print("Evaluating Strict Unseen Test Metrics...")
    with torch.no_grad():
        preds, node_embs = model(test_data.x_dict, test_data.edge_index_dict, test_edge_index, drug_sim_emb, disease_sim_emb)
        
    preds_prob = torch.sigmoid(preds).cpu().numpy()
    labels_np = labels.cpu().numpy()
    drug_ids_np = test_edge_index[0].cpu().numpy()
    
    # Run the comprehensive metrics natively localized
    metrics = compute_metrics(labels_np, preds_prob, drug_ids=drug_ids_np)
    
    # 5. Output rendering formats
    metrics_path = os.path.join(root_dir, 'results', 'metrics', f'metrics_{config.gnn_type.lower()}.json')
    
    def convert_to_serializable(obj):
        import numpy as np
        if isinstance(obj, (np.float32, np.float64, np.float16)):
            return float(obj)
        elif isinstance(obj, (np.int32, np.int64, np.int16, np.int8)):
            return int(obj)
        elif isinstance(obj, dict):
            return {k: convert_to_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_to_serializable(item) for item in obj]
        else:
            return obj

    with open(metrics_path, 'w', encoding='utf-8') as f:
        serializable_metrics = convert_to_serializable(metrics)
        json.dump(serializable_metrics, f, indent=4)
        
    md_content = f"## Evaluation Results: Model `{config.gnn_type}`\n\n"
    md_content += f"**Model Checkpoint:** `{os.path.basename(model_path)}`  \n"
    md_content += f"**Evaluation Protocol:** Strict RandomLinkSplit (10% totally unseen positive/negative edges via PyG)\n\n"
    md_content += "### General Prediction Metrics\n\n"
    md_content += "| Metric | Score |\n"
    md_content += "| :--- | :--- |\n"
    
    general_metrics = ["AUC", "AUPR", "Accuracy", "Precision", "Recall", "F1-score", "MCC"]
    for m in general_metrics:
        if m in serializable_metrics:
            md_content += f"| **{m}** | {serializable_metrics[m]:.4f} |\n"
            
    md_content += "\n### Retrieval Metrics (Group Recall@K)\n\n"
    md_content += "| Metric | Score |\n"
    md_content += "| :--- | :--- |\n"
    recall_metrics = ["Recall@10", "Recall@20", "Recall@50"]
    for m in recall_metrics:
        if m in serializable_metrics:
            md_content += f"| **{m}** | {serializable_metrics[m]:.4f} |\n"
        
    md_path = os.path.join(root_dir, 'results', 'tables', f'evaluation_table_{config.gnn_type.lower()}.md')
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
        
    config_path = os.path.join(root_dir, 'results', 'configs', f'config_{config.gnn_type.lower()}.json')
    with open(config_path, 'w') as f:
        json.dump(convert_to_serializable(saved_config_dict), f, indent=4)
        
    print(f"\n--- Output Logs ---")
    print(f"Metrics JSON saved to: {metrics_path}")
    print(f"Markdown Table saved to: {md_path}")
    print(f"Config blueprint saved to: {config_path}")

if __name__ == '__main__':
    main()
