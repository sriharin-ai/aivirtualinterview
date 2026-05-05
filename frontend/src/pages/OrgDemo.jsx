import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const INTEREST_OPTIONS = [
    'College / University placement prep',
    'Corporate onboarding & readiness',
    'Coaching firm / Training institute',
    'Internal L&D / HR team',
    'Other',
];

const COUNTRIES = [
    'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Singapore',
    'UAE', 'Germany', 'France', 'Netherlands', 'Other',
];

const TEAM_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];

export default function OrgDemo() {
    const [form, setForm] = useState({
        name: '', email: '', company: '', country: '', phone: '',
        teamSize: '', interest: '', message: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

    const validate = () => {
        const e = {};
        if (!form.name.trim())    e.name    = 'Your name is required';
        if (!form.email.trim())   e.email   = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
        if (!form.company.trim()) e.company = 'Organization name is required';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/org-requests/demo`, form);
            setSubmitted(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
        setLoading(false);
    };

    if (submitted) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 bg-violet-500/10 border border-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <h2 className="text-2xl font-black text-white mb-3">Demo Request Sent!</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    Thanks, <strong className="text-white">{form.name}</strong>! We'll reach out to <strong className="text-white">{form.email}</strong> within 1 business day to schedule your personalized demo of AI Interviewer.
                </p>
                <div className="space-y-3">
                    <Link to="/" className="block w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl transition">Back to Home</Link>
                    <Link to="/org/signup" className="block w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-black rounded-xl transition">Self-serve sign up instead</Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Nav */}
            <nav className="border-b border-slate-800 px-4 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                        </div>
                        <span className="font-black text-sm tracking-tighter">AI <span className="text-teal-500">INT</span>erviewer</span>
                    </Link>
                    <Link to="/org/signup" className="text-xs text-slate-400 hover:text-white font-bold transition">Smaller org? Self-serve sign up →</Link>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    {/* Left — info */}
                    <div>
                        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                            Enterprise Demo
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-4">See AI Interviewer in action</h1>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">
                            Get a personalized walkthrough of the platform — tailored to your team size, org type, and use case. We'll show you exactly how AI Interviewer fits into your workflow.
                        </p>

                        <div className="space-y-5">
                            {[
                                { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', title: '30-minute live demo', desc: 'Personalized to your org type and goals — not a generic product tour.' },
                                { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Custom onboarding plan', desc: 'We map out the setup, rollout, and expected outcomes for your specific team.' },
                                { icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z', title: 'Dedicated support', desc: 'Premium and enterprise accounts get a dedicated point of contact from day one.' },
                                { icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', title: 'Flexible pricing', desc: 'We\'ll find the right plan for your org size — including annual billing and volume discounts.' },
                            ].map(i => (
                                <div key={i.title} className="flex gap-4">
                                    <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={i.icon}/></svg>
                                    </div>
                                    <div>
                                        <p className="font-black text-white text-sm">{i.title}</p>
                                        <p className="text-slate-400 text-xs leading-relaxed">{i.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Prefer self-serve?</p>
                            <p className="text-sm text-slate-400 mb-3">Smaller orgs can sign up instantly without a demo.</p>
                            <Link to="/org/signup" className="text-teal-400 text-sm font-black hover:underline">Self-serve org sign-up →</Link>
                        </div>
                    </div>

                    {/* Right — form */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <h2 className="text-lg font-black text-white mb-6">Book your demo</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Your Full Name" error={errors.name}>
                                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" className={Input(errors.name)}/>
                                </Field>
                                <Field label="Work Email" error={errors.email}>
                                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" className={Input(errors.email)}/>
                                </Field>
                            </div>
                            <Field label="Organization Name" error={errors.company}>
                                <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Corp / VIT University" className={Input(errors.company)}/>
                            </Field>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Country" error="">
                                    <select value={form.country} onChange={e => set('country', e.target.value)} className={Input('')}>
                                        <option value="">Select…</option>
                                        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </Field>
                                <Field label="Team Size" error="">
                                    <select value={form.teamSize} onChange={e => set('teamSize', e.target.value)} className={Input('')}>
                                        <option value="">Select…</option>
                                        {TEAM_SIZES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <Field label="I'm interested in…" error="">
                                <select value={form.interest} onChange={e => set('interest', e.target.value)} className={Input('')}>
                                    <option value="">Select…</option>
                                    {INTEREST_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Phone (optional)" error="">
                                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" className={Input('')}/>
                            </Field>
                            <Field label="Anything specific you'd like to see?" error="">
                                <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={3} placeholder="E.g. bulk user management, custom branding, analytics exports…" className={Input('')}/>
                            </Field>

                            <button type="submit" disabled={loading}
                                className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition shadow-xl shadow-violet-500/20 text-base active:scale-95 mt-2">
                                {loading ? 'Sending…' : 'Request My Demo →'}
                            </button>
                            <p className="text-xs text-center text-slate-500">We'll respond within 1 business day.</p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

const Input = (err) => `w-full bg-slate-800/60 border ${err ? 'border-red-500' : 'border-slate-700'} text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition`;

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
            {children}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );
}
