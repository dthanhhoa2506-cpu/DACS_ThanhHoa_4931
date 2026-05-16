import os
import torch
import pandas as pd
import numpy as np
from torch_geometric.data import HeteroData
from config import config

def load_real_data(interaction_csv, drug_sim_csv, disease_sim_csv):
    """
    Loads real interactions and similarity matrices using pandas.
    Creates an ID mapping system from raw string IDs to contiguous integers.
    Builds the corresponding PyG HeteroData object.
    
    Returns:
        data (HeteroData): PyG data object containing edge indices.
        drug_sim_matrix (Tensor): PyTorch tensor of drug similarities.
        disease_sim_matrix (Tensor): PyTorch tensor of disease similarities.
    """
    print(f"Loading real data from {os.path.dirname(interaction_csv)}...")
    
    # 1. Load the matrices (assuming NxN structural frame with row/col IDs)
    drug_sim_df = pd.read_csv(drug_sim_csv, index_col=0)
    disease_sim_df = pd.read_csv(disease_sim_csv, index_col=0)
    
    # Load interactions
    inter_df = pd.read_csv(interaction_csv)
    
    # 2. Extract IDs and create mapping dictionaries (String -> Int)
    raw_drugs = drug_sim_df.index.astype(str).tolist()
    raw_diseases = disease_sim_df.index.astype(str).tolist()
    
    drug2id = {drug_id: i for i, drug_id in enumerate(raw_drugs)}
    disease2id = {disease_id: i for i, disease_id in enumerate(raw_diseases)}
    
    num_drugs = len(drug2id)
    num_diseases = len(disease2id)
    
    print(f"Mapped {num_drugs} drugs and {num_diseases} diseases.")

    # 3. Process edges using ID mappings
    col_drug = inter_df.columns[0]
    col_disease = inter_df.columns[1]
    
    src_list, dst_list = [], []
    missing_edges = 0
    
    for _, row in inter_df.iterrows():
        d_id = str(row[col_drug])
        dis_id = str(row[col_disease])
        
        if d_id in drug2id and dis_id in disease2id:
            src_list.append(drug2id[d_id])
            dst_list.append(disease2id[dis_id])
        else:
            missing_edges += 1
            
    if missing_edges > 0:
        print(f"Warning: {missing_edges} edges skipped due to missing isolated IDs in similarity matrices.")
            
    edge_index_dd = torch.tensor([src_list, dst_list], dtype=torch.long)
    
    # 4. Construct HeteroData Object
    data = HeteroData()
    
    # Node features: Initialized as random projections matching the config hidden dim.
    # The Attention layer will fuse these structurally learned weights with similarity later.
    data['drug'].x = torch.randn(num_drugs, config.hidden_dim)
    data['disease'].x = torch.randn(num_diseases, config.hidden_dim)
    
    # Standard edges + Reverse paths for HeteroConv message passing
    data['drug', 'treats', 'disease'].edge_index = edge_index_dd
    data['disease', 'treated_by', 'drug'].edge_index = edge_index_dd.flip([0])
    
    # Ensure genes exist in the schema so GNNEncoder loops do not fail dynamically.
    # Empty representation initialized as gene data is not loaded.
    data['gene'].x = torch.randn(1, config.hidden_dim)
    data['drug', 'interacts_with', 'gene'].edge_index = torch.empty((2, 0), dtype=torch.long)
    data['disease', 'associated_with', 'gene'].edge_index = torch.empty((2, 0), dtype=torch.long)
    data['gene', 'interacted_by', 'drug'].edge_index = torch.empty((2, 0), dtype=torch.long)
    data['gene', 'associated_to', 'disease'].edge_index = torch.empty((2, 0), dtype=torch.long)
    
    # 5. Extract Similarity Tensors for Fusion
    drug_sim_matrix = torch.tensor(drug_sim_df.values, dtype=torch.float32)
    disease_sim_matrix = torch.tensor(disease_sim_df.values, dtype=torch.float32)
    
    return data, drug_sim_matrix, disease_sim_matrix

def preprocess():
    os.makedirs(config.processed_dir, exist_ok=True)
    
    graph_path = os.path.join(config.processed_dir, f'{config.dataset_name}_graph.pt')
    drug_sim_path = os.path.join(config.processed_dir, f'{config.dataset_name}_drug_sim.pt')
    disease_sim_path = os.path.join(config.processed_dir, f'{config.dataset_name}_disease_sim.pt')
    
    if os.path.exists(graph_path) and os.path.exists(drug_sim_path) and os.path.exists(disease_sim_path):
        print("Loading preprocessed graph and similarity tensors from disk...")
        data = torch.load(graph_path, weights_only=False)
        drug_sim = torch.load(drug_sim_path, weights_only=False)
        disease_sim = torch.load(disease_sim_path, weights_only=False)
        return data, drug_sim, disease_sim
        
    print("Preprocessing real dataset structures...")
    
    dataset_dir = os.path.join(config.raw_dir, config.dataset_name)
    interaction_csv = os.path.join(dataset_dir, 'DrugDiseaseAssociationNumber.csv')
    drug_sim_csv = os.path.join(dataset_dir, 'DrugGIP.csv')
    disease_sim_csv = os.path.join(dataset_dir, 'DiseaseGIP.csv')
    
    if not (os.path.exists(interaction_csv) and os.path.exists(drug_sim_csv) and os.path.exists(disease_sim_csv)):
        print(f"CRITICAL WARNING: Dataset CSVs not found in {dataset_dir}!")
        print("Expected exactly: DrugDiseaseAssociationNumber.csv, DrugGIP.csv, DiseaseGIP.csv")
        raise FileNotFoundError("Missing real CSV data grids.")

    data, drug_sim, disease_sim = load_real_data(interaction_csv, drug_sim_csv, disease_sim_csv)
    
    torch.save(data, graph_path)
    torch.save(drug_sim, drug_sim_path)
    torch.save(disease_sim, disease_sim_path)
    print("Graph and Similarity matrices saved locally.")
    
    return data, drug_sim, disease_sim

if __name__ == '__main__':
    data, dr_sim, di_sim = preprocess()
    print("Data structures processed successfully.")
    print("Drug Sim Map:", dr_sim.shape)
    print("Disease Sim Map:", di_sim.shape)
