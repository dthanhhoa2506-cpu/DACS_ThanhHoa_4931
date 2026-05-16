import torch
import torch.nn as nn
import torch.nn.functional as F

class AttentionFusion(nn.Module):
    """
    Lightweight Attention Fusion Module.
    Uses a stable gating mechanism instead of complex MultiheadAttention scaling sequence formats,
    to save CPU constraints and prevent convergence variance.
    """
    def __init__(self, embed_dim, num_heads=1):
        super().__init__()
        self.embed_dim = embed_dim
        # Lightweight CPU-friendly gate
        self.gate = nn.Linear(embed_dim * 2, embed_dim)
        self.layer_norm = nn.LayerNorm(embed_dim)

    def forward(self, struct_emb, sim_emb=None):
        if sim_emb is None:
            return self.layer_norm(struct_emb)
            
        # Concatenate and learn an attention weight vector (gate) -> alpha
        concat_emb = torch.cat([struct_emb, sim_emb], dim=-1)
        alpha = torch.sigmoid(self.gate(concat_emb))
        
        # Soft attention mixing between Structure and External logic
        fused = alpha * struct_emb + (1 - alpha) * sim_emb
        
        # Residual Connection bounded by Normalization natively fixes exploding values
        out = self.layer_norm(struct_emb + fused) 
        
        return out
