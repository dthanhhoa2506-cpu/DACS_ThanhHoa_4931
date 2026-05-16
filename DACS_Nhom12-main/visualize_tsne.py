import torch
import matplotlib.pyplot as plt
from sklearn.manifold import TSNE
import seaborn as sns
import numpy as np
import os

from config import config
from preprocess import preprocess
from models.full_model import DDAPredictor

def visualize():
    device = torch.device('cpu') 
    
    data = preprocess().to(device)
    in_channels_dict = {node_type: data[node_type].x.shape[1] for node_type in data.node_types}
    
    model = DDAPredictor(in_channels_dict, config).to(device)
    ckpt_path = os.path.join(config.root_dir, 'checkpoints', 'best_model.pth')
    if os.path.exists(ckpt_path):
        model.load_state_dict(torch.load(ckpt_path, map_location=device, weights_only=True))
        
    model.eval()
    with torch.no_grad():
        dummy_edge = torch.zeros((2,1), dtype=torch.long).to(device)
        _, node_embs = model(data.x_dict, data.edge_index_dict, dummy_edge)
        
    drug_embs = node_embs['drug'].cpu().numpy()
    disease_embs = node_embs['disease'].cpu().numpy()
    
    all_embs = np.vstack([drug_embs, disease_embs])
    labels = ['Drug'] * len(drug_embs) + ['Disease'] * len(disease_embs)
    
    print("Running t-SNE... this may take a moment.")
    tsne = TSNE(n_components=2, random_state=42, perplexity=10)
    embs_2d = tsne.fit_transform(all_embs)
    
    plt.figure(figsize=(10, 8))
    sns.scatterplot(x=embs_2d[:, 0], y=embs_2d[:, 1], hue=labels, palette='Set2')
    plt.title('t-SNE Visualization of Drug and Disease Embeddings')
    
    out_dir = os.path.join(config.root_dir, 'outputs')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'tsne_visualization.png')
    plt.savefig(out_path)
    print(f"Plot saved to {out_path}")

if __name__ == '__main__':
    visualize()
