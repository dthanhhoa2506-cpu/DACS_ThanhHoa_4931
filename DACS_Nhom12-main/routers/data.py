import os
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.database import get_db
from database.models import User, PredictionLog
from config import config

router = APIRouter(tags=["data"])

# Helper to load data from main memory if possible
def _get_dataset_data(dataset: str):
    from main import load_dataset_resources, DATASET_CFG
    if dataset not in DATASET_CFG:
        raise ValueError("Invalid dataset")
    return load_dataset_resources(dataset)


@router.get("/drugs")
async def get_drugs(
    dataset: str = "C-dataset", 
    page: int = 1, 
    limit: int = 20, 
    search: str = "", 
    sort_by: str = "name", 
    order: str = "asc"
):
    try:
        datasets_to_load = [dataset]
        if dataset == "all":
            datasets_to_load = ["B-dataset", "C-dataset", "F-dataset"]
        else:
            if dataset == "C": dataset = "C-dataset"
            elif dataset == "B": dataset = "B-dataset"
            elif dataset == "F": dataset = "F-dataset"
            datasets_to_load = [dataset]

        combined_results = []
        seen_names = {} # name -> result
        
        for ds in datasets_to_load:
            try:
                _, _, _, d_names, _, di_names, node_ids = _get_dataset_data(ds)
                for i, name in enumerate(d_names):
                    if search.lower() in name.lower():
                        if name not in seen_names:
                            res = {
                                "id": node_ids[i],
                                "name": name,
                                "dataset": ds[0],
                                "degree": random.randint(5, 25),
                                "val": 25,
                                "top_diseases": random.sample(di_names, min(3, len(di_names)))
                            }
                            seen_names[name] = res
                            combined_results.append(res)
            except: continue
        
        results = combined_results
        if sort_by == "name":
            results.sort(key=lambda x: x["name"], reverse=(order == "desc"))
        elif sort_by == "degree":
            results.sort(key=lambda x: x["degree"], reverse=(order == "desc"))
            
        total = len(results)
        start = (page - 1) * limit
        end = start + limit
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": results[start:end]
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/diseases")
async def get_diseases(
    dataset: str = "C-dataset", 
    page: int = 1, 
    limit: int = 20, 
    search: str = "", 
    sort_by: str = "name", 
    order: str = "asc"
):
    try:
        datasets_to_load = [dataset]
        if dataset == "all":
            datasets_to_load = ["B-dataset", "C-dataset", "F-dataset"]
        else:
            if dataset == "C": dataset = "C-dataset"
            elif dataset == "B": dataset = "B-dataset"
            elif dataset == "F": dataset = "F-dataset"
            datasets_to_load = [dataset]

        combined_results = []
        seen_names = {}
        
        for ds in datasets_to_load:
            try:
                _, _, _, d_names, _, di_names, node_ids = _get_dataset_data(ds)
                num_drugs = len(d_names)
                for i, name in enumerate(di_names):
                    if search.lower() in name.lower():
                        if name not in seen_names:
                            res = {
                                "omim_id": node_ids[num_drugs + i] if (num_drugs + i) < len(node_ids) else f"OMIM:{10000+i}",
                                "id": node_ids[num_drugs + i] if (num_drugs + i) < len(node_ids) else f"OMIM:{10000+i}",
                                "name": name,
                                "dataset": ds[0],
                                "degree": random.randint(5, 25),
                                "top_drugs": random.sample(d_names, min(3, len(d_names)))
                            }
                            seen_names[name] = res
                            combined_results.append(res)
            except: continue
                
        results = combined_results
        if sort_by == "name":
            results.sort(key=lambda x: x["name"], reverse=(order == "desc"))
        elif sort_by == "degree":
            results.sort(key=lambda x: x["degree"], reverse=(order == "desc"))
            
        total = len(results)
        start = (page - 1) * limit
        end = start + limit
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": results[start:end]
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proteins")
async def get_proteins(
    dataset: str = "C-dataset", 
    page: int = 1, 
    limit: int = 20, 
    search: str = ""
):
    try:
        # Mock proteins since there is no direct protein file loaded by default
        # Create a stable list of proteins
        random.seed(42)
        all_proteins = [{"id": f"P{i:04d}", "name": f"Protein_{i}", "related_drugs": random.randint(0, 10), "related_diseases": random.randint(0, 10)} for i in range(1, 4756)]
        
        results = [p for p in all_proteins if search.lower() in p["name"].lower()]
        
        total = len(results)
        start = (page - 1) * limit
        end = start + limit
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": results[start:end]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/network")
async def get_graph_network(
    dataset: str = "C-dataset", 
    drug_limit: int = 40, 
    disease_limit: int = 50, 
    show_protein: str = "false",
    search: str = ""
):

    try:
        datasets_to_load = []
        if dataset == "all":
            datasets_to_load = ["B-dataset", "C-dataset", "F-dataset"]
        else:
            if dataset == "C": dataset = "C-dataset"
            elif dataset == "B": dataset = "B-dataset"
            elif dataset == "F": dataset = "F-dataset"
            datasets_to_load = [dataset]

        from main import load_dataset_resources
        import pandas as pd
        root = config.root_dir

        all_nodes_map = {}
        all_real_edges = []
        
        for ds in datasets_to_load:
            try:
                model, drug_sim, disease_sim, d_names, d_smiles, di_names, node_ids = load_dataset_resources(ds)
                num_drugs = len(d_names)
                
                assoc_path = os.path.join(root, 'data', 'raw', ds, 'DrugDiseaseAssociationNumber.csv')
                if os.path.exists(assoc_path):
                    df_assoc = pd.read_csv(assoc_path)
                    
                    # Filter by search if provided
                    if search:
                        match_drug_idxs = [i for i, name in enumerate(d_names) if search.lower() in name.lower()]
                        match_dis_idxs = [i for i, name in enumerate(di_names) if search.lower() in name.lower()]
                        df_assoc = df_assoc[
                            df_assoc['drug'].isin(match_drug_idxs) | 
                            df_assoc['disease'].isin(match_dis_idxs)
                        ]

                    # Sample for performance
                    sample_size = min(150 // len(datasets_to_load), len(df_assoc))
                    df_sample = df_assoc.sample(n=sample_size) if len(df_assoc) > 0 else df_assoc
                    
                    for _, row in df_sample.iterrows():
                        d_idx = int(row['drug'])
                        di_idx = int(row['disease'])
                        if d_idx < len(d_names) and di_idx < len(di_names):
                            # Unique IDs across datasets
                            s_id = f"{ds[0]}_drug_{d_idx}"
                            t_id = f"{ds[0]}_dis_{di_idx}"
                            
                            all_real_edges.append({
                                "source": s_id,
                                "target": t_id,
                                "weight": 0.6 + random.random() * 0.4,
                                "dataset": ds[0]
                            })
                            
                            if s_id not in all_nodes_map:
                                real_id = node_ids[d_idx] if (node_ids and d_idx < len(node_ids)) else f"D{d_idx}"
                                all_nodes_map[s_id] = {
                                    "id": s_id, "label": d_names[d_idx], "type": "drug", "group": "drug",
                                    "val": 28, "realId": real_id, "dataset": ds[0],
                                    "smiles": d_smiles[d_idx] if d_idx < len(d_smiles) else ""
                                }
                            
                            if t_id not in all_nodes_map:
                                num_drugs = len(d_names)
                                real_id = node_ids[num_drugs + di_idx] if (node_ids and (num_drugs + di_idx) < len(node_ids)) else f"DI{di_idx}"
                                all_nodes_map[t_id] = {
                                    "id": t_id, "label": di_names[di_idx], "type": "disease", "group": "disease",
                                    "val": 22, "realId": real_id, "dataset": ds[0]
                                }
            except Exception as e:
                print(f"Error loading {ds}: {e}")
                continue

        # Handle Proteins
        if show_protein.lower() == "true":
            visible_node_ids = list(all_nodes_map.keys())
            if visible_node_ids:
                # Add some proteins linked to visible nodes
                for i in range(min(15, len(visible_node_ids))):
                    p_id = f"protein_{i}"
                    p_name = f"Protein_{i+100}"
                    if p_id not in all_nodes_map:
                        all_nodes_map[p_id] = {
                            "id": p_id, "label": p_name, "type": "protein", "group": "protein",
                            "val": 18, "realId": f"P{i:04d}", "dataset": "Common"
                        }
                    
                    target_node = random.choice(visible_node_ids)
                    all_real_edges.append({
                        "source": p_id,
                        "target": target_node,
                        "weight": 0.5,
                        "dataset": "P"
                    })

        return {
            "nodes": list(all_nodes_map.values()), 
            "edges": all_real_edges,
            "stats": {
                "drug_count": len([n for n in all_nodes_map.values() if n["type"] == "drug"]),
                "disease_count": len([n for n in all_nodes_map.values() if n["type"] == "disease"]),
                "total_edges": len(all_real_edges)
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

