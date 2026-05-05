import { Link } from 'react-router-dom';
import { useState } from 'react';

const FEATURES = [
    { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', title: 'Curriculum-Aligned Questions', desc: 'AI generates questions mapped to your students\' majors, tech stacks, and target companies — not generic question banks.' },
    { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', title: 'Cohort Management', desc: 'Add students in bulk with a single CSV, assign org codes by batch or department, and manage the whole cohort from one dashboard.' },
    { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Placement Analytics', desc: 'Track readiness scores, session completion rates, top-performing students, and skill-gap heatmaps across your entire batch.' },
    { icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', title: 'Shareable Certificates', desc: 'Students earn LinkedIn-shareable readiness certificates — a tangible credential that helps them stand out to recruiters.' },
    { icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', title: 'Voice & Code Practice', desc: 'Students practice verbal answers (Whisper transcription) and live coding problems — exactly the formats top companies use.' },
    { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', title: 'Weekly Progress Digests', desc: 'Placement coordinators get automated weekly email digests with cohort-level progress summaries — no manual reporting.' },
];

const METRICS = [
    { value: '40%', label: 'Avg. placement rate increase' },
    { value: '3×', label: 'More sessions per student' },
    { value: '< 1 hr', label: 'Setup time for 500 students' },
    { value: '92%', label: 'Student satisfaction score' },
];

const STEPS = [
    { step: '01', title: 'Create your org', desc: 'Sign up, choose College plan, and get your unique org code in minutes.' },
    { step: '02', title: 'Add students', desc: 'Bulk import via CSV or share the org code so students self-register.' },
    { step: '03', title: 'Students practice', desc: 'Each student gets personalized AI interview sessions and instant feedback.' },
    { step: '04', title: 'You track & report', desc: 'Monitor readiness from your admin dashboard. Export placement reports anytime.' },
];

export default function CollegeLanding() {
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
                        <Link to="/corporate" className="text-sm font-bold text-slate-400 hover:text-white transition">For Corporates</Link>
                        <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-white transition">Log In</Link>
                        <Link to="/org/signup" className="text-sm font-black bg-blue-500 hover:bg-blue-400 text-white px-5 py-2 rounded-xl transition shadow-md shadow-blue-500/20">Get Started</Link>
                    </div>
                    <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>}
                        </svg>
                    </button>
                </div>
                {menuOpen && (
                    <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-6 space-y-4">
                        <Link to="/corporate" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-slate-300 py-2">For Corporates</Link>
                        <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-slate-300 py-2">Log In</Link>
                        <Link to="/org/signup" onClick={() => setMenuOpen(false)} className="block w-full text-center bg-blue-500 text-white font-black py-3 rounded-xl">Get Started</Link>
                    </div>
                )}
            </nav>

            {/* Hero */}
            <section className="relative overflow-hidden px-4 pt-24 pb-20 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none"/>
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"/>
                <div className="relative max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                        🎓 Built for Colleges & Universities
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tighter mb-6">
                        Turn Every Student Into<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">an Interview-Ready Graduate</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Give your placement cell an AI-powered edge. AI Interviewer helps students practice smarter, placement teams track readiness at scale, and institutions hit placement targets consistently.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/org/signup" className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-2xl text-base transition shadow-xl shadow-blue-500/20 active:scale-95">
                            Set Up Your College →
                        </Link>
                        <Link to="/org/demo" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black rounded-2xl text-base transition active:scale-95">
                            Request a Demo
                        </Link>
                    </div>
                </div>
            </section>

            {/* Metrics */}
            <section className="px-4 py-10 max-w-4xl mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {METRICS.map(m => (
                        <div key={m.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 text-center">
                            <p className="text-3xl font-black text-blue-400 mb-1">{m.value}</p>
                            <p className="text-xs text-slate-400 font-bold leading-tight">{m.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="px-4 py-20 max-w-6xl mx-auto">
                <div className="text-center mb-14">
                    <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">Features</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Everything your placement cell needs</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map(f => (
                        <div key={f.title} className="bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 rounded-2xl p-6 transition-all group">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={f.icon}/></svg>
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
                        <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">How It Works</p>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Up and running in under an hour</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {STEPS.map(s => (
                            <div key={s.step} className="flex gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <span className="text-4xl font-black text-blue-500/30 shrink-0 leading-none">{s.step}</span>
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
                <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-500/10 to-teal-500/10 border border-blue-500/20 rounded-3xl p-12 text-center">
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-4">Ready to boost your placement numbers?</h2>
                    <p className="text-slate-400 mb-8 text-sm leading-relaxed">Join leading institutions using AI Interviewer to prepare students for the real world.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/org/signup" className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-2xl transition shadow-xl shadow-blue-500/20">
                            Sign Up Your College →
                        </Link>
                        <Link to="/org/demo" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black rounded-2xl transition">
                            Talk to Sales
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 px-4 py-8 text-center">
                <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
                    <Link to="/" className="text-sm font-black text-slate-400 hover:text-white transition">← Back to Home</Link>
                    <p className="text-xs text-slate-600">© {new Date().getFullYear()} AI Interviewer. All rights reserved.</p>
                    <Link to="/corporate" className="text-sm font-bold text-slate-400 hover:text-white transition">For Corporates →</Link>
                </div>
            </footer>
        </div>
    );
}
