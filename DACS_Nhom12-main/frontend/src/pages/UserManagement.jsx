import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Calendar, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserManagement() {
  const { user, token } = useAuth();
  const [data, setData] = useState({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/admin/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [token]);

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Truy cập bị từ chối. Chỉ dành cho Admin.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 font-sans p-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            Quản lý Người dùng
            <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">{data.total}</span>
          </h2>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase text-slate-400 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-black">ID / Username</th>
                <th className="px-6 py-4 font-black">Email</th>
                <th className="px-6 py-4 font-black text-center">Phân quyền</th>
                <th className="px-6 py-4 font-black text-center">Số lượt dự đoán</th>
                <th className="px-6 py-4 font-black text-right">Ngày tham gia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.users.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-700 dark:text-slate-200">{row.username}</div>
                    <div className="text-[10px] font-mono text-slate-400">ID: {row.id}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-500">{row.email || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    {row.role === 'admin' ? (
                      <span className="px-3 py-1 text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full uppercase flex items-center justify-center gap-1 w-fit mx-auto"><ShieldAlert size={12}/> ADMIN</span>
                    ) : (
                      <span className="px-3 py-1 text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-full uppercase flex items-center justify-center gap-1 w-fit mx-auto"><Users size={12}/> USER</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-black text-teal-600">{row.prediction_count} <Activity size={12} className="inline ml-1"/></td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
