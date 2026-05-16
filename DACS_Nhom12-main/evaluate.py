import torch
import numpy as np
import os

from config import config
from preprocess import preprocess
from models.full_model import DDAPredictor
from utils.metrics import compute_metrics
from train import generate_negative_edges

def evaluate():
    device = torch.device(config.device if torch.cuda.is_available() else 'cpu')
    
    data = preprocess().to(device)
    in_channels_dict = {node_type: data[node_type].x.shape[1] for node_type in data.node_types}
    
    model = DDAPredictor(in_channels_dict, config).to(device)
    ckpt_path = os.path.join(config.root_dir, 'checkpoints', 'best_model.pth')
    if os.path.exists(ckpt_path):
        model.load_state_dict(torch.load(ckpt_path, map_location=device, weights_only=True))
        print(f"Loaded trained model from {ckpt_path}")
    else:
        print("Warning: No pre-trained model found. Initializing randomly.")
        
    model.eval()
    
    dd_edge_type = ('drug', 'treats', 'disease')
    pos_edge_index = data[dd_edge_type].edge_index
    num_drugs = data['drug'].x.size(0)
    num_diseases = data['disease'].x.size(0)
    
    neg_edge_index = generate_negative_edges(pos_edge_index, num_drugs, num_diseases).to(device)
    test_edge_index = torch.cat([pos_edge_index, neg_edge_index], dim=1)
    labels = torch.cat([torch.ones(pos_edge_index.size(1)), torch.zeros(neg_edge_index.size(1))]).to(device)
    
    with torch.no_grad():
        preds, node_embs = model(data.x_dict, data.edge_index_dict, test_edge_index)
        
    preds_np = preds.cpu().numpy()
    labels_np = labels.cpu().numpy()
    
    metrics = compute_metrics(labels_np, preds_np)
    
    print("\nEvaluation Results:")
    print("-" * 30)
    print(f"{'Metric':<15} | {'Score':<10}")
    print("-" * 30)
    for k, v in metrics.items():
        print(f"{k:<15} | {v:.4f}")
    print("-" * 30)
    
if __name__ == '__main__':
    evaluate()
