import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';

export default function DiseaseList({ onNavigate }) {
  const [dataset, setDataset] = useState('C');
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');
  const [loading, setLoading] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`http://127.0.0.1:8000/diseases?dataset=${dataset}&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sort_by=${sortBy}&order=${order}`)
        .then(r => r.json())
        .then(d => { setData(d.data || []); setTotal(d.total || 0); setLoading(false); })
        .catch(e => { console.error(e); setLoading(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [dataset, page, limit, search, sortBy, order]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 font-sans p-8 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            Danh sách Bệnh 
            <span className="text-sm px-3 py-1 bg-rose-100 text-rose-700 rounded-full font-bold">{total}</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase">Dataset:</span>
          <select value={dataset} onChange={e=>setDataset(e.target.value)} className="bg-white dark:bg-slate-900 border dark:border-slate-800 px-4 py-2 rounded-xl font-bold text-rose-600 outline-none shadow-sm">
            <option value="all">All Datasets</option>
            <option value="C">C-dataset</option>
            <option value="B">B-dataset</option>
            <option value="F">F-dataset</option>
          </select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="relative w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Tìm kiếm bệnh..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-rose-500/50" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase">Sắp xếp:</span>
          <select value={`${sortBy}-${order}`} onChange={e=>{const [s,o]=e.target.value.split('-'); setSortBy(s); setOrder(o);}} className="bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-bold outline-none">
            <option value="name-asc">Tên A-Z</option>
            <option value="name-desc">Tên Z-A</option>
            <option value="degree-desc">Nhiều liên kết nhất</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase text-slate-400 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-black">STT</th>
                <th className="px-6 py-4 font-black">OMIM ID</th>
                <th className="px-6 py-4 font-black">Tên bệnh</th>
                <th className="px-6 py-4 font-black">Dataset</th>
                <th className="px-6 py-4 font-black text-center">Liên kết thuốc</th>
                <th className="px-6 py-4 font-black">Top Thuốc</th>
                <th className="px-6 py-4 font-black text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((row, i) => (
                <tr key={row.omim_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{(page-1)*limit + i + 1}</td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{row.omim_id}</td>
                  <td className="px-6 py-4">
                    <button onClick={()=>setSelectedDisease(row)} className="font-black text-rose-600 hover:text-rose-500 hover:underline">{row.name}</button>
                  </td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-[10px] font-black rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">{row.dataset}</span></td>
                  <td className="px-6 py-4 text-center font-bold">{row.degree} 🔗</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {row.top_drugs.map((d, di) => <span key={di} className="px-2 py-1 text-[9px] font-black bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 rounded uppercase">{d.length > 15 ? d.substring(0, 15)+'...' : d}</span>)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={()=>onNavigate('predict', { type: 'disease2drug', query: row.name })} title="Dự đoán" className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                      <Search size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-slate-400 font-bold">Không tìm thấy bệnh nào.</td></tr>}
            </tbody>
          </table>
        )}
        
        {/* Pagination */}
        <div className="p-4 border-t dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
          <div className="text-xs font-bold text-slate-500">
            Hiển thị {(page-1)*limit + 1}–{Math.min(page*limit, total)} trong {total}
          </div>
          <div className="flex items-center gap-2">
            <select value={limit} onChange={e=>{setLimit(parseInt(e.target.value));setPage(1);}} className="mr-4 bg-white dark:bg-slate-900 border dark:border-slate-700 px-2 py-1 rounded-lg text-xs font-bold outline-none">
              <option value="10">10 dòng</option><option value="20">20 dòng</option><option value="50">50 dòng</option>
            </select>
            <button onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={page===1} className="p-1 rounded bg-white dark:bg-slate-800 shadow-sm disabled:opacity-50"><ChevronLeft size={16}/></button>
            <span className="text-xs font-black px-2">{page} / {totalPages}</span>
            <button onClick={()=>setPage(p=>Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-1 rounded bg-white dark:bg-slate-800 shadow-sm disabled:opacity-50"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* Modal Detail */}
      {selectedDisease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-start">
              <div>
                <span className="px-2 py-1 text-[8px] font-black bg-rose-100 text-rose-700 rounded-full uppercase mb-2 inline-block">Disease</span>
                <h3 className="text-2xl font-black">{selectedDisease.name}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">OMIM ID: {selectedDisease.omim_id}</p>
              </div>
              <button onClick={()=>setSelectedDisease(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-red-500"><X size={16}/></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <span className="text-xs font-black uppercase text-slate-500">Liên kết đã biết</span>
                <span className="text-xl font-black text-rose-600">{selectedDisease.degree}</span>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Top 10 Thuốc liên kết</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDisease.top_drugs.map((d, i) => (
                    <span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400 rounded-xl text-xs font-bold">{d}</span>
                  ))}
                </div>
              </div>
              <button onClick={()=>{onNavigate('predict', { type: 'disease2drug', query: selectedDisease.name }); setSelectedDisease(null);}} className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-sm flex justify-center items-center gap-2 transition-colors">
                <ExternalLink size={16} /> Dự đoán với bệnh này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
