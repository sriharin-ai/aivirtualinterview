import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../features/admin/adminSlice';
import { toast } from 'react-toastify';

export default function AdminLogin() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { adminUser, isLoading, error } = useSelector(s => s.admin);

    const [form, setForm] = useState({ username: '', password: '' });
    const [showPw, setShowPw] = useState(false);

    useEffect(() => {
        if (adminUser) navigate('/admin');
    }, [adminUser, navigate]);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.username || !form.password) return toast.error('Please fill in all fields.');
        dispatch(adminLogin(form));
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500/10 border border-teal-500/30 rounded-2xl mb-4">
                        <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">Admin Portal</h1>
                    <p className="text-slate-400 text-sm mt-1">AI Interviewer Management Console</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 shadow-2xl space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Username</label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                            placeholder="admin"
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                placeholder="••••••••"
                                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                            />
                            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {showPw
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    }
                                </svg>
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-black uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-teal-500/20"
                    >
                        {isLoading ? 'Signing in…' : 'Sign In to Admin'}
                    </button>
                </form>

                <p className="text-center text-slate-600 text-xs mt-6">
                    This area is restricted to administrators only.
                </p>
            </div>
        </div>
    );
}
