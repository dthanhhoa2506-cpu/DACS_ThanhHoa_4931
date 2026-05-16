# Drug–Disease Association Prediction using Attention Fusion and Graph Contrastive Learning

This project implements a state-of-the-art heterogeneous graph neural network pipeline for predicting associations between drugs and diseases. It incorporates an Attention Fusion module and Graph Contrastive Learning (InfoNCE) to learn highly robust, discriminative node representations.

## Key Features
- **Heterogeneous Graph:** Models complex relationships across Drugs, Diseases, and Genes.
- **Configurable GNN Encoder:** Easily switch between GAT and GCN in `config.py`.
- **Attention Fusion:** Fuses core structural embeddings with side/similarity information via Cross Attention.
- **Graph Contrastive Learning:** Uses node feature masking and edge dropping to generate augmented views, aligning them with an InfoNCE loss.
- **Auto Data Download:** Contains automated scripts to fetch diverse datasets.

## Environment Setup

Run these exact commands to construct the fully supportive environment:

```bash
conda create -n dda-gcl python=3.10
conda activate dda-gcl

pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

pip install torch-geometric
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv -f https://data.pyg.org/whl/torch-2.4.0+cu121.html

pip install rdkit pandas numpy scikit-learn tqdm networkx matplotlib seaborn wandb gdown
```

## Instructions

1. **Download Data:**
   ```bash
   python download_datasets.py
   ```
   *(If the Google Drive link fails, please follow the prompts to download manually and place them in `data/raw/F-dataset/`)*

2. **Preprocess Graph:**
   ```bash
   python preprocess.py
   ```
   *This outputs `data/processed/F-dataset_graph.pt`.*

3. **Train the Model:**
   ```bash
   python train.py
   ```

4. **Evaluate Model:**
   ```bash
   python evaluate.py
   ```

5. **Visualize Latent Space:**
   ```bash
   python visualize_tsne.py
   ```
