"""
test_predict.py - End-to-end inference test for AMNTDDA full model.

Run:
    python test_predict.py --query "Aspirin" --mode drug2disease --dataset C-dataset --top_k 5

Expected: Prints Top-5 diseases with probability scores.
          "Parameter count: 422/422 loaded" MUST appear.
"""
import sys, os, argparse, torch, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.amntdda_model import load_amntdda_model, _DATASET_DIMS

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# Static DrugBank name map (extend as needed)
DRUG_NAMES = {
    "DB00014": "Goserelin",      "DB00035": "Desmopressin",
    "DB00091": "Cyclosporine",   "DB00104": "Octreotide",
    "DB00115": "Cyanocobalamin", "DB00122": "Choline",
    "DB00125": "Arginine",       "DB00126": "Ascorbic acid (Vit C)",
    "DB00131": "Adenosine monophosphate", "DB00136": "Calcitriol",
    "DB00140": "Riboflavin",     "DB00141": "Carnitine",
    "DB00146": "Calcifediol",    "DB00152": "Thiamine",
    "DB00153": "Ergocalciferol", "DB00158": "Folic acid",
    "DB00159": "Icosapentaenoic acid",   "DB00160": "Alanine",
    "DB00945": "Aspirin",        "DB00316": "Acetaminophen",
    "DB01050": "Ibuprofen",      "DB00704": "Naltrexone",
    "DB00619": "Imatinib",       "DB00398": "Sorafenib",
    "DB00773": "Etoposide",      "DB00877": "Sirolimus",
}


def read_node_ids(allnode_path):
    ids = []
    with open(allnode_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith(",id") or line.startswith("id"):
                continue
            ids.append(line.split(",")[-1].strip())
    return ids


def build_names(node_ids, num_drugs, num_diseases, dataset_name, drug_map, disease_map):
    d_names = []
    for bid in node_ids[:num_drugs]:
        bid = str(bid).strip()
        d_names.append(drug_map.get(bid, f"[{dataset_name}] {bid}"))

    di_names = []
    for bid in node_ids[num_drugs: num_drugs + num_diseases]:
        bid = str(bid).strip()
        di_names.append(disease_map.get(bid, f"[{dataset_name}] {bid}"))

    return d_names, di_names


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query",   default="Aspirin",       help="Drug or disease name")
    parser.add_argument("--mode",    default="drug2disease",   choices=["drug2disease", "disease2drug"])
    parser.add_argument("--dataset", default="C-dataset",     choices=["B-dataset", "C-dataset", "F-dataset"])
    parser.add_argument("--top_k",   type=int, default=5)
    args = parser.parse_args()

    dims         = _DATASET_DIMS[args.dataset]
    num_drugs    = dims["num_drugs"]
    num_diseases = dims["num_diseases"]
    ds_letter    = args.dataset[0]

    model_path    = os.path.join(ROOT_DIR, "results", "result_train",
                                 args.dataset, "AMNTDDA",
                                 f"{ds_letter}-model.pt")
    drug_sim_path = os.path.join(ROOT_DIR, "data", "processed",
                                 f"{args.dataset}_drug_sim.pt")
    dis_sim_path  = os.path.join(ROOT_DIR, "data", "processed",
                                 f"{args.dataset}_disease_sim.pt")
    allnode_path  = os.path.join(ROOT_DIR, "data", "raw",
                                 args.dataset, "AllNode.csv")

    # Load disease name mapping
    disease_map = {}
    jpath = os.path.join(ROOT_DIR, "disease_mapping.json")
    if os.path.exists(jpath):
        with open(jpath, "r", encoding="utf-8") as f:
            disease_map = json.load(f)

    # Load Model
    sep = "=" * 60
    print(f"\n{sep}")
    print(f"  AMNTDDA Full Inference Test")
    print(f"  Dataset: {args.dataset}  |  Query: '{args.query}'  |  Mode: {args.mode}")
    print(f"{sep}")

    model = load_amntdda_model(
        model_path=model_path,
        num_drugs=num_drugs,
        num_diseases=num_diseases,
        device="cpu",
        strict=True,
    )

    n_params = len(model.state_dict())
    print(f"  [OK] Parameter count: {n_params}/422 loaded")
    assert n_params == 422, f"Expected 422, got {n_params}!"

    # Load Data
    drug_sim    = torch.load(drug_sim_path,  map_location="cpu", weights_only=False)
    disease_sim = torch.load(dis_sim_path,   map_location="cpu", weights_only=False)
    node_ids    = read_node_ids(allnode_path)
    d_names, di_names = build_names(node_ids, num_drugs, num_diseases,
                                    args.dataset, DRUG_NAMES, disease_map)

    print(f"  drug_sim:    {drug_sim.shape}")
    print(f"  disease_sim: {disease_sim.shape}")
    print(f"  Drugs: {len(d_names)}, Diseases: {len(di_names)}")

    # Find Query
    q_lower = args.query.strip().lower()
    if args.mode == "drug2disease":
        matches = [i for i, n in enumerate(d_names) if q_lower in n.lower()]
        if not matches:
            print(f"\n  [ERROR] Drug '{args.query}' not found. Available (first 20):")
            for i, n in enumerate(d_names[:20]):
                print(f"     [{i}] {n}")
            return
        src_idx = matches[0]
        src_name = d_names[src_idx]
        num_targets = len(di_names)
        drug_idx    = torch.full((num_targets,), src_idx, dtype=torch.long)
        disease_idx = torch.arange(num_targets,           dtype=torch.long)
        target_names = di_names

    else:  # disease2drug
        matches = [i for i, n in enumerate(di_names) if q_lower in n.lower()]
        if not matches:
            print(f"\n  [ERROR] Disease '{args.query}' not found. Available (first 20):")
            for i, n in enumerate(di_names[:20]):
                print(f"     [{i}] {n}")
            return
        src_idx = matches[0]
        src_name = di_names[src_idx]
        num_targets = len(d_names)
        drug_idx    = torch.arange(num_targets,              dtype=torch.long)
        disease_idx = torch.full((num_targets,), src_idx,    dtype=torch.long)
        target_names = d_names

    print(f"\n  Query matched: '{src_name}' (index {src_idx})")

    # Run Inference
    model.eval()
    with torch.no_grad():
        probs = model(drug_sim, disease_sim, drug_idx, disease_idx)

    probs_np = probs.cpu().numpy()
    top_idx  = probs_np.argsort()[::-1][:args.top_k]

    sep2 = "=" * 56
    sep3 = "-" * 56
    mode_label = "Diseases" if args.mode == "drug2disease" else "Drugs"
    print(f"\n  {sep2}")
    print(f"  Top-{args.top_k} {mode_label} for '{src_name}'")
    print(f"  {sep2}")
    print(f"  {'Rank':<6} {'Score':<10} Name")
    print(f"  {sep3}")
    for rank, t_idx in enumerate(top_idx, 1):
        score = float(probs_np[t_idx])
        name  = target_names[t_idx]
        bar   = "#" * int(score * 20)
        print(f"  {rank:<6} {score:.4f}    {bar:<20}  {name}")
    print(f"  {sep2}")
    print(f"\n  [OK] Test PASSED - Full AMNTDDA forward completed successfully.\n")


if __name__ == "__main__":
    main()
