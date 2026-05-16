/**
 * src/pages/Register.jsx
 * ───────────────────────
 * Trang đăng ký tài khoản mới: username, email, password, confirm password.
 * Gọi POST /auth/register, sau đó chuyển về trang Login.
 */
import React, { useState } from 'react';
import { Network, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

const API = 'http://127.0.0.1:8000';

export default function Register({ onGoLogin }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm: '',
  });
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const handle = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!form.username || !form.email || !form.password || !form.confirm) {
      setError('Vui lòng điền đầy đủ thông tin'); return;
    }
    if (form.username.trim().length < 3) {
      setError('Username phải có ít nhất 3 ký tự'); return;
    }
    if (!form.email.includes('@')) {
      setError('Email không hợp lệ'); return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự'); return;
    }
    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp'); return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          email:    form.email.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Đăng ký thất bại');
      setSuccess(true);
      setTimeout(() => onGoLogin?.(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-sans"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0d3b38 60%, #134e4a 100%)' }}
    >
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-teal-900/50 mb-4">
            <Network size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">AMNTDDA</h1>
          <p className="text-teal-300 text-sm mt-1 font-semibold">Tạo tài khoản mới</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[32px] p-10 shadow-2xl">
          <h2 className="text-xl font-black text-white mb-8">Đăng ký</h2>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle size={48} className="text-teal-400" />
              <p className="text-teal-300 font-black text-lg">Đăng ký thành công!</p>
              <p className="text-white/50 text-sm">Đang chuyển về trang đăng nhập...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { field: 'username', label: 'Tên đăng nhập', type: 'text',     placeholder: 'vd: nguyenvana' },
                { field: 'email',    label: 'Email',          type: 'email',    placeholder: 'vd: vana@gmail.com' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-[10px] font-black text-teal-300 uppercase tracking-widest">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[field]}
                    onChange={handle(field)}
                    placeholder={placeholder}
                    className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/30 font-bold outline-none focus:border-teal-400 focus:bg-white/15 transition-all"
                  />
                </div>
              ))}

              {/* Password fields */}
              {['password', 'confirm'].map((field) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-[10px] font-black text-teal-300 uppercase tracking-widest">
                    {field === 'password' ? 'Mật khẩu' : 'Xác nhận mật khẩu'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form[field]}
                      onChange={handle(field)}
                      placeholder="••••••••"
                      className="w-full px-5 py-4 pr-14 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/30 font-bold outline-none focus:border-teal-400 focus:bg-white/15 transition-all"
                    />
                    {field === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-teal-300 transition-colors"
                      >
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-sm font-semibold">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-teal-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <span className="animate-pulse">Đang xử lý...</span> : <><UserPlus size={18} /> Tạo tài khoản</>}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              Đã có tài khoản?{' '}
              <button
                onClick={onGoLogin}
                className="text-teal-300 font-black hover:text-teal-200 transition-colors"
              >
                Đăng nhập
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
