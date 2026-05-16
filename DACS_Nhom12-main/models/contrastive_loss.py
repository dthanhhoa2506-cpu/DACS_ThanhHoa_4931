import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.utils import dropout_edge

class GraphContrastiveLearning(nn.Module):
    """
    Graph Contrastive Learning (GCL) via heavily optimized InfoNCE.
    """
    def __init__(self, temperature=0.2):
        super().__init__()
        self.temperature = temperature

    def info_nce_loss(self, z1, z2, num_negatives=1000):
        # Always normalize explicit embeddings to guarantee boundaries
        z1 = F.normalize(z1, p=2, dim=1)
        z2 = F.normalize(z2, p=2, dim=1)
        
        N = z1.size(0)
        
        # Optimization: CPU Matrix scaling (N*N dot) is OOM/TTP fatal.
        # Random Negative Sampling caps complexity!
        if N > num_negatives:
            # We sample negative pairs dynamically to compute denominator
            idx = torch.randperm(N)[:num_negatives].to(z1.device)
            z2_sampled = z2[idx]
            sim_matrix = torch.mm(z1, z2_sampled.t()) / self.temperature
        else:
            sim_matrix = torch.mm(z1, z2.t()) / self.temperature
            
        # Positive pairs (diagonal elements natively mapping similarity)
        pos_sim = torch.sum(z1 * z2, dim=-1) / self.temperature
        
        # Critical Stability Fix: logsumexp natively abstracts the heavy divisions and 
        # exp arithmetic mitigating Float32 NaN/Inf cascades.
        lse = torch.logsumexp(sim_matrix, dim=1)
        
        # Loss follows generic -log(exp(pos) / sum(exp(neg))) -> -(pos - logsumexp(sim))
        loss = -(pos_sim - lse).mean()
        
        if torch.isnan(loss) or torch.isinf(loss):
            return torch.tensor(0.0, device=z1.device, requires_grad=True)
            
        return loss

    def augment_graph(self, x_dict, edge_index_dict, edge_drop_prob=0.1, feat_mask_prob=0.1):
        x_dict_aug = {}
        for key, x in x_dict.items():
            mask = torch.rand(x.size()) > feat_mask_prob
            x_dict_aug[key] = x * mask.to(x.device)
            
        edge_index_dict_aug = {}
        for key, edge_index in edge_index_dict.items():
            edge_index_aug, _ = dropout_edge(edge_index, p=edge_drop_prob, training=True)
            edge_index_dict_aug[key] = edge_index_aug
            
        return x_dict_aug, edge_index_dict_aug
