import numpy as np
from collections import defaultdict
from sklearn.metrics import roc_auc_score, average_precision_score, f1_score, accuracy_score, precision_score, recall_score, matthews_corrcoef

def compute_group_recall_at_k(y_true, y_pred, drug_ids, k):
    """
    Computes Recall@K natively grouped by per-query drug interaction.
    """
    if drug_ids is None:
        return 0.0
        
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    drug_ids = np.asarray(drug_ids)
        
    # Group predictions by drug
    grouped_data = defaultdict(list)
    for i in range(len(drug_ids)):
        grouped_data[drug_ids[i]].append((float(y_pred[i]), float(y_true[i])))
        
    recalls = []
    
    for drug_id, preds_and_labels in grouped_data.items():
        # Sort predictions per drug in descending order
        preds_and_labels.sort(key=lambda x: x[0], reverse=True)
        
        top_k = preds_and_labels[:k]
        
        relevant_retrieved = sum([label for pred, label in top_k])
        total_relevant = sum([label for pred, label in preds_and_labels])
        
        # Only evaluate drugs that actually have positive interacting edges in the ground truth
        if total_relevant > 0:
            recalls.append(relevant_retrieved / total_relevant)
            
    if len(recalls) == 0:
        return 0.0
        
    return float(np.mean(recalls))

def find_best_threshold(y_true, y_pred, metric='f1'):
    best_threshold = 0.5
    best_score = -1.0
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    
    thresholds = np.unique(np.percentile(y_pred, np.arange(5, 96, 2)))
    if len(thresholds) == 0:
        thresholds = [0.5]
        
    for thresh in thresholds:
        y_pred_label = (y_pred > thresh).astype(int)
        if metric == 'f1':
            score = f1_score(y_true, y_pred_label, zero_division=0)
        else:
            score = matthews_corrcoef(y_true, y_pred_label)
            
        if score > best_score:
            best_score = score
            best_threshold = float(thresh)
            
    return best_threshold

def compute_metrics(y_true, y_pred, drug_ids=None, as_dict=True, threshold=0.5):
    """
    Compute full metrics following the AMDGT paper.
    Calculates AUC, AUPR, Accuracy, Precision, Recall, F1, MCC, and Recall@K natively casting to standard Python floats to bypass JSON serialization errors.
    
    as_dict: If True, returns a dictionary of metrics. If False, returns a tuple.
    threshold: probability cutoff for deterministic binary metrics.
    """
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    
    y_pred_label = (y_pred > threshold).astype(int)
    
    auc = float(roc_auc_score(y_true, y_pred))
    aupr = float(average_precision_score(y_true, y_pred))
    acc = float(accuracy_score(y_true, y_pred_label))
    prec = float(precision_score(y_true, y_pred_label, zero_division=0))
    rec = float(recall_score(y_true, y_pred_label, zero_division=0))
    f1 = float(f1_score(y_true, y_pred_label, zero_division=0))
    
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        mcc = float(matthews_corrcoef(y_true, y_pred_label))
    
    # Calculate group recall mapping
    r_10 = float(compute_group_recall_at_k(y_true, y_pred, drug_ids, 10))
    r_20 = float(compute_group_recall_at_k(y_true, y_pred, drug_ids, 20))
    r_50 = float(compute_group_recall_at_k(y_true, y_pred, drug_ids, 50))
    
    if as_dict:
        return {
            "AUC": auc,
            "AUPR": aupr,
            "Accuracy": acc,
            "Precision": prec,
            "Recall": rec,
            "F1-score": f1,
            "MCC": mcc,
            "Recall@10": r_10,
            "Recall@20": r_20,
            "Recall@50": r_50
        }
    else:
        return (auc, aupr, acc, prec, rec, f1, mcc, r_10, r_20, r_50)