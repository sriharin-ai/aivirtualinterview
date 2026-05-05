import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const PLANS = [
    { id: 'basic', label: 'Basic', price: '$29/user/mo', desc: 'Up to 50 users', color: 'border-teal-500 bg-teal-500/5' },
    { id: 'premium', label: 'Premium', price: '$59/user/mo', desc: 'Unlimited users + priority support', color: 'border-violet-500 bg-violet-500/5' },
];

const COUNTRIES = [
    'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Singapore',
    'UAE', 'Germany', 'France', 'Netherlands', 'Other',
];

export default function OrgSignup() {
    const [form, setForm] = useState({
        orgName: '', orgType: 'college', country: '', contactEmail: '',
        adminName: '', phone: '', plan: 'basic', teamSize: '', message: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

    const validate = () => {
        const e = {};
        if (!form.orgName.trim())     e.orgName      = 'Organization name is required';
        if (!form.contactEmail.trim()) e.contactEmail = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) e.contactEmail = 'Enter a valid email';
        if (!form.adminName.trim())   e.adminName    = 'Contact name is required';
        if (!form.country)            e.country      = 'Please select a country';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/org-requests`, form);
            setSubmitted(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
        setLoading(false);
    };

    if (submitted) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <h2 className="text-2xl font-black text-white mb-3">Request Received!</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    Thanks, <strong className="text-white">{form.adminName}</strong>! We've received your sign-up request for <strong className="text-white">{form.orgName}</strong>. Our team will review it and send your org credentials to <strong className="text-white">{form.contactEmail}</strong> within 24 hours.
                </p>
                <div className="space-y-3">
                    <Link to="/" className="block w-full py-3 bg-teal-500 hover:bg-teal-400 text-white font-black rounded-xl transition">Back to Home</Link>
                    <Link to="/org/demo" className="block w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-black rounded-xl transition">Also book a demo</Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Nav */}
            <nav className="border-b border-slate-800 px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                        </div>
                        <span className="font-black text-sm tracking-tighter">AI <span className="text-teal-500">INT</span>erviewer</span>
                    </Link>
                    <Link to="/org/demo" className="text-xs text-slate-400 hover:text-white font-bold transition">Need enterprise? Book a demo →</Link>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4">
                        Self-Serve Org Sign Up
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3">Set Up Your Organization</h1>
                    <p className="text-slate-400 text-sm">Fill in the form below. We'll review your request and send your org credentials within 24 hours.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Org type */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Organization Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[{ id: 'college', label: '🎓 College / University' }, { id: 'corporate', label: '🏢 Corporate / Coaching' }].map(t => (
                                <button type="button" key={t.id} onClick={() => set('orgType', t.id)}
                                    className={`py-3 px-4 rounded-xl border-2 text-sm font-black transition ${form.orgType === t.id ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Plan */}
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Plan</label>
                        <div className="grid grid-cols-2 gap-3">
                            {PLANS.map(p => (
                                <button type="button" key={p.id} onClick={() => set('plan', p.id)}
                                    className={`py-4 px-4 rounded-xl border-2 text-left transition ${form.plan === p.id ? p.color : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                                    <p className="font-black text-white text-sm">{p.label}</p>
                                    <p className="text-xs text-slate-400">{p.price}</p>
                                    <p className="text-xs text-slate-500">{p.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fields */}
                    <div className="space-y-4">
                        <Field label="Organization Name" error={errors.orgName}>
                            <input value={form.orgName} onChange={e => set('orgName', e.target.value)} placeholder="e.g. VIT University / Acme Corp" className={Input(errors.orgName)}/>
                        </Field>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Your Full Name" error={errors.adminName}>
                                <input value={form.adminName} onChange={e => set('adminName', e.target.value)} placeholder="Placement coordinator / HR Manager" className={Input(errors.adminName)}/>
                            </Field>
                            <Field label="Contact Email" error={errors.contactEmail}>
                                <input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="you@org.com" className={Input(errors.contactEmail)}/>
                            </Field>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Country" error={errors.country}>
                                <select value={form.country} onChange={e => set('country', e.target.value)} className={Input(errors.country)}>
                                    <option value="">Select country…</option>
                                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </Field>
                            <Field label="Expected Team Size" error="">
                                <input type="number" value={form.teamSize} onChange={e => set('teamSize', e.target.value)} placeholder="e.g. 200" min="1" className={Input('')}/>
                            </Field>
                        </div>
                        <Field label="Phone (optional)" error="">
                            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" className={Input('')}/>
                        </Field>
                        <Field label="Anything else we should know? (optional)" error="">
                            <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} placeholder="Specific requirements, custom branding, integration needs…" className={Input('')}/>
                        </Field>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition shadow-xl shadow-teal-500/20 text-base active:scale-95">
                        {loading ? 'Submitting…' : 'Submit Sign-Up Request →'}
                    </button>

                    <p className="text-center text-xs text-slate-500">
                        Need enterprise features or a custom contract?{' '}
                        <Link to="/org/demo" className="text-violet-400 hover:text-violet-300 font-bold">Book a demo instead →</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

const Input = (err) => `w-full bg-slate-800/60 border ${err ? 'border-red-500' : 'border-slate-700'} text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition`;

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
            {children}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );
}
