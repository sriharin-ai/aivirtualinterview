import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { orgAdminLogin, clearOrgError } from '../features/orgAdmin/orgAdminSlice';
import { toast } from 'react-toastify';

export default function OrgAdminLogin() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error, orgAdmin } = useSelector(s => s.orgAdmin);
    const [form, setForm] = useState({ orgCode: '', adminUsername: '', adminPassword: '' });
    const [showPass, setShowPass] = useState(false);

    useEffect(() => {
        if (orgAdmin?.token) navigate('/org-admin', { replace: true });
    }, [orgAdmin, navigate]);

    useEffect(() => {
        if (error) { toast.error(error); dispatch(clearOrgError()); }
    }, [error, dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.orgCode || !form.adminUsername || !form.adminPassword) {
            toast.error('All fields are required'); return;
        }
        dispatch(orgAdminLogin({ ...form, orgCode: form.orgCode.toUpperCase().trim() }));
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-teal-500/20">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black text-white">Organization Portal</h1>
                    <p className="text-slate-400 text-sm mt-1">Sign in to manage your students</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
                    {/* Org Code */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Organization Code</label>
                        <input
                            type="text"
                            value={form.orgCode}
                            onChange={e => setForm(f => ({ ...f, orgCode: e.target.value.toUpperCase() }))}
                            placeholder="e.g. MIT001"
                            maxLength={10}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-teal-500 transition text-sm"
                        />
                    </div>

                    {/* Admin Username */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Admin Username</label>
                        <input
                            type="text"
                            value={form.adminUsername}
                            onChange={e => setForm(f => ({ ...f, adminUsername: e.target.value }))}
                            placeholder="Your admin username"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition text-sm"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={form.adminPassword}
                                onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                                placeholder="••••••••"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 pr-11 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition text-sm"
                            />
                            <button type="button" onClick={() => setShowPass(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {showPass
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>}
                                </svg>
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading}
                        className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                        {isLoading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-slate-600 text-xs mt-6">
                    Super admin? <a href="/admin/login" className="text-teal-500 hover:text-teal-400 transition">Admin panel →</a>
                </p>
            </div>
        </div>
    );
}
