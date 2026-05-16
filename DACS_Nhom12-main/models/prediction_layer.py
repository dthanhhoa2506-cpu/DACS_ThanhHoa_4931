import torch
import torch.nn as nn

class LinkPredictor(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, 1)
        )

    def forward(self, drug_emb, disease_emb, edge_index):
        src_indices = edge_index[0]
        dst_indices = edge_index[1]
        
        x_drug = drug_emb[src_indices]
        x_disease = disease_emb[dst_indices]
        
        x_concat = torch.cat([x_drug, x_disease], dim=1)
        logits = self.mlp(x_concat)
        
        # Return logits for BCEWithLogitsLoss
        return logits.squeeze()
