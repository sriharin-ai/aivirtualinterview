import { Link } from 'react-router-dom';
import { useState } from 'react';

const FEATURES = [
    { icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', title: 'Onboarding Readiness Goals', desc: 'Set target scores and deadlines for new hires. Track their pace automatically — on-track, at-risk, or achieved.' },
    { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', title: 'Manager Nudge System', desc: 'One click sends a personalized coaching email to employees who are behind on their readiness goals.' },
    { icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', title: 'Role-Specific Interview Prep', desc: 'AI generates questions for your exact roles — Product Manager, DevOps, Data Engineer, and 200+ more titles.' },
    { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Team-Wide Analytics', desc: 'See readiness scores, session counts, skill gaps, and goal status for every employee on one dashboard.' },
    { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', title: 'Internal Mobility Prep', desc: 'Employees preparing for internal role changes can practice at the right level — supported by their manager.' },
    { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', title: 'Automated Weekly Digests', desc: 'L&D managers receive automated summaries every week — no dashboards to check, no manual reporting.' },
];

const METRICS = [
    { value: '60%', label: 'Faster onboarding to productivity' },
    { value: '2×', label: 'More interview sessions per hire' },
    { value: '< 5 min', label: 'Manager setup per employee' },
    { value: '94%', label: 'New hire satisfaction rate' },
];

const STEPS = [
    { step: '01', title: 'Sign up your company', desc: 'Create a corporate org, set your plan, and get your org code — takes under 5 minutes.' },
    { step: '02', title: 'Add your employees', desc: 'Bulk-add new hires or share the org code for self-registration. Roles are assigned automatically.' },
    { step: '03', title: 'Set readiness goals', desc: 'Employees set a target score and deadline. You see their progress in real time on the Goals tab.' },
    { step: '04', title: 'Nudge and celebrate', desc: 'Nudge at-risk employees with one click. Celebrate when they hit their goal with a shareable certificate.' },
];

const USECASES = [
    { title: 'New hire onboarding', desc: 'Get new engineers, PMs, and analysts interview-ready for internal presentations and client meetings from day one.', tag: 'Onboarding' },
    { title: 'Internal mobility', desc: 'Support employees applying for promotions or lateral moves with role-specific prep at the right level.', tag: 'Career Growth' },
    { title: 'Coaching programs', desc: 'Coaching firms can run structured prep programs for multiple clients with full org-level analytics.', tag: 'Coaching' },
];

export default function CorporateLanding() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Nav */}
            <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                            <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                        </div>
                        <span className="font-black text-lg tracking-tighter">AI <span className="text-teal-500">INT</span>erviewer</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-6">
                        <Link to="/college" className="text-sm font-bold text-slate-400 hover:text-white transition">For Colleges</Link>
                        <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-white transition">Log In</Link>
                        <Link to="/org/demo" className="text-sm font-black bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-xl transition shadow-md shadow-violet-500/20">Book a Demo</Link>
                    </div>
                    <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>}
                        </svg>
                    </button>
                </div>
                {menuOpen && (
                    <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-6 space-y-4">
                        <Link to="/college" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-slate-300 py-2">For Colleges</Link>
                        <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-slate-300 py-2">Log In</Link>
                        <Link to="/org/demo" onClick={() => setMenuOpen(false)} className="block w-full text-center bg-violet-600 text-white font-black py-3 rounded-xl">Book a Demo</Link>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section className="relative overflow-hidden px-4 pt-24 pb-20 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent pointer-events-none"/>
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-3xl pointer-events-none"/>
                <div className="relative max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                        🏢 Built for Corporates & Coaching Firms
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tighter mb-6">
                        Onboard Faster.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-teal-400">Grow Your Team's Readiness.</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        AI Interviewer gives L&D teams and managers the tools to bring new hires up to speed faster, track readiness at scale, and keep employees growing — all in one platform.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/org/demo" className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-base transition shadow-xl shadow-violet-500/20 active:scale-95">
                            Book a Demo →
                        </Link>
                        <Link to="/org/signup" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black rounded-2xl text-base transition active:scale-95">
                            Self-Serve Sign Up
                        </Link>
                    </div>
                </div>
            </section>

            {/* Metrics */}
            <section className="px-4 py-10 max-w-4xl mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {METRICS.map(m => (
                        <div key={m.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 text-center">
                            <p className="text-3xl font-black text-violet-400 mb-1">{m.value}</p>
                            <p className="text-xs text-slate-400 font-bold leading-tight">{m.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Use cases */}
            <section className="px-4 py-16 max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <p className="text-xs font-black text-violet-400 uppercase tracking-widest mb-3">Use Cases</p>
                    <h2 className="text-3xl font-black text-white tracking-tighter">One platform, many use cases</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {USECASES.map(u => (
                        <div key={u.title} className="bg-slate-900/50 border border-slate-800 hover:border-violet-500/30 rounded-2xl p-6 transition-all">
                            <span className="text-xs font-black text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1 rounded-full">{u.tag}</span>
                            <h3 className="font-black text-white mt-4 mb-2">{u.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{u.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="px-4 py-20 max-w-6xl mx-auto">
                <div className="text-center mb-14">
                    <p className="text-xs font-black text-violet-400 uppercase tracking-widest mb-3">Features</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Built for modern L&D teams</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map(f => (
                        <div key={f.title} className="bg-slate-900/50 border border-slate-800 hover:border-violet-500/30 rounded-2xl p-6 transition-all group">
                            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition">
                                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={f.icon}/></svg>
                            </div>
                            <h3 className="font-black text-white mb-2">{f.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="px-4 py-20 bg-slate-900/30">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-xs font-black text-violet-400 uppercase tracking-widest mb-3">How It Works</p>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">From sign-up to readiness in 4 steps</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {STEPS.map(s => (
                            <div key={s.step} className="flex gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <span className="text-4xl font-black text-violet-500/30 shrink-0 leading-none">{s.step}</span>
                                <div>
                                    <h3 className="font-black text-white mb-1">{s.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="px-4 py-20">
                <div className="max-w-3xl mx-auto bg-gradient-to-r from-violet-500/10 to-teal-500/10 border border-violet-500/20 rounded-3xl p-12 text-center">
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-4">Start building a readiness-first culture</h2>
                    <p className="text-slate-400 mb-8 text-sm leading-relaxed">Talk to our team to see how AI Interviewer fits your onboarding and L&D workflow.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/org/demo" className="px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl transition shadow-xl shadow-violet-500/20">
                            Book a Demo →
                        </Link>
                        <Link to="/org/signup" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black rounded-2xl transition">
                            Self-Serve Sign Up
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 px-4 py-8 text-center">
                <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
                    <Link to="/" className="text-sm font-black text-slate-400 hover:text-white transition">← Back to Home</Link>
                    <p className="text-xs text-slate-600">© {new Date().getFullYear()} AI Interviewer. All rights reserved.</p>
                    <Link to="/college" className="text-sm font-bold text-slate-400 hover:text-white transition">For Colleges →</Link>
                </div>
            </footer>
        </div>
    );
}
