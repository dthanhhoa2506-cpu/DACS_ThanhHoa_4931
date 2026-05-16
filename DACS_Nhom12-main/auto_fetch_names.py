import os
import json
import time
import requests

def fetch_medical_name(node_id):
    """
    Attempts to fetch a standard medical string for a given Disease (OMIM/MeSH) ID
    using public biological APIs like EBI OLS or NIH.
    """
    try:
        # Example 1: NIH Medical Subject Headings (MeSH) exact mapping
        # E.g: https://id.nlm.nih.gov/mesh/D006973.json
        nih_url = f"https://id.nlm.nih.gov/mesh/{node_id}.json"
        res = requests.get(nih_url, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if "label" in data and "@value" in data["label"]:
                return data["label"]["@value"]
                
        # Example 2: EBI Ontology Lookup Service (OLS) generic search fallback
        # Cleans up 'D' prefixes to search pure OMIM IDs if possible
        clean_id = node_id.replace("D", "") if node_id.startswith("D") and len(node_id) == 7 else node_id
        ols_url = f"https://www.ebi.ac.uk/ols4/api/search?q={clean_id}&exact=true"
        ols_res = requests.get(ols_url, timeout=5)
        if ols_res.status_code == 200:
            hits = ols_res.json().get('response', {}).get('docs', [])
            if hits:
                return hits[0].get('label')
                
    except Exception as e:
        print(f"Network error parsing {node_id}: {e}")
        
    return None

def main():
    nodes_file = os.path.join('data', 'raw', 'C-dataset', 'AllNode.csv')
    output_file = 'disease_mapping.json'
    
    if not os.path.exists(nodes_file):
        print(f"Lỗi: Không tìm thấy file gốc tại {nodes_file}")
        return
        
    with open(nodes_file, 'r', encoding='utf-8') as f:
        nodes = [line.strip() for line in f.readlines() if line.strip()]
        
    print(f"Đã nạp thành công {len(nodes)} mã ID thô.")
    
    mapping = {}
    
    # Resume từ file mapping cũ nếu mạng bị gián đoạn giữa chừng
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            mapping = json.load(f)
            print(f"Đã nạp {len(mapping)} bản ghi có sẵn từ cache.")
            
    api_calls = 0
    for node in nodes:
        # Trong C-dataset, Thuốc thường có tiền tố 'DB' (DrugBank), Bệnh thường có tiền tố 'D' (Disease)
        if node.startswith('D') and not node.startswith('DB'):
            if node in mapping:
                continue
                
            name = fetch_medical_name(node)
            if name:
                mapping[node] = name
                print(f"[THÀNH CÔNG] {node} -> {name}")
            else:
                print(f"[BỎ QUA] Không tìm thấy dữ liệu cho {node}")
                
            api_calls += 1
            
            # Ghi đĩa bảo lưu dữ liệu sau mỗi 10 Request và nghỉ giảm tải Server (Anti-ban Limit)
            if api_calls % 10 == 0:
                with open(output_file, 'w', encoding='utf-8') as out_f:
                    json.dump(mapping, out_f, ensure_ascii=False, indent=4)
                time.sleep(1) # delay timeout trỏ sang NCBI
                
    # Ghi lần cuối
    with open(output_file, 'w', encoding='utf-8') as out_f:
        json.dump(mapping, out_f, ensure_ascii=False, indent=4)
        
    print(f"\n--- HOÀN TRÌNH ---")
    print(f"Đã lưu thành công tổng cộng {len(mapping)} tên Bệnh vào {output_file}.")

if __name__ == '__main__':
    main()
