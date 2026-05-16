import torch
import torch.nn as nn
from models.gnn_encoder import GNNEncoder
from models.attention_fusion import AttentionFusion
from models.prediction_layer import LinkPredictor

class DDAPredictor(nn.Module):
    def __init__(self, in_channels_dict, num_drugs, num_diseases, config):
        super().__init__()
        self.encoder = GNNEncoder(
            in_channels_dict=in_channels_dict,
            hidden_dim=config.hidden_dim,
            out_dim=config.out_dim,
            gnn_type=config.gnn_type,
            num_layers=config.num_layers,
            heads=config.heads,
            dropout=config.dropout
        )
        
        # Add projection layers to map raw NxN similarity matrices into the same hidden_dim
        self.drug_sim_proj = nn.Linear(num_drugs, config.hidden_dim)
        self.disease_sim_proj = nn.Linear(num_diseases, config.hidden_dim)
        
        self.drug_fusion = AttentionFusion(embed_dim=config.out_dim, num_heads=config.heads)
        self.disease_fusion = AttentionFusion(embed_dim=config.out_dim, num_heads=config.heads)
        
        self.predictor = LinkPredictor(hidden_dim=config.out_dim)

    def forward(self, x_dict, edge_index_dict, target_edge_index, drug_sim_emb=None, disease_sim_emb=None):
        node_embeddings = self.encoder(x_dict, edge_index_dict)
        
        # Project raw similarity embeddings to match GNN structural dimensions
        if drug_sim_emb is not None:
            drug_sim_emb = torch.relu(self.drug_sim_proj(drug_sim_emb))
            
        if disease_sim_emb is not None:
            disease_sim_emb = torch.relu(self.disease_sim_proj(disease_sim_emb))
            
        fused_drug_emb = self.drug_fusion(node_embeddings['drug'], drug_sim_emb)
        fused_disease_emb = self.disease_fusion(node_embeddings['disease'], disease_sim_emb)
        
        node_embeddings['drug'] = fused_drug_emb
        node_embeddings['disease'] = fused_disease_emb
        
        out = self.predictor(fused_drug_emb, fused_disease_emb, target_edge_index)
        
        return out, node_embeddings
