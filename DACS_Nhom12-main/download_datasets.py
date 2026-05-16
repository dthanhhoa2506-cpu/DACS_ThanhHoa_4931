import os
import gdown
import urllib.request
import tarfile
import gzip
import shutil
from config import config

def download_file(url, dest_path):
    print(f"Downloading from {url} to {dest_path}...")
    urllib.request.urlretrieve(url, dest_path)
    print("Done.")

def main():
    os.makedirs(config.raw_dir, exist_ok=True)
    
    print(f"Downloading datasets for {config.dataset_name}...")
    
    # 1. Benchmark Datasets (F-dataset, etc.)
    f_dataset_dir = os.path.join(config.raw_dir, 'F-dataset')
    os.makedirs(f_dataset_dir, exist_ok=True)
    print("For F-dataset, C-dataset, B-dataset, please manually download if gdown folder download fails:")
    print("URL: https://drive.google.com/drive/folders/1w9orlSgM_HlwGwaVWPLYgRqbjdQc7RCv")
    print("Save files into data/raw/F-dataset/")
    
    # 2. CTD Dataset
    ctd_url = "https://maayanlab.cloud/static/hdfs/harmonizome/data/ctddisease/gene_attribute_edges.txt.gz"
    ctd_gz = os.path.join(config.raw_dir, "ctd_gene_attribute_edges.txt.gz")
    if not os.path.exists(ctd_gz):
        download_file(ctd_url, ctd_gz)
    
    # Extract CTD
    ctd_txt = os.path.join(config.raw_dir, "ctd_gene_attribute_edges.txt")
    if not os.path.exists(ctd_txt):
        print("Extracting CTD dataset...")
        with gzip.open(ctd_gz, 'rb') as f_in:
            with open(ctd_txt, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
    
    # 3. DISEASES Dataset
    diseases_url = "https://download.jensenlab.org/human_disease_textmining_full.tsv"
    diseases_tsv = os.path.join(config.raw_dir, "human_disease_textmining_full.tsv")
    if not os.path.exists(diseases_tsv):
        download_file(diseases_url, diseases_tsv)
        
    # 4. Large-scale Datasets
    if config.dataset_name == 'PrimeKG':
        primekg_url = "https://dataverse.harvard.edu/api/access/datafile/6180620"
        primekg_csv = os.path.join(config.raw_dir, "primekg.csv")
        if not os.path.exists(primekg_csv):
            download_file(primekg_url, primekg_csv)
            
    elif config.dataset_name == 'DRKG':
        drkg_url = "https://dgl-data.s3-us-west-2.amazonaws.com/dataset/DRKG/drkg.tar.gz"
        drkg_tar = os.path.join(config.raw_dir, "drkg.tar.gz")
        if not os.path.exists(drkg_tar):
            download_file(drkg_url, drkg_tar)
            print("Extracting DRKG dataset...")
            with tarfile.open(drkg_tar, "r:gz") as tar:
                tar.extractall(path=config.raw_dir)

if __name__ == '__main__':
    main()
