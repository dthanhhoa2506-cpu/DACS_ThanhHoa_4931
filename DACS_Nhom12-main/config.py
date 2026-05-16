import os
import secrets

class Config:
    def __init__(self):
        # Paths
        self.root_dir = os.path.dirname(os.path.abspath(__file__))
        self.data_dir = os.path.join(self.root_dir, 'data')
        self.raw_dir = os.path.join(self.data_dir, 'raw')
        self.processed_dir = os.path.join(self.data_dir, 'processed')
        
        # Dataset
        self.dataset_name = 'F-dataset'
        
        # ── JWT / Auth Config ─────────────────────────────────────────────────
        # Secret key: use env var JWT_SECRET if set, else generate a stable one
        # In production, ALWAYS set JWT_SECRET as an environment variable!
        self.jwt_secret = os.environ.get(
            "JWT_SECRET",
            "amntdda-dev-secret-2026-do-not-use-in-prod"
        )
        self.jwt_algorithm = "HS256"
        self.jwt_expire_minutes = 60 * 24  # 24 hours

        
        # Model Hyperparameters
        self.gnn_type = 'SAGE'  # Options: 'SAGE', 'GAT'
        self.hidden_dim = 64   # Memory-efficient dimension size
        self.out_dim = 64
        self.num_layers = 2
        self.heads = 1         # Dropped for speed if anyone falls back to GAT
        self.dropout = 0.3     # Adjusted to prevent underfitting on small graph
        
        # Contrastive Learning (Weighted heavily down)
        self.contrast_weight = 0.05 
        self.temperature = 0.2  
        self.edge_drop_prob = 0.1
        self.feat_mask_prob = 0.1
        
        # Training
        self.epochs = 1000 
        self.learning_rate = 0.005 # GCNs on small graphs converge better with slightly higher LR
        self.weight_decay = 5e-4
        self.batch_size = 512
        self.early_stopping_patience = 50
        
        # LR Scheduler 
        self.lr_patience = 20
        self.lr_factor = 0.5
        
        self.device = 'cpu'
        
        # Negative Sampling
        self.neg_sample_ratio = 1.0
        
        # Logging
        self.use_wandb = False
        self.wandb_project = 'dda-attention-gcl'

config = Config()
