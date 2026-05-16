"""
Deep inspection: get FULL architecture spec from AMNTDDA C-model.pt
"""
import sys, torch
sys.path.insert(0, r'D:\DoAnCoSo\Code\drug_disease_prediction_attention_gcl')

path = r'D:\DoAnCoSo\Code\drug_disease_prediction_attention_gcl\results\result_train\C-dataset\AMNTDDA\C-model.pt'
sd = torch.load(path, map_location='cpu', weights_only=False)
keys = list(sd.keys())

# Group by top-level module with full shape info
from collections import defaultdict
modules = defaultdict(list)
for k in keys:
    top = k.split('.')[0]
    modules[top].append((k, tuple(sd[k].shape)))

print(f"Total keys: {len(keys)}\n")
for mod, params in sorted(modules.items()):
    print(f"\n=== {mod} ({len(params)} params) ===")
    for k, s in params:
        print(f"  {k}: {s}")
