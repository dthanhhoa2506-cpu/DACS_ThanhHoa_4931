import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Users, Database, Activity, GitCommit, Target } from 'lucide-react';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('http://127.0.0.1:8000/admin/dashboard-stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP Error: ${r.status}`);
        return r.json();
      })
      .then(d => { setStats(d); setLoading(false); })
      .catch(e => { 
        console.error("Admin Stats Fetch Error:", e); 
        setStats(null);
        setLoading(false); 
      });
  }, [token]);

  if (user?.role !== 'admin') {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-6">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tighter">Truy cập bị từ chối</h2>
        <p className="text-slate-500 max-w-sm mb-8">Chỉ quản trị viên mới có quyền truy cập vào bảng điều khiển này.</p>
        <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-teal-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-teal-600/20">Quay về trang chủ</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Đang tải dữ liệu quản trị...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Lỗi xác thực hoặc Kết nối</h3>
        <p className="text-sm text-slate-500 mb-6">Phiên làm việc của bạn có thể đã hết hạn hoặc bạn không có quyền Admin.</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-20">
      
      {/* 2.1 Banner Admin */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-800 to-slate-900 p-12 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4 scale-150">
          <ShieldAlert size={400} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto">
          <h1 className="text-4xl font-black mb-3 tracking-tighter uppercase">Bảng điều khiển Admin</h1>
          <p className="text-indigo-200 font-semibold text-lg">Quản lý toàn bộ dữ liệu và người dùng hệ thống</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-8 space-y-8">
        
        {/* 2.2 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Người dùng" value={stats.total_users} icon={<Users/>} color="text-blue-500" />
          <StatCard title="Thuốc" value={stats.total_drugs} icon={<Database/>} color="text-teal-500" />
          <StatCard title="Bệnh" value={stats.total_diseases} icon={<Activity/>} color="text-rose-500" />
          <StatCard title="Protein" value={stats.total_proteins} icon={<Target/>} color="text-violet-500" />
          <StatCard title="Liên kết" value={stats.total_links} icon={<GitCommit/>} color="text-indigo-500" />
          <StatCard title="Dự đoán" value={stats.total_predictions} icon={<Activity/>} color="text-amber-500" />
        </div>

        {/* 2.3 Layout 3 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm">
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase mb-6 text-sm tracking-widest">Loại dự đoán</h3>
            <div className="space-y-4">
               {Object.entries(stats.prediction_types).map(([k,v]) => (
                  <div key={k} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                     <span className="font-bold text-slate-600 dark:text-slate-300 capitalize">{k.replace('_', ' ')}</span>
                     <span className="font-black text-indigo-600">{v}</span>
                  </div>
               ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm">
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase mb-6 text-sm tracking-widest">Top Thuốc Tra Cứu</h3>
            <div className="space-y-4">
              {stats.top_drugs.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold"><span className="truncate">{d.name}</span><span className="text-teal-600">{d.count}</span></div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{width: `${(d.count/Math.max(1, stats.top_drugs[0]?.count || 1))*100}%`}}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm">
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase mb-6 text-sm tracking-widest">Top Bệnh Tra Cứu</h3>
            <div className="space-y-4">
              {stats.top_diseases.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold"><span className="truncate">{d.name}</span><span className="text-rose-600">{d.count}</span></div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{width: `${(d.count/Math.max(1, stats.top_diseases[0]?.count || 1))*100}%`}}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 2.4 Bảng Lịch sử */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-sm tracking-widest">Lịch sử dự đoán gần đây</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase text-slate-400 border-b dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-black">Truy vấn</th>
                  <th className="pb-3 font-black">Loại</th>
                  <th className="pb-3 font-black">Phương thức</th>
                  <th className="pb-3 font-black">Mô hình</th>
                  <th className="pb-3 font-black text-center">Top-K</th>
                  <th className="pb-3 font-black text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recent_predictions.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-4 font-bold text-slate-700 dark:text-slate-200">{r.query}</td>
                    <td className="py-4">
                       <div className="flex items-center gap-2">
                          <span className="text-xs">{r.target_type === 'Thuốc' ? '💊' : r.target_type === 'Bệnh' ? '❤️' : '🔀'}</span>
                          <span className="text-[10px] font-bold text-slate-500">{r.target_type}</span>
                       </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        r.method === 'Đơn lẻ' ? "bg-blue-100 text-blue-700" : r.method === 'Ngẫu nhiên' ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {r.method}
                      </span>
                    </td>
                    <td className="py-4"><span className="px-2 py-1 text-[10px] font-black rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400">{r.model}</span></td>
                    <td className="py-4 font-bold text-slate-500 text-center">{r.top_k}</td>
                    <td className="py-4 text-right font-mono text-xs text-slate-400">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({title, value, icon, color}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
      <div className={`mb-3 ${color}`}>{icon}</div>
      <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-[10px] font-black uppercase text-slate-400 mt-1">{title}</div>
    </div>
  )
}
