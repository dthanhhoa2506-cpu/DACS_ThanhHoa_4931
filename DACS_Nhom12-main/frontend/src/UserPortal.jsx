import React, { useState, useEffect, useRef, useCallback } from 'react';
// Last Updated: 2026-05-15 21:58
// Cache-buster: 2026-05-15 21:55
import { 
  Search, Moon, Sun, Network, ArrowRight, Home as HomeIcon, CheckSquare, BarChart2, Settings,
  Layers, Shuffle, X, Database, Info, FileText, PlayCircle, Clipboard,
  Zap, LogIn, LogOut, UserCircle, ShieldAlert, Users, Target, Activity
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import DrugList from './pages/DrugList';
import DiseaseList from './pages/DiseaseList';
import ProteinList from './pages/ProteinList';
import DatasetGraph from './pages/DatasetGraph';
import UserManagement from './pages/UserManagement';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ─── Hero Banner — Animated Gradient Full-Width ──────────────────────────────
const heroBannerStyles = `
  @keyframes gradientShift {
    0%   { background-position: 0%   50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0%   50%; }
  }
  .hero-animated-bg {
    background: linear-gradient(120deg, #0f4c3a, #065f46, #0d9488, #0891b2, #0c4a6e, #134e4a);
    background-size: 300% 300%;
    animation: gradientShift 8s ease infinite;
  }
  @keyframes pulse-ring {
    0%, 100% { opacity: 0.15; transform: scale(1); }
    50%       { opacity: 0.35; transform: scale(1.08); }
  }
  .hero-ring { animation: pulse-ring 4s ease-in-out infinite; }
  .hero-ring-2 { animation: pulse-ring 4s ease-in-out infinite 1.5s; }
`;

function HeroBanner({ onNavigate, chartRef }) {
  return (
    <>
      <style>{heroBannerStyles}</style>
      <div
        className="hero-animated-bg w-full rounded-[32px] shadow-2xl overflow-hidden"
        style={{ minHeight: '280px', position: 'relative' }}
      >
        {/* Decorative blurred rings */}
        <div className="hero-ring" style={{
          position:'absolute', top:'-60px', right:'-60px',
          width:'300px', height:'300px',
          background:'rgba(20,184,166,0.3)', borderRadius:'50%', filter:'blur(60px)',
        }}/>
        <div className="hero-ring-2" style={{
          position:'absolute', bottom:'-40px', left:'20%',
          width:'200px', height:'200px',
          background:'rgba(8,145,178,0.25)', borderRadius:'50%', filter:'blur(50px)',
        }}/>
        {/* Dot grid overlay */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize:'28px 28px',
        }}/>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-8 py-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full backdrop-blur-sm mb-6">
            <span className="text-xs font-black text-teal-200 uppercase tracking-[0.2em]">
              🧬 Attention Fusion · Graph Contrastive Learning
            </span>
          </div>

          {/* Title */}
          <h2 className="text-5xl font-black text-white leading-tight mb-4 drop-shadow-lg">
            Hệ thống Dự đoán Thuốc–Bệnh
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #5eead4, #67e8f9, #a5f3fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}
            >
              thế hệ mới
            </span>
          </h2>

          {/* Subtitle */}
          <p className="text-base text-teal-100/80 max-w-2xl leading-relaxed mb-10 font-medium">
            Ứng dụng GNN kết hợp Attention Fusion và Graph Contrastive Learning
            để khám phá liên kết tiềm năng giữa thuốc và bệnh.
          </p>

          {/* 2 Buttons only */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-4">
            <button
              onClick={() => onNavigate('predict')}
              className="flex items-center gap-2 px-8 py-4 bg-teal-400 hover:bg-teal-300 text-slate-900 rounded-2xl font-black text-sm shadow-2xl shadow-teal-900/50 transition-all active:scale-95"
            >
              <Search size={18}/> 🔍 Bắt đầu dự đoán
            </button>
            <button
              onClick={() => chartRef?.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-8 py-4 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-black text-sm border border-white/25 backdrop-blur-sm transition-all active:scale-95"
            >
              <BarChart2 size={18}/> 📊 So sánh ma trận
            </button>
            <button
              onClick={() => onNavigate('molgen')}
              className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-sm border border-white/10 backdrop-blur-sm transition-all active:scale-95"
            >
              <Network size={18}/> ✨ Sinh phân tử mới
            </button>
          </div>
        </div>

        {/* Network Illustration on the right */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:flex items-center justify-center pointer-events-none pr-12">
           <div className="relative w-full h-full">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-teal-500/20 rounded-full blur-[80px]" />
              <svg viewBox="0 0 200 200" className="w-full h-full text-white/20 drop-shadow-2xl">
                 <circle cx="100" cy="100" r="8" fill="white" fillOpacity="0.8" />
                 <line x1="100" y1="100" x2="160" y2="60" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
                 <line x1="100" y1="100" x2="160" y2="140" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
                 <line x1="100" y1="100" x2="40" y2="140" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
                 <line x1="100" y1="100" x2="40" y2="60" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
                 <circle cx="160" cy="60" r="5" fill="white" fillOpacity="0.6" />
                 <circle cx="160" cy="140" r="5" fill="white" fillOpacity="0.6" />
                 <circle cx="40" cy="140" r="5" fill="white" fillOpacity="0.6" />
                 <circle cx="40" cy="60" r="5" fill="white" fillOpacity="0.6" />
              </svg>
           </div>
        </div>
      </div>
    </>
  );
}

// ─── Stats Cards (6 cards to match image) ───────────────────────────────────────
// ─── Stats Cards (6 cards to match image) ───────────────────────────────────────
function StatsCards({ datasetStats, adminStats, systemOnline, datasetName }) {
  // Use specific dataset stats if available, otherwise fallback to admin totals
  const currentStats = datasetStats?.[datasetName] || datasetStats?.['C-dataset'] || {};
  
  const totalDrugs    = currentStats.drugs || adminStats?.total_drugs || 1525;
  const totalDiseases = currentStats.diseases || adminStats?.total_diseases || 1320;
  const totalProteins = currentStats.proteins || adminStats?.total_proteins || 4756;
  const totalLinks    = currentStats.ddas || adminStats?.total_links || 22881;
  const totalUsers    = adminStats?.total_users || 2;
  const predCount     = adminStats?.total_predictions || 47;

  const cards = [
    { label: 'Thuốc',            value: totalDrugs.toLocaleString(),    icon: '💊', color: 'text-blue-600',    bg: 'bg-white dark:bg-slate-900' },
    { label: 'Bệnh',             value: totalDiseases.toLocaleString(),  icon: '❤️', color: 'text-rose-600',    bg: 'bg-white dark:bg-slate-900' },
    { label: 'Protein',          value: totalProteins.toLocaleString(),   icon: '🌓', color: 'text-emerald-600', bg: 'bg-white dark:bg-slate-900' },
    { label: 'Liên kết biết',     value: totalLinks.toLocaleString(),     icon: '🔗', color: 'text-sky-600',     bg: 'bg-white dark:bg-slate-900' },
    { label: 'Lần dự đoán',      value: predCount.toLocaleString(),      icon: '🕒', color: 'text-amber-600',    bg: 'bg-white dark:bg-slate-900' },
    { label: 'Người dùng',       value: totalUsers.toLocaleString(),     icon: '👥', color: 'text-violet-600',   bg: 'bg-white dark:bg-slate-900' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            'flex flex-col p-6 rounded-[24px] border dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:-translate-y-1',
            c.bg
          )}
        >
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4 bg-slate-50 dark:bg-slate-800')}>
            {c.icon}
          </div>
          <span className={cn('text-2xl font-black mb-1', c.color)}>{c.value}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}


// XÓA BỎ TOÀN BỘ MOCK DATA
// Dữ liệu sẽ được gọi trực tiếp qua API /stats_detailed/{dataset_name}

export default function UserPortal() {
  return (
    <AuthProvider>
      <UserPortalInner />
    </AuthProvider>
  );
}

function UserPortalInner() {
  const { user, token, logout } = useAuth();
  const [authPage, setAuthPage] = useState(null); // null | 'login' | 'register'
  
  const navigate = useNavigate();
  const location = useLocation();

  // ── All other state ──
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [datasetName, setDatasetName] = useState('C-dataset');

  // Data States
  const [datasetStats, setDatasetStats] = useState(null);
  const [nodeList, setNodeList] = useState({ drugs: [], diseases: [] });
  const [hyperData, setHyperData] = useState({ params: {}, metrics: [] });
  const [statsDetailed, setStatsDetailed] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [systemOnline, setSystemOnline] = useState(null);
  const [adminStats, setAdminStats] = useState(null);

  // Control States
  const [searchMode, setSearchMode] = useState('drug2disease');
  const [searchQuery, setSearchQuery] = useState('');
  const [topK, setTopK] = useState(15);
  const [multiDrugsStr, setMultiDrugsStr] = useState('Aspirin, Ibuprofen');
  const [multiDiseasesStr, setMultiDiseasesStr] = useState('Hypertension, Migraine');
  const [multiThreshold, setMultiThreshold] = useState(0.4);
  const [selectedModel, setSelectedModel] = useState('amntdda');
  const [nRandomDrugs, setNRandomDrugs] = useState(5);
  const [nRandomDiseases, setNRandomDiseases] = useState(5);

  // Graph States & Refs
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  // Molecule Generation States
  const [genDisease, setGenDisease] = useState('');
  const [genCount, setGenCount] = useState(6);
  const [genMethod, setGenMethod] = useState('Fragment Addition');
  const [genResults, setGenResults] = useState([]);

  const fgPredict   = useRef();
  const fgRandom    = useRef();
  const fgMulti     = useRef();
  const imageCache  = useRef(new Map());
  const chartSectionRef = useRef(null);  // for Hero "Xem hiệu suất" scroll

  // --- API FETCH ---
  useEffect(() => {
    fetch('http://127.0.0.1:8000/stats').then(r => r.json()).then(d => setDatasetStats(d)).catch(e => console.error(e));
  }, []);

  // Health check for system status card
  useEffect(() => {
    const check = () =>
      fetch('http://127.0.0.1:8000/health')
        .then(r => r.ok ? setSystemOnline(true) : setSystemOnline(false))
        .catch(() => setSystemOnline(false));
    check();
    const intervalId = setInterval(check, 30_000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchAdminStats = useCallback(() => {
    if (user?.role === 'admin' && token) {
      fetch('http://127.0.0.1:8000/admin/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(d => setAdminStats(d))
      .catch(e => console.error(e));
    }
  }, [user, token]);

  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats]);
  useEffect(() => {
    setIsLoading(true);
    const p1 = fetch(`http://127.0.0.1:8000/nodes?dataset_name=${datasetName}`).then(r => r.json());
    // GỌI DỮ LIỆU THẬT QUA ENDPOINT MỚI TẠO
    const statsTarget = datasetName === 'all' ? 'C-dataset' : datasetName;
    const p2 = fetch(`http://127.0.0.1:8000/stats_detailed/${statsTarget}`).then(r => r.json());
    
    Promise.all([p1, p2]).then(([n, s]) => {
      setNodeList(n || { drugs: [], diseases: [] });
      setStatsDetailed(s);
      setHyperData({ params: s?.params || {}, metrics: s?.hyper_metrics || [] });
    }).finally(() => setIsLoading(false));
  }, [datasetName]);

  // AUTO-PREDICT when coming from Molgen
  useEffect(() => {
    if (activeTab === 'predict' && searchQuery && ['ATT-', 'DDA-', 'GCL-', 'AMN-'].some(p => searchQuery.startsWith(p))) {
       // Only trigger if we don't have results yet for this specific query
       if (results.length === 0 || (results[0] && results[0].source !== searchQuery)) {
          handlePredict();
       }
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) root.classList.add('dark'); else root.classList.remove('dark');
  }, [darkMode]);

  // --- GRAPH BUILDERS ---
  const buildPredictGraph = (sName, sId, sSmiles, resArr, isDrug) => {
    const nodes = new Map();
    nodes.set(sName, { id: sName, name: sName, realId: sId, smiles: sSmiles, group: isDrug?'drug':'disease', val: 24 });
    resArr.forEach(r => {
      if (!nodes.has(r.target)) nodes.set(r.target, { id: r.target, name: r.target, realId: r.target_id, smiles: r.target_smiles || "", group: isDrug?'disease':'drug', val: 16 });
    });
    setGraphData({ nodes: Array.from(nodes.values()), links: resArr.map(r=>({ source: sName, target: r.target, value: r.score, color: r.score>0.8?'#0d9488':'#94a3b8' })) });
  };

  const buildMultiGraph = (resArr) => {
    const nodes = new Map();
    resArr.forEach(r => {
      if (!nodes.has(r.source)) nodes.set(r.source, { id: r.source, name: r.source, group: 'drug', val: 18, smiles: r.source_smiles || "", realId: r.source_id });
      if (!nodes.has(r.target)) nodes.set(r.target, { id: r.target, name: r.target, group: 'disease', val: 16, realId: r.target_id });
    });
    setGraphData({ nodes: Array.from(nodes.values()), links: resArr.map(r=>({ source: r.source, target: r.target, value: r.score, color: r.score>0.8?'#0d9488':'#f59e0b' })) });
  };

  const handlePredict = async () => {
    if (!searchQuery) return; setIsLoading(true); setSelectedNode(null); setResults([]);
    try {
      const r = await fetch(`http://127.0.0.1:8000/predict?query=${encodeURIComponent(searchQuery)}&mode=${searchMode}&top_k=${topK}&dataset_name=${datasetName}&model_type=${selectedModel}`);
      const d = await r.json(); setResults(d.results || []);
      if (d.results?.length) buildPredictGraph(d.results[0].source, d.results[0].source_id, d.results[0].source_smiles, d.results, searchMode==='drug2disease');
      // Increment prediction counter in localStorage
      const prev = parseInt(localStorage.getItem('prediction_count') || '0', 10);
      localStorage.setItem('prediction_count', String(prev + 1));
      // Log to backend (best-effort, don't block UI)
      const authToken = localStorage.getItem('auth_token');
      fetch('http://127.0.0.1:8000/predictions/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ drug: searchMode==='drug2disease'?searchQuery:null, disease: searchMode==='disease2drug'?searchQuery:null, dataset: datasetName, type: 'single', top_k: topK, result_count: d.results?.length || 0, model: selectedModel }),
      }).then(() => fetchAdminStats()).catch(() => {});
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleRandomPredict = async () => {
    setIsLoading(true); setSelectedNode(null); setResults([]);
    try {
      const nR = await fetch(`http://127.0.0.1:8000/random_nodes?n_drugs=${nRandomDrugs}&n_diseases=${nRandomDiseases}&dataset_name=${datasetName}`);
      const nD = await nR.json();
      const pR = await fetch(`http://127.0.0.1:8000/predict_multi`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs: nD.drugs, diseases: nD.diseases, dataset_name: nD.dataset || datasetName, threshold: 0.4, model_type: selectedModel })
      });
      const d = await pR.json(); setResults(d.results || []); buildMultiGraph(d.results || []);
      const authToken = localStorage.getItem('auth_token');
      fetch('http://127.0.0.1:8000/predictions/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ dataset: nD.dataset || datasetName, type: 'random', result_count: d.results?.length || 0, model: selectedModel }),
      }).then(() => fetchAdminStats()).catch(() => {});
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleMultiPredict = async () => {
    setIsLoading(true); setSelectedNode(null); setResults([]);
    try {
      const pR = await fetch(`http://127.0.0.1:8000/predict_multi`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs: multiDrugsStr.split(',').map(s=>s.trim()), diseases: multiDiseasesStr.split(',').map(s=>s.trim()), dataset_name: datasetName, threshold: multiThreshold, model_type: selectedModel })
      });
      const d = await pR.json(); setResults(d.results || []); buildMultiGraph(d.results || []);
      const authToken = localStorage.getItem('auth_token');
      fetch('http://127.0.0.1:8000/predictions/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ dataset: datasetName, type: 'many-to-many', result_count: d.results?.length || 0, model: selectedModel }),
      }).then(() => fetchAdminStats()).catch(() => {});
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleGenerateMolecules = async () => {
    if (!genDisease) return;
    setIsLoading(true);
    setGenResults([]);
    try {
      const r = await fetch('http://127.0.0.1:8000/predictions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease: genDisease, num_candidates: genCount, method: genMethod })
      });
      const d = await r.json();
      setGenResults(d.results || []);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };


  // --- GRAPH RENDERING ---
  const handleHover = useCallback((n) => {
    const nH = new Set(); const lH = new Set();
    if (n) {
      nH.add(n.id);
      graphData.links.forEach(l => {
        const s = typeof l.source==='object'?l.source.id:l.source;
        const t = typeof l.target==='object'?l.target.id:l.target;
        if (s===n.id || t===n.id) { lH.add(l); nH.add(s); nH.add(t); }
      });
    }
    setHoverNode(n); setHighlightNodes(nH); setHighlightLinks(lH);
  }, [graphData]);

  const paintNode = useCallback((n, ctx, scale) => {
    const isHi = highlightNodes.has(n.id); const isDim = hoverNode && !isHi;
    ctx.save(); ctx.globalAlpha = isDim?0.15:1;
    
    // Balanced node size for clarity
    const size = (n.val || 10) * 1.8; 
    
    if (n.group==='drug') {
      ctx.beginPath(); ctx.arc(n.x, n.y, size/2, 0, 2*Math.PI); 
      ctx.fillStyle='#0d9488'; ctx.fill();
      ctx.strokeStyle = isHi?'#f59e0b':'#14b8a6'; ctx.lineWidth=isHi?3:1.5; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(n.x, n.y, (size*0.7)/2, 0, 2*Math.PI); ctx.fillStyle='#e11d48'; ctx.fill();
      ctx.strokeStyle = isHi?'#fb7185':'#881337'; ctx.lineWidth=isHi?3:1; ctx.stroke();
    }
    
    if (scale>1.5 || isHi) {
      const fs = (14/scale); ctx.font=`black ${fs}px Sans-Serif`; ctx.textAlign='center'; ctx.fillStyle=darkMode?'#f1f5f9':'#0f172a';
      ctx.fillText(n.name, n.x, n.y+size/2+5/scale+fs/2);
    }
    ctx.restore();
  }, [hoverNode, highlightNodes, darkMode]);

  if (authPage === 'login') return <Login onLoginSuccess={() => setAuthPage(null)} onGoRegister={() => setAuthPage('register')} />;
  if (authPage === 'register') return <Register onGoLogin={() => setAuthPage('login')} />;

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r dark:border-slate-800">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Network size={24}/></div>
          <h1 className="font-black text-xl text-teal-700 dark:text-teal-400 uppercase tracking-tighter">AMNTDDA</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavItem active={activeTab==='home' && location.pathname === '/'}       icon={<HomeIcon size={18}/>}  label="Trang Chủ"         onClick={()=>{setActiveTab('home'); navigate('/');}}/>
          <NavItem active={activeTab==='predict' && location.pathname === '/'}    icon={<Search size={18}/>}    label="Dự Đoán Đơn"      onClick={()=>{setActiveTab('predict'); navigate('/');}}/>
          <NavItem active={activeTab==='random' && location.pathname === '/'}     icon={<Shuffle size={18}/>}   label="Dự Đoán Ngẫu Nhiên" onClick={()=>{setActiveTab('random'); navigate('/');}}/>
          <NavItem active={activeTab==='multi' && location.pathname === '/'}      icon={<Layers size={18}/>}    label="Many-to-Many"     onClick={()=>{setActiveTab('multi'); navigate('/');}}/>
          <NavItem active={activeTab==='hyperparams' && location.pathname === '/'} icon={<Settings size={18}/>} label="Siêu Tham Số"      onClick={()=>{setActiveTab('hyperparams'); navigate('/');}}/>
          <NavItem active={activeTab==='comparison' && location.pathname === '/'} icon={<BarChart2 size={18}/>} label="So Sánh Mô Hình"  onClick={()=>{setActiveTab('comparison'); navigate('/');}}/>
          
          <div className="pt-4 mt-2 border-t dark:border-slate-800">
             <div className="px-4 mb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Dữ liệu</div>
             <NavItem active={location.pathname === '/thuoc'} icon={<Database size={18}/>} label="Thuốc" onClick={()=>{setActiveTab('thuoc'); navigate('/thuoc');}}/>
             <NavItem active={location.pathname === '/benh'} icon={<Activity size={18}/>} label="Bệnh" onClick={()=>{setActiveTab('benh'); navigate('/benh');}}/>
             <NavItem active={location.pathname === '/protein'} icon={<Target size={18}/>} label="Protein" onClick={()=>{setActiveTab('protein'); navigate('/protein');}}/>
             <NavItem active={activeTab === 'molgen'} icon={<PlayCircle size={18}/>} label="Sinh phân tử mới" onClick={()=>{setActiveTab('molgen'); navigate('/');}}/>
             <NavItem active={location.pathname === '/bieu-do-lien-ket'} icon={<Network size={18}/>} label="Biểu đồ liên kết" onClick={()=>{setActiveTab('graph'); navigate('/bieu-do-lien-ket');}}/>
          </div>

          {user?.role === 'admin' && (
            <div className="pt-4 mt-2 border-t dark:border-slate-800">
               <div className="px-4 mb-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Quản trị</div>
               <NavItem active={location.pathname === '/admin'} icon={<ShieldAlert size={18}/>} label="Tổng quan Admin" onClick={()=>{setActiveTab('admin'); navigate('/admin');}}/>
               <NavItem active={location.pathname === '/admin/users'} icon={<Users size={18}/>} label="Người dùng" onClick={()=>{setActiveTab('users'); navigate('/admin/users');}}/>
            </div>
          )}
        </nav>

        {/* Sidebar bottom: dark mode + user section */}
        <div className="p-4 border-t dark:border-slate-800 space-y-2">
          {/* Dark mode toggle */}
          <button onClick={()=>setDarkMode(!darkMode)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            {darkMode?<Sun size={18} className="text-amber-500"/>:<Moon size={18}/>}
            <span className="text-xs font-black uppercase">{darkMode?'Sáng':'Tối'}</span>
          </button>

          {/* User section */}
          {user ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                <UserCircle size={18} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate text-slate-700 dark:text-slate-200">{user.username}</p>
                {user.role === 'admin' && (
                  <span className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full uppercase">ADMIN</span>
                )}
              </div>
              <button
                onClick={() => logout()}
                title="Đăng xuất"
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              >
                <LogOut size={16}/>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthPage('login')}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-600 rounded-xl transition-all"
            >
              <LogIn size={18}/>
              <span className="text-xs font-black uppercase">Đăng nhập</span>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b dark:border-slate-800 shrink-0 z-20">
          <div className="flex items-center gap-6">
            <h2 className="font-black text-lg capitalize">{activeTab}</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className={cn("w-2 h-2 rounded-full", systemOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{systemOnline ? "Hệ thống: Sẵn sàng" : "Hệ thống: Ngoại tuyến"}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black text-slate-400 uppercase">Dataset:</span>
             <select value={datasetName} onChange={e=>setDatasetName(e.target.value)} className="bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-xl font-bold text-teal-600 outline-none hover:ring-2 ring-teal-500/20 transition-all cursor-pointer">
               <option value="C-dataset">C-dataset (663 thuốc, 409 bệnh)</option>
               <option value="B-dataset">B-dataset (269 thuốc, 598 bệnh)</option>
               <option value="F-dataset">F-dataset (593 thuốc, 313 bệnh)</option>
               <option value="all">All Datasets (1,525 Thuốc, 1,320 Bệnh)</option>
             </select>
          </div>
        </header>


        <div className="flex-1 overflow-hidden relative flex flex-col">
          <Routes>
            <Route path="/thuoc" element={<DrugList onNavigate={(tab, data) => { setSearchMode(data.type); setSearchQuery(data.query); setActiveTab(tab); navigate('/'); }} />} />
            <Route path="/benh" element={<DiseaseList onNavigate={(tab, data) => { setSearchMode(data.type); setSearchQuery(data.query); setActiveTab(tab); navigate('/'); }} />} />
            <Route path="/protein" element={<ProteinList />} />
            <Route path="/bieu-do-lien-ket" element={<DatasetGraph />} />
            <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
            <Route path="/admin/users" element={user?.role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="*" element={
              <>
                {activeTab==='home' && (
                  <div className="flex-1 overflow-y-auto p-8 space-y-8 animate-in fade-in">

              {/* 1. Hero Banner — Animated gradient full-width */}
              <HeroBanner onNavigate={setActiveTab} chartRef={chartSectionRef} />

              {/* 2. Stats Cards — 6 cards */}
              <StatsCards datasetStats={datasetStats} adminStats={adminStats} systemOnline={systemOnline} datasetName={datasetName} />

              {/* 3. Performance Chart — full-width, with scroll anchor */}
              <div ref={chartSectionRef} className="bg-white dark:bg-slate-900 p-8 border dark:border-slate-800 rounded-[32px] shadow-sm">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3"><BarChart2 className="text-teal-500"/> So sánh hiệu suất chi tiết ({datasetName === 'all' ? 'C-dataset' : datasetName})</h3>
                
                {!statsDetailed?.has_data ? (
                  <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 font-bold uppercase tracking-widest text-sm">Chưa có kết quả train thực tế (CSV)</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left: Chart */}
                    <div className="lg:col-span-3 h-80">
                      <ResponsiveContainer>
                        <BarChart data={statsDetailed?.comparison || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1}/>
                          <XAxis dataKey="metric" tick={{fontSize:12, fontWeight:'bold'}} />
                          <YAxis domain={[0, 1.0]} tick={{fontSize:10}} />
                          <RechartsTooltip contentStyle={{borderRadius:'16px',border:'none',boxShadow:'0 10px 15px rgb(0 0 0 / 0.1)'}}/>
                          <Legend verticalAlign="top" height={36}/>
                          <Bar dataKey="Improved" name="AMNTDDA (Ours)" fill="#0d9488" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 10, fontWeight: 'black', fill: '#0d9488' }} />
                          <Bar dataKey="Original" name="Baseline" fill="#94a3b8" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 10, fontWeight: 'black', fill: '#64748b' }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Right: Detailed Table */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="overflow-hidden border dark:border-slate-800 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                              <th className="px-4 py-3">Metric</th>
                              <th className="px-4 py-3 text-center">Baseline</th>
                              <th className="px-4 py-3 text-center">AMNTDDA</th>
                              <th className="px-4 py-3 text-right">Delta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-800">
                            {(statsDetailed?.comparison || []).map((m, idx) => {
                              const diff = m.Improved - m.Original;
                              const percent = m.Original > 0 ? (diff / m.Original * 100).toFixed(1) : '0';
                              return (
                                <tr key={idx} className="text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="px-4 py-3 text-slate-500 uppercase">{m.metric}</td>
                                  <td className="px-4 py-3 text-center text-slate-400">{m.Original.toFixed(4)}</td>
                                  <td className="px-4 py-3 text-center text-teal-600 font-black">{m.Improved.toFixed(4)}</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg",
                                      diff >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                    )}>
                                      {diff >= 0 ? '↑' : '↓'} {percent}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Phân phối & Truy cập nhanh */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 border dark:border-slate-800 rounded-[32px] shadow-sm">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Activity className="text-teal-500"/> Phân phối dữ liệu</h3>
                  <div className="h-[450px] w-full flex items-center justify-center">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Bệnh', value: adminStats?.total_diseases || 1320 },
                            { name: 'Liên kết', value: adminStats?.total_links || 22881 },
                            { name: 'Protein', value: adminStats?.total_proteins || 4755 },
                            { name: 'Thuốc', value: adminStats?.total_drugs || 1525 },
                          ]}
                          innerRadius={130}
                          outerRadius={180}
                          paddingAngle={0}
                          dataKey="value"
                        >
                          {[ '#ef4444', '#94a3b8', '#10b981', '#3b82f6' ].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{borderRadius:'16px',border:'none',boxShadow:'0 10px 15px rgb(0 0 0 / 0.1)'}}/>
                        <Legend iconType="circle" wrapperStyle={{paddingTop:'20px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 border dark:border-slate-800 rounded-[32px] shadow-sm">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Zap className="text-amber-500"/> Truy cập nhanh</h3>
                  <div className="space-y-3">
                    <QuickLink icon={<Search size={18}/>} label="Dự đoán đơn" desc="1 thuốc / bệnh → Top-K kết quả" onClick={() => setActiveTab('predict')} color="bg-blue-500" />
                    <QuickLink icon={<BarChart2 size={18}/>} label="Ma trận so sánh" desc="11 thuốc - 11 bệnh + biểu đồ nhiệt" onClick={() => setActiveTab('comparison')} color="bg-rose-500" />
                    <QuickLink icon={<Network size={18}/>} label="Khám phá đồ thị" desc="Mạng lưới liên kết tương tác" onClick={() => { setActiveTab('graph'); navigate('/bieu-do-lien-ket'); }} color="bg-emerald-500" />
                  </div>
                </div>
              </div>

              {/* 5. Dataset Mini-Graphs — 3 cards (NOW AT TOP) */}
              <div className="space-y-6">
                <h3 className="text-xl font-black flex items-center gap-3"><Network className="text-teal-500"/> Mạng lưới dữ liệu chuẩn hóa</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {['B-dataset', 'C-dataset', 'F-dataset'].map(ds => (
                    <MiniGraphCard key={ds} dataset={ds} stats={datasetStats?.[ds]} onNodeClick={setSelectedNode} />
                  ))}
                </div>
              </div>

              {/* 6. Lịch sử dự đoán gần đây (NOW AT BOTTOM) */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[32px] shadow-sm overflow-hidden">
                <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-black flex items-center gap-3"><Clipboard className="text-teal-500"/> Lịch sử dự đoán gần đây</h3>
                  <button onClick={() => {setActiveTab('admin'); navigate('/admin');}} className="text-xs font-black text-teal-600 hover:underline uppercase tracking-widest">Xem tất cả</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-4">Truy vấn</th>
                        <th className="px-8 py-4">Loại</th>
                        <th className="px-8 py-4">Phương thức</th>
                        <th className="px-8 py-4">Mô hình</th>
                        <th className="px-8 py-4 text-center">Top-K</th>
                        <th className="px-8 py-4 text-right">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800">
                      {(adminStats?.recent_predictions || []).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-700 dark:text-slate-200">{r.query}</td>
                          <td className="px-8 py-4">
                             <div className="flex items-center gap-2">
                                <span className="text-xs">{r.target_type === 'Thuốc' ? '💊' : r.target_type === 'Bệnh' ? '❤️' : '🔀'}</span>
                                <span className="text-[10px] font-bold text-slate-500">{r.target_type}</span>
                             </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className={clsx(
                              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                              r.method === 'Đơn lẻ' ? "bg-blue-100 text-blue-700" : r.method === 'Ngẫu nhiên' ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"
                            )}>
                              {r.method}
                            </span>
                          </td>
                          <td className="px-8 py-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono font-bold text-slate-500">{r.model}</span></td>
                          <td className="px-8 py-4 text-center font-bold text-teal-600">{r.top_k}</td>
                          <td className="px-8 py-4 text-right text-[10px] font-bold text-slate-400">{r.created_at}</td>
                        </tr>
                      ))}
                      {(!adminStats?.recent_predictions || adminStats.recent_predictions.length === 0) && (
                        <tr>
                          <td colSpan="6" className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">Chưa có lịch sử dự đoán</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>


            </div>
          )}


          {activeTab==='predict' && (
            <div className="flex-1 flex w-full h-full overflow-hidden">
               <div className="w-0 flex-1 bg-slate-100 dark:bg-black/20 relative">
                  <ForceGraph2D 
                    ref={fgPredict} 
                    graphData={graphData} 
                    nodeCanvasObject={paintNode} 
                    onNodeClick={setSelectedNode} 
                    onNodeHover={handleHover} 
                    linkColor={l=>highlightLinks.has(l)?'#14b8a6':l.color} 
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={0.006}
                    backgroundColor={darkMode?'#0f172a':'#f8fafc'} 
                  />
                  {selectedNode && <DetailDrawer node={selectedNode} onClose={()=>setSelectedNode(null)} />}
               </div>
               <div className="w-[380px] min-w-[380px] flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 shadow-2xl z-30 border-l dark:border-slate-800 overflow-y-auto p-8 space-y-8">
                  <h3 className="text-xl font-black text-teal-600 flex items-center gap-2"><PlayCircle size={24}/> Dự Đoán</h3>
                  <div className="space-y-6">
                     <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <button onClick={()=>setSearchMode('drug2disease')} className={cn("flex-1 py-2 text-[10px] font-black rounded-xl", searchMode==='drug2disease'?"bg-white dark:bg-slate-600 shadow-sm text-teal-600":"text-slate-400")}>
                          THUỐC {datasetStats?.[datasetName] && <span className="ml-1 opacity-60">({datasetStats[datasetName].drugs})</span>}
                        </button>
                        <button onClick={()=>setSearchMode('disease2drug')} className={cn("flex-1 py-2 text-[10px] font-black rounded-xl", searchMode==='disease2drug'?"bg-white dark:bg-slate-600 shadow-sm text-teal-600":"text-slate-400")}>
                          BỆNH {datasetStats?.[datasetName] && <span className="ml-1 opacity-60">({datasetStats[datasetName].diseases})</span>}
                        </button>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Tên Tìm Kiếm</label>
                        <input type="text" list="predict-list" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl font-bold outline-none" placeholder="Nhập tên..."/>
                        <datalist id="predict-list">{(searchMode==='drug2disease'?nodeList.drugs:nodeList.diseases).map(n=><option key={n} value={n}/>)}</datalist>
                     </div>
                    <div className="space-y-2">
                       <div className="flex justify-between"><label className="text-[10px] font-black text-slate-400">Top-K</label><span className="font-black text-teal-600">{topK}</span></div>
                       <input type="range" min="5" max="500" value={topK} onChange={e=>setTopK(parseInt(e.target.value))} className="w-full accent-teal-600"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Mô hình dự đoán</label>
                       <select value={selectedModel} onChange={e=>setSelectedModel(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-teal-600 outline-none hover:ring-2 ring-teal-500/20 transition-all">
                         <option value="amntdda">AMNTDDA (Cải tiến)</option>
                         <option value="baseline">Baseline (Mô hình gốc)</option>
                       </select>
                    </div>
                    <button onClick={handlePredict} disabled={isLoading||!searchQuery} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2">{isLoading?"ĐANG XỬ LÝ...":"DỰ ĐOÁN"}</button>
                  </div>
                  <ResultsList results={results} isLoading={isLoading} />
               </div>
            </div>
          )}

          {activeTab==='random' && (
            <div className="flex-1 flex w-full h-full overflow-hidden">
               <div className="w-0 flex-1 bg-slate-100 dark:bg-black/20 relative">
                  <ForceGraph2D 
                    ref={fgRandom} 
                    graphData={graphData} 
                    nodeCanvasObject={paintNode} 
                    onNodeClick={setSelectedNode} 
                    onNodeHover={handleHover} 
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={0.006}
                    backgroundColor={darkMode?'#0f172a':'#f8fafc'}
                  />
                  {selectedNode && <DetailDrawer node={selectedNode} onClose={()=>setSelectedNode(null)} />}
               </div>
               <div className="w-[380px] min-w-[380px] flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 shadow-2xl z-30 border-l dark:border-slate-800 overflow-y-auto p-8 space-y-8">
                  <h3 className="text-xl font-black text-teal-600 flex items-center gap-2"><Shuffle size={24}/> Ngẫu Nhiên</h3>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drugs: {nRandomDrugs}</label></div>
                      <input type="range" min="2" max="50" value={nRandomDrugs} onChange={e=>setNRandomDrugs(parseInt(e.target.value))} className="w-full accent-teal-600"/>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diseases: {nRandomDiseases}</label></div>
                      <input type="range" min="2" max="50" value={nRandomDiseases} onChange={e=>setNRandomDiseases(parseInt(e.target.value))} className="w-full accent-teal-600"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Mô hình dự đoán</label>
                       <select value={selectedModel} onChange={e=>setSelectedModel(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-teal-600 outline-none hover:ring-2 ring-teal-500/20 transition-all">
                         <option value="amntdda">AMNTDDA (Cải tiến)</option>
                         <option value="baseline">Baseline (Mô hình gốc)</option>
                       </select>
                    </div>
                    <button onClick={handleRandomPredict} disabled={isLoading} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2">
                       {isLoading ? <span className="animate-pulse">ĐANG XỬ LÝ...</span> : "CHẠY NGẪU NHIÊN"}
                    </button>
                  </div>
                  <ResultsList results={results} isLoading={isLoading} isMulti />
               </div>
            </div>
          )}

          {activeTab==='multi' && (
            <div className="flex-1 flex w-full h-full overflow-hidden">
               <div className="w-0 flex-1 bg-slate-100 dark:bg-black/20 relative">
                  <ForceGraph2D 
                    ref={fgMulti} 
                    graphData={graphData} 
                    nodeCanvasObject={paintNode} 
                    onNodeClick={setSelectedNode} 
                    onNodeHover={handleHover} 
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    linkDirectionalParticleSpeed={0.006}
                    backgroundColor={darkMode?'#0f172a':'#f8fafc'}
                  />
                  {selectedNode && <DetailDrawer node={selectedNode} onClose={()=>setSelectedNode(null)} />}
               </div>
               <div className="w-[380px] min-w-[380px] flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 shadow-2xl z-30 border-l dark:border-slate-800 overflow-y-auto p-8 space-y-8">
                  <h3 className="text-xl font-black text-teal-600 flex items-center gap-2"><Layers size={24}/> Many-to-Many</h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Thuốc (phẩy)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          list="multi-drug-list"
                          placeholder="Chọn nhanh thuốc..."
                          className="w-full p-3 mb-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-teal-500/20"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (nodeList.drugs.includes(val)) {
                              const parts = multiDrugsStr.split(',').map(s => s.trim()).filter(s => s);
                              if (!parts.includes(val)) {
                                parts.push(val);
                                setMultiDrugsStr(parts.join(', ') + ', ');
                              }
                              e.target.value = ''; // clear input
                            }
                          }}
                        />
                        <datalist id="multi-drug-list">{nodeList.drugs.map(n=><option key={n} value={n}/>)}</datalist>
                      </div>
                      <textarea rows="3" value={multiDrugsStr} onChange={e=>setMultiDrugsStr(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl text-xs font-bold outline-none" placeholder="Aspirin, Ibuprofen..."/>
                      {/* Suggestions for Drugs */}
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto px-1">
                        {multiDrugsStr.split(',').pop().trim().length > 1 && nodeList.drugs
                          .filter(d => d.toLowerCase().includes(multiDrugsStr.split(',').pop().trim().toLowerCase()) && !multiDrugsStr.includes(d))
                          .slice(0, 10)
                          .map(d => (
                            <button key={d} onClick={() => {
                              const parts = multiDrugsStr.split(',').map(s => s.trim());
                              parts.pop();
                              parts.push(d);
                              setMultiDrugsStr(parts.join(', ') + ', ');
                            }} className="px-2 py-1 bg-teal-500/10 text-teal-600 rounded-md text-[9px] font-black hover:bg-teal-500 hover:text-white transition-all">
                              + {d}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Bệnh (phẩy)</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          list="multi-disease-list"
                          placeholder="Chọn nhanh bệnh..."
                          className="w-full p-3 mb-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-rose-500/20"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (nodeList.diseases.includes(val)) {
                              const parts = multiDiseasesStr.split(',').map(s => s.trim()).filter(s => s);
                              if (!parts.includes(val)) {
                                parts.push(val);
                                setMultiDiseasesStr(parts.join(', ') + ', ');
                              }
                              e.target.value = ''; // clear input
                            }
                          }}
                        />
                        <datalist id="multi-disease-list">{nodeList.diseases.map(n=><option key={n} value={n}/>)}</datalist>
                      </div>
                      <textarea rows="3" value={multiDiseasesStr} onChange={e=>setMultiDiseasesStr(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl text-xs font-bold outline-none" placeholder="Diabetes..."/>
                      {/* Suggestions for Diseases */}
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto px-1">
                        {multiDiseasesStr.split(',').pop().trim().length > 1 && nodeList.diseases
                          .filter(d => d.toLowerCase().includes(multiDiseasesStr.split(',').pop().trim().toLowerCase()) && !multiDiseasesStr.includes(d))
                          .slice(0, 10)
                          .map(d => (
                            <button key={d} onClick={() => {
                              const parts = multiDiseasesStr.split(',').map(s => s.trim());
                              parts.pop();
                              parts.push(d);
                              setMultiDiseasesStr(parts.join(', ') + ', ');
                            }} className="px-2 py-1 bg-rose-500/10 text-rose-600 rounded-md text-[9px] font-black hover:bg-rose-500 hover:text-white transition-all">
                              + {d}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase">Mô hình dự đoán</label>
                       <select value={selectedModel} onChange={e=>setSelectedModel(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-teal-600 outline-none hover:ring-2 ring-teal-500/20 transition-all">
                         <option value="amntdda">AMNTDDA (Cải tiến)</option>
                         <option value="baseline">Baseline (Mô hình gốc)</option>
                       </select>
                    </div>
                    <button onClick={handleMultiPredict} disabled={isLoading} className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2">
                       {isLoading ? <span className="animate-pulse">ĐANG XỬ LÝ...</span> : "PHÂN TÍCH CHÉO"}
                    </button>
                  </div>
                  <ResultsList results={results} isLoading={isLoading} isMulti />
               </div>
            </div>
          )}

          {activeTab==='molgen' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Controls */}
                <div className="w-[380px] flex-shrink-0 bg-white dark:bg-slate-900 shadow-2xl z-20 border-r dark:border-slate-800 p-8 space-y-8 overflow-y-auto">
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-teal-600 flex items-center gap-3"><PlayCircle size={24}/> Sinh phân tử thuốc mới bằng AI</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dựa trên nền tảng AMNTDDA & Attention Fusion</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Bệnh mục tiêu</label>
                      <input 
                        type="text" 
                        list="gen-disease-list"
                        value={genDisease} 
                        onChange={e=>setGenDisease(e.target.value)} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 ring-teal-500/20" 
                        placeholder="Tìm bệnh mục tiêu..."
                      />
                      <datalist id="gen-disease-list">{nodeList.diseases.map(n=><option key={n} value={n}/>)}</datalist>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Số ứng viên: {genCount}</label>
                      <select value={genCount} onChange={e=>setGenCount(parseInt(e.target.value))} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl font-bold outline-none">
                        <option value={3}>3 phân tử</option>
                        <option value={6}>6 phân tử</option>
                        <option value={9}>9 phân tử</option>
                        <option value={12}>12 phân tử</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Phương pháp sinh</label>
                      <div className="grid grid-cols-1 gap-2">
                         <button onClick={()=>setGenMethod('Fragment Addition')} className={cn("text-left p-4 rounded-2xl border transition-all", genMethod==='Fragment Addition'?"bg-teal-50 border-teal-500 dark:bg-teal-900/20":"border-slate-100 dark:border-slate-800 hover:border-teal-200")}>
                           <p className="text-xs font-black text-slate-700 dark:text-slate-200">Fragment Addition</p>
                           <p className="text-[10px] text-slate-500 mt-1 font-bold">Gắn nhóm hoá học vào thuốc đã biết</p>
                         </button>
                         <button onClick={()=>setGenMethod('Scaffold Assembly')} className={cn("text-left p-4 rounded-2xl border transition-all", genMethod==='Scaffold Assembly'?"bg-teal-50 border-teal-500 dark:bg-teal-900/20":"border-slate-100 dark:border-slate-800 hover:border-teal-200")}>
                           <p className="text-xs font-black text-slate-700 dark:text-slate-200">Scaffold Assembly</p>
                           <p className="text-[10px] text-slate-500 mt-1 font-bold">Kết hợp khung phân tử + nhóm dược lý</p>
                         </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleGenerateMolecules} 
                      disabled={isLoading || !genDisease}
                      className="w-full py-5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-black shadow-xl shadow-teal-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {isLoading ? <span className="animate-pulse">ĐANG XỬ LÝ...</span> : <><PlayCircle size={18}/> SINH PHÂN TỬ ỨNG VIÊN</>}
                    </button>
                  </div>
                </div>

                {/* Right: Display */}
                <div className="flex-1 overflow-y-auto p-12 bg-slate-50 dark:bg-slate-950 relative">
                   {genResults.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-700">
                        <div className="relative">
                          <div className="absolute inset-0 bg-teal-500/20 blur-[100px] rounded-full scale-150 animate-pulse" />
                          <div className="relative w-32 h-32 bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl flex items-center justify-center border border-teal-500/20">
                            <Network size={64} className="text-teal-500 animate-spin-slow" style={{ animationDuration: '10s' }} />
                          </div>
                        </div>
                        <div className="space-y-3 max-w-lg">
                          <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">Sinh phân tử thuốc mới bằng AI</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Chọn bệnh mục tiêu ở bên trái rồi bấm <span className="text-teal-600 font-bold">Sinh phân tử ứng viên</span> — hệ thống sẽ đề xuất cấu trúc phân tử mới dựa trên Fragment Addition và Scaffold Assembly.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                          <div className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border dark:border-slate-800 shadow-sm flex flex-col items-center gap-3">
                             <Layers size={24} className="text-amber-500" />
                             <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Fragment Addition</span>
                          </div>
                          <div className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border dark:border-slate-800 shadow-sm flex flex-col items-center gap-3">
                             <Shuffle size={24} className="text-teal-500" />
                             <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Scaffold Assembly</span>
                          </div>
                        </div>
                      </div>
                   ) : (
                      <div className="space-y-12">
                        <div className="flex justify-between items-end">
                           <div>
                             <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">Ứng viên đã sinh</h4>
                             <p className="text-xs font-bold text-teal-600 uppercase mt-2 tracking-widest">Dựa trên Attention Features cho bệnh {genDisease}</p>
                           </div>
                           <button onClick={()=>setGenResults([])} className="px-6 py-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-50 hover:text-rose-600 transition-all">Xóa kết quả</button>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                           {genResults.map(mol => (
                             <MoleculeResultCard key={mol.id} mol={mol} onPredict={() => {
                               setResults([]);
                               setSearchMode('drug2disease');
                               setSearchQuery(mol.name); 
                               setActiveTab('predict');
                             }} />
                           ))}
                        </div>
                      </div>
                   )}
                </div>
              </div>
            </div>
          )}

          {activeTab==='hyperparams' && (
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right">
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border dark:border-slate-800 shadow-sm">
                  <h3 className="text-xl font-black mb-8 text-teal-600 flex items-center gap-3"><Settings size={22}/> Cấu hình Siêu tham số</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(hyperData.params||{}).map(([k,v])=>(<div key={k} className="p-5 bg-slate-50 dark:bg-slate-800/50 border dark:border-slate-800 rounded-2xl"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">{k}</p><p className="text-lg font-black text-teal-500">{v}</p></div>))}
                  </div>
               </div>
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border dark:border-slate-800 shadow-sm">
                  <h3 className="text-xl font-black mb-8 text-rose-600 flex items-center gap-3"><CheckSquare size={22}/> Hiệu năng dự đoán</h3>
                  {!statsDetailed?.has_data ? (
                    <div className="flex items-center justify-center h-[400px] bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 font-bold uppercase tracking-widest text-sm text-center px-4">Đang đợi kết quả từ<br/>results/tables/</div>
                  ) : (
                    <div className="h-[400px]"><ResponsiveContainer><BarChart data={hyperData.metrics||[]} layout="vertical" margin={{left:20, right:40}}><XAxis type="number" hide domain={[0,1]}/><YAxis dataKey="name" type="category" width={80} tick={{fontSize:10,fontWeight:'bold'}}/><RechartsTooltip /><Bar dataKey="Improved" name="AMNTDDA" fill="#0d9488" radius={[0,8,8,0]} label={{ position: 'right', fontSize: 10, fontWeight: 'black', fill: '#0d9488' }} /></BarChart></ResponsiveContainer></div>
                  )}
               </div>
            </div>
          )}

          {activeTab==='comparison' && (
            <div className="flex-1 p-8 overflow-y-auto text-center">
               <div className="bg-white dark:bg-slate-900 p-12 rounded-[48px] border dark:border-slate-800 shadow-sm max-w-5xl mx-auto">
                  <h3 className="text-3xl font-black mb-12 text-teal-600 uppercase tracking-tighter">So sánh Baseline vs AMNTDDA Improved ({datasetName === 'all' ? 'C-dataset' : datasetName})</h3>
                  {!statsDetailed?.has_data ? (
                     <div className="flex flex-col items-center justify-center h-[500px] bg-slate-50 dark:bg-slate-800/50 rounded-[32px] text-slate-400 font-bold uppercase tracking-widest text-sm">
                        <FileText size={48} className="mb-4 opacity-50" />
                        Không tìm thấy file kết quả CSV của tập {datasetName}
                     </div>
                  ) : (
                     <div className="h-[500px]"><ResponsiveContainer><BarChart data={statsDetailed?.comparison || []}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1}/><XAxis dataKey="metric"/><YAxis domain={[0, 1.1]} /><RechartsTooltip contentStyle={{borderRadius:'24px'}}/><Legend /><Bar dataKey="Improved" name="AMNTDDA (Ours)" fill="#0d9488" radius={[12,12,0,0]} label={{ position: 'top', fontSize: 12, fontWeight: 'black', fill: '#0d9488' }} /><Bar dataKey="Original" name="Baseline Models" fill="#94a3b8" radius={[12,12,0,0]} label={{ position: 'top', fontSize: 12, fontWeight: 'black', fill: '#64748b' }} /></BarChart></ResponsiveContainer></div>
                  )}
               </div>
            </div>
          )}
          </>
            } />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all font-bold", active?"bg-teal-600 text-white shadow-xl shadow-teal-600/30":"text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
      <span className={active?"text-white":"text-slate-400"}>{icon}</span><span className="text-sm truncate">{label}</span>
    </button>
  );
}

function QuickLink({ icon, label, desc, onClick, color }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 rounded-2xl border dark:border-slate-800 hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", color)}>
        {icon}
      </div>
      <div className="text-left flex-1">
        <p className="text-sm font-black text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{desc}</p>
      </div>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
    </button>
  );
}

function ResultsList({ results, isLoading, isMulti = false }) {
  if (isLoading) return null;
  if (results.length === 0) {
     return (
       <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-dashed dark:border-slate-800 animate-in fade-in duration-500">
         <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
           <X size={20} className="text-slate-400" />
         </div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Không tìm thấy liên kết</p>
         <p className="text-[9px] text-slate-400 mt-2 italic px-4">Hãy kiểm tra lại tên thuốc/bệnh hoặc thử giảm ngưỡng Threshold.</p>
       </div>
     );
  }
  return (
    <div className="space-y-3 pt-4 animate-in slide-in-from-bottom duration-500">
      <h4 className="text-[10px] font-black text-slate-400 uppercase border-b pb-2">Kết Quả Phân Tích</h4>
      {results.slice(0, 50).map((r, i) => (
        <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex justify-between items-center group hover:border-teal-500 transition-all">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              {isMulti ? `${r.source} ➔` : `RANK #${i+1}`}
              {r.dataset && <span className="ml-2 px-1 bg-teal-100 text-teal-600 rounded">({r.dataset})</span>}
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200 truncate w-40">{r.target}</span>
          </div>
          <span className="font-black text-teal-600">{(r.score*100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function MiniGraphCard({ dataset, stats, onNodeClick }) {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef();

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/graph/network?dataset=${dataset.charAt(0)}&drug_limit=50&disease_limit=60`)
      .then(r => r.json())
      .then(d => {
        setData({ nodes: d.nodes, links: d.edges });
        setLoading(false);
      })
      .catch((err) => {
        console.error("MiniGraph Fetch Error:", err);
        setLoading(false);
      });
  }, [dataset]);

  useEffect(() => {
    if (!loading && fgRef.current && data.nodes.length > 0) {
      setTimeout(() => {
        if (fgRef.current) fgRef.current.zoomToFit(800, 100);
      }, 1500);
    }
  }, [loading, data]);

  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[40px] overflow-hidden shadow-xl hover:border-teal-500 transition-all flex flex-col h-[900px]">
      <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-600/10 rounded-lg flex items-center justify-center text-teal-600"><Network size={16}/></div>
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{dataset}</h3>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-teal-600 uppercase">Xem trước trực tiếp</span>
              <span className="text-[8px] font-bold text-slate-400">{stats?.drugs || 0} Thuốc · {stats?.diseases || 0} Bệnh</span>
           </div>
        </div>
      </div>
      <div className="flex-1 relative bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            backgroundColor="transparent"
            enableZoomInteraction={true}
            enablePanInteraction={true}
            nodeRelSize={8}
            nodeLabel={n => `
              <div style="background: rgba(15, 23, 42, 0.9); color: white; padding: 12px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.3); backdrop-filter: blur(8px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
                <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${n.type==='drug'?'#2dd4bf':'#fb7185'}; margin-bottom: 4px;">
                  ${n.type === 'drug' ? '💊 DƯỢC PHẨM' : '❤️ BỆNH LÝ'}
                </div>
                <div style="font-size: 14px; font-weight: 900; margin-bottom: 4px;">${n.label}</div>
                <div style="font-size: 10px; opacity: 0.7; font-family: monospace;">ID: ${n.realId || 'N/A'}</div>
                <hr style="margin: 8px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);" />
                <div style="font-size: 9px; font-weight: bold; color: #94a3b8;">Click để xem chi tiết cấu trúc</div>
              </div>
            `}
            onNodeClick={onNodeClick}
            nodeCanvasObject={(n, ctx, scale) => {
              // Even larger nodes for the big frames
              const radius = n.type === 'drug' ? 12 : 9;
              ctx.beginPath(); 
              ctx.arc(n.x, n.y, radius, 0, 2*Math.PI);
              ctx.fillStyle = n.type === 'drug' ? '#0d9488' : '#e11d48'; 
              ctx.fill();
              
              // Stronger Glow effect
              ctx.shadowBlur = 20 / scale;
              ctx.shadowColor = n.type === 'drug' ? 'rgba(20, 184, 166, 0.7)' : 'rgba(225, 29, 72, 0.7)';
              
              ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5/scale; ctx.stroke();
              
              if (scale > 2.5) {
                ctx.font = `bold ${10/scale}px Sans-Serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#64748b';
                ctx.fillText(n.label, n.x, n.y + radius + 4/scale);
              }
            } }
            linkColor={() => 'rgba(148, 163, 184, 0.2)'}
            linkWidth={1}
            d3AlphaDecay={0.02}
            cooldownTicks={150}
          />
        )}
      </div>
    </div>


  );
}

function DetailDrawer({ node, onClose }) {
  const [imgIndex, setImgIndex] = useState(0);
  const [zoom, setZoom] = useState(3.5);
  
  // Normalize node type/group
  const nodeType = node.group || node.type;
  const isDrug = nodeType === 'drug';

  useEffect(() => {
    if (isDrug) {
      setImgIndex(0);
      setZoom(3.5);
    }
  }, [node, isDrug]);

  const getImgUrl = () => {
    const d_name = node.name.replace('Drug_','').trim();
    const urls = [];
    
    // 1. Simolecule using SMILES (Fastest, SVG vector, scales perfectly without resolution loss)
    if (node.smiles) {
       urls.push(`https://www.simolecule.com/cdkdepict/depict/bow/svg?smi=${encodeURIComponent(node.smiles)}&w=400&h=400&abbr=on&hdisp=bridgehead&zoom=1.6`);
    }

    // 2. PubChem (Very fast, minimal padding, large size)
    urls.push(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(d_name)}/PNG?record_type=2d&image_size=large`);
    
    // 3. DrugBank SVG (Has a lot of built-in whitespace)
    if (node.realId && node.realId.startsWith('DB')) {
       urls.push(`https://go.drugbank.com/structures/small_molecule_drugs/${node.realId}.svg`);
    }

    // 4. NCI Cactus (Reliable fallback)
    urls.push(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(d_name)}/image`);
    
    // 5. Placeholder
    urls.push(`https://placehold.co/400x400/f8fafc/0d9488?text=${encodeURIComponent(d_name.substring(0, 12))}`);
    
    return urls[Math.min(imgIndex, urls.length - 1)];
  };

  return (
    <div className="absolute top-6 left-6 bottom-6 w-[700px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-teal-500/20 rounded-[40px] shadow-2xl z-50 flex flex-col p-12 animate-in slide-in-from-left duration-500">
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1 truncate pr-4">
          <span className={cn("px-4 py-1 text-[10px] font-black rounded-full uppercase", isDrug?'bg-teal-100 text-teal-700':'bg-rose-100 text-rose-700')}>{nodeType}</span>
          <h4 className="font-black text-4xl mt-3 dark:text-white truncate" title={node.name || node.label}>{node.name || node.label}</h4>
          <p className="text-[12px] font-bold text-slate-400 mt-2 uppercase tracking-widest">ID: <span className="text-teal-600 font-black">{node.realId||'N/A'}</span></p>
        </div>
        <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white rounded-full transition-all text-slate-400 shadow-sm"><X size={20}/></button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
        {isDrug ? (
             <div 
               className="aspect-square bg-white rounded-[40px] border border-slate-100 p-8 shadow-inner flex items-center justify-center overflow-hidden group relative cursor-zoom-in"
               onWheel={(e) => {
                 e.preventDefault();
                 const delta = e.deltaY > 0 ? -0.3 : 0.3;
                 setZoom(prev => Math.max(1, Math.min(prev + delta, 10)));
               }}
             >
                <img 
                  key={`${node.id}-${imgIndex}`}
                  src={getImgUrl()} 
                  alt="Structure" 
                  referrerPolicy="no-referrer"
                  style={{ transform: `scale(${zoom})` }}
                  className="w-full h-full object-contain transition-transform duration-200 pointer-events-none" 
                  onError={() => { 
                    setImgIndex(prev => prev + 1);
                  }}
                />
             </div>
        ) : (
          <div className="aspect-square bg-rose-50/50 dark:bg-rose-900/10 rounded-[32px] border border-rose-100 dark:border-rose-900/30 flex flex-col items-center justify-center p-10 text-center">
             <Info size={48} className="text-rose-300 mb-4" />
             <p className="font-black text-rose-500 uppercase text-[10px] tracking-widest">Disease Entity</p>
             <p className="text-xs text-slate-400 mt-4 leading-relaxed">Thông tin cấu trúc hóa học không khả dụng cho các thực thể Bệnh lý.</p>
          </div>
        )}

        {node.smiles && (
          <div className="space-y-4">
            <span className="text-[12px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-[0.2em]"><Layers size={18} className="text-teal-500"/> SMILES Notation</span>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border dark:border-slate-800 group relative">
              <p className="text-[14px] font-mono break-all text-slate-700 dark:text-slate-200 font-black leading-relaxed">{node.smiles}</p>
              <button className="absolute top-4 right-4 p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-700 rounded-xl shadow-md border dark:border-slate-600">
                <Clipboard size={18} className="text-teal-600"/>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-8 border-t dark:border-slate-800 mt-4">
        <button onClick={onClose} className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">ĐÓNG CHI TIẾT</button>
      </div>
    </div>
  );
}

function MoleculeResultCard({ mol, onPredict }) {
  const [zoom, setZoom] = useState(12.0); // Maximum default zoom for filling the frame
  const [imgIndex, setImgIndex] = useState(0);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -2.0 : 2.0; 
    setZoom(prev => Math.max(1.0, Math.min(prev + delta, 40)));
  };

  const getImgUrl = () => {
    const urls = [
      `https://www.simolecule.com/cdkdepict/depict/bow/svg?smi=${encodeURIComponent(mol.smiles)}&w=1000&h=1000&abbr=on&zoom=${zoom.toFixed(1)}`,
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(mol.smiles)}/PNG`,
      `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(mol.smiles)}/image`
    ];
    return urls[imgIndex % urls.length];
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[40px] border dark:border-slate-800 shadow-xl overflow-hidden hover:border-teal-500/50 transition-all group">
       <div 
         className="h-[400px] p-0 bg-white dark:bg-white/5 relative overflow-hidden flex items-center justify-center cursor-zoom-in"
         onWheel={handleWheel}
         title="Cuộn chuột để Zoom cực nhanh"
       >
          <img 
            src={getImgUrl()} 
            alt="Candidate" 
            className="w-full h-full object-contain transition-transform duration-150"
            style={{ transform: `scale(${zoom > 12.0 ? 1 : zoom/12.0})` }} 
            onError={() => setImgIndex(prev => prev + 1)}
          />





          <div className="absolute top-4 right-4 px-3 py-1 bg-teal-500 text-white rounded-full text-[8px] font-black uppercase shadow-lg">#{mol.id}</div>
          <div className="absolute bottom-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-lg text-[8px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">ZOOM: {zoom.toFixed(1)}x</div>
       </div>
       <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
             <h5 className="text-xl font-black text-slate-800 dark:text-slate-100">{mol.name}</h5>
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Method</p>
                <p className="text-[10px] font-bold text-teal-600">{mol.method}</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">QED Score</p>
                <p className="text-lg font-black text-emerald-500">{mol.qed}</p>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">SA Score</p>
                <p className="text-lg font-black text-rose-500">{mol.sa_score}</p>
             </div>
          </div>

          <div className="space-y-2">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={12} className="text-teal-500"/> Rationale</p>
             <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">{mol.rationale}</p>
          </div>

          <button 
             onClick={onPredict}
             className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
             Kiểm tra với AMNTDDA
          </button>
       </div>
    </div>
  );
}

