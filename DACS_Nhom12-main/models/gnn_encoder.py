import torch
import torch.nn as nn
from torch_geometric.nn import GATConv, SAGEConv, HeteroConv

class GNNEncoder(nn.Module):
    def __init__(self, in_channels_dict, hidden_dim, out_dim, gnn_type='SAGE', num_layers=2, heads=2, dropout=0.3):
        super().__init__()
        self.gnn_type = gnn_type
        self.num_layers = num_layers
        self.dropout = dropout
        
        self.convs = nn.ModuleList()
        self.norms = nn.ModuleList()
        
        for i in range(num_layers):
            current_out_dim = out_dim if i == num_layers - 1 else hidden_dim
            
            conv_dict = {}
            edge_types = [
                ('drug', 'treats', 'disease'),
                ('drug', 'interacts_with', 'gene'),
                ('disease', 'associated_with', 'gene'),
                ('disease', 'treated_by', 'drug'),
                ('gene', 'interacted_by', 'drug'),
                ('gene', 'associated_to', 'disease')
            ]
            
            for edge_type in edge_types:
                if gnn_type == 'GAT':
                    conv_dict[edge_type] = GATConv((-1, -1), current_out_dim // heads, heads=heads, dropout=dropout, add_self_loops=False)
                elif gnn_type == 'SAGE':
                    # SAGEConv supports bipartite message passing out-of-the-box (meaning tuple inputs like (x_src, x_dst))
                    conv_dict[edge_type] = SAGEConv((-1, -1), current_out_dim)
                else:
                    raise ValueError(f"Unsupported gnn_type: {gnn_type}")
            
            self.convs.append(HeteroConv(conv_dict, aggr='sum'))
            
            # Layer norm is crucial for stabilizing heterogenous CPU training
            self.norms.append(nn.LayerNorm(current_out_dim))

    def forward(self, x_dict, edge_index_dict):
        for i, (conv, norm) in enumerate(zip(self.convs, self.norms)):
            x_dict = conv(x_dict, edge_index_dict)
            
            for key in x_dict.keys():
                x_dict[key] = norm(x_dict[key])
                if i != self.num_layers - 1:
                    x_dict[key] = torch.nn.functional.relu(x_dict[key])
                    x_dict[key] = torch.nn.functional.dropout(x_dict[key], p=self.dropout, training=self.training)
        return x_dict
