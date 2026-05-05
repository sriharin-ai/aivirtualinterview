import { Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useSelector } from 'react-redux';

const NAV_LINKS = [
    { label: 'For Colleges', to: '/college' },
    { label: 'For Corporates', to: '/corporate' },
    { label: 'Pricing', href: '#pricing' },
];

const FEATURES = [
    {
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
        title: 'AI-Powered Questions',
        desc: 'GPT-4o generates role-specific, level-calibrated questions for hundreds of job titles — fresh every session.',
    },
    {
        icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
        title: 'Voice & Code Interviews',
        desc: 'Answer verbally via Whisper transcription or tackle live coding challenges in a Monaco editor — just like real interviews.',
    },
    {
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        title: 'Deep Performance Analytics',
        desc: 'Score breakdowns, skill-gap radar charts, session history, and readiness trends — all in one dashboard.',
    },
    {
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        title: 'Team & Org Management',
        desc: 'Admins manage cohorts, track team readiness goals, set benchmarks, and nudge at-risk employees — all from one portal.',
    },
    {
        icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
        title: 'Readiness Goals & Certs',
        desc: 'Set target scores with deadlines, track pace, earn shareable certificates, and celebrate milestone badges.',
    },
    {
        icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
        title: 'Secure & Private',
        desc: 'JWT auth, Google OAuth, per-org data isolation, and role-based access controls keep your data safe.',
    },
];

const PLANS = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        color: 'border-slate-700',
        badge: null,
        features: ['5 sessions / month', 'AI question generation', 'Basic score report', 'B2C individual access'],
        cta: 'Get Started Free',
        ctaTo: '/register',
        ctaStyle: 'border border-slate-600 text-slate-300 hover:border-teal-500 hover:text-teal-400',
    },
    {
        name: 'Basic',
        price: '$29',
        period: 'per user / month',
        color: 'border-teal-500',
        badge: 'Most Popular',
        features: ['Unlimited sessions', 'Voice + Code interviews', 'Full analytics dashboard', 'Readiness goals & certs', 'Org admin portal', 'Up to 50 users'],
        cta: 'Start Free Trial',
        ctaTo: '/org/signup',
        ctaStyle: 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20',
    },
    {
        name: 'Premium',
        price: '$59',
        period: 'per user / month',
        color: 'border-violet-500',
        badge: 'Enterprise',
        features: ['Everything in Basic', 'Unlimited users', 'Manager goal assignment', 'Nudge email campaigns', 'Custom branding', 'Dedicated support', 'SLA guarantee'],
        cta: 'Request Demo',
        ctaTo: '/org/demo',
        ctaStyle: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20',
    },
];

const STATS = [
    { value: '50K+', label: 'Practice Sessions' },
    { value: '200+', label: 'Job Roles' },
    { value: '98%', label: 'User Satisfaction' },
    { value: '3×', label: 'Faster Interview Prep' },
];

const TESTIMONIALS = [
    { name: 'Priya S.', role: 'Software Engineer', text: 'I landed my dream job at a top tech company after 3 weeks of daily practice. The AI feedback is brutally honest in the best way.', avatar: 'P' },
    { name: 'Dr. Ramesh K.', role: 'Placement Head, VIT', text: 'Our campus placement rate jumped 40% after we rolled this out to our final-year students. The org dashboard is incredibly useful.', avatar: 'R' },
    { name: 'Sarah M.', role: 'L&D Manager, TechCorp', text: 'Onboarding new engineers used to take weeks. Now they\'re interview-ready in days. The readiness goals and nudge system is a game changer.', avatar: 'S' },
];

export default function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const { user } = useSelector((state) => state.auth);
    if (user) return <Navigate to="/dashboard" replace />;

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* ── Nav ── */}
            <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                            <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                            </svg>
                        </div>
                        <span className="font-black text-lg tracking-tighter">AI <span className="text-teal-500">INT</span>erviewer</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        {NAV_LINKS.map(l => l.href
                            ? <button key={l.label} onClick={() => scrollTo(l.href.slice(1))} className="text-sm font-bold text-slate-400 hover:text-white transition">{l.label}</button>
                            : <Link key={l.label} to={l.to} className="text-sm font-bold text-slate-400 hover:text-white transition">{l.label}</Link>
                        )}
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-white transition px-4 py-2">Log In</Link>
                        <Link to="/register" className="text-sm font-black bg-teal-500 hover:bg-teal-400 text-white px-5 py-2 rounded-xl transition shadow-md shadow-teal-500/20">Get Started Free</Link>
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
                        <Link to="/corporate" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-slate-300 py-2">For Corporates</Link>
                        <button onClick={() => scrollTo('pricing')} className="block text-sm font-bold text-slate-300 py-2">Pricing</button>
                        <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-slate-300 py-2">Log In</Link>
                        <Link to="/register" onClick={() => setMenuOpen(false)} className="block w-full text-center bg-teal-500 text-white font-black py-3 rounded-xl">Get Started Free</Link>
                    </div>
                )}
            </nav>

            {/* ── Hero ── */}
            <section className="relative overflow-hidden px-4 pt-24 pb-20 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent pointer-events-none"/>
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none"/>

                <div className="relative max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                        <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"/>
                        AI-Powered Interview Training Platform
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tighter mb-6">
                        Ace Your Next Interview<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-violet-400">with AI Coaching</span>
                    </h1>

                    <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Practice real interview questions, get instant AI feedback, track your readiness score, and land the job — whether you're a student, a new hire, or upskilling your whole team.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <Link to="/register" className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-black rounded-2xl text-base transition shadow-xl shadow-teal-500/20 active:scale-95">
                            Start Practicing Free →
                        </Link>
                        <Link to="/org/demo" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black rounded-2xl text-base transition active:scale-95">
                            Book a Demo
                        </Link>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
                        {STATS.map(s => (
                            <div key={s.label} className="text-center">
                                <p className="text-3xl font-black text-white">{s.value}</p>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Audience split ── */}
            <section className="px-4 py-16 max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-6">
                    <Link to="/college" className="group relative bg-gradient-to-br from-blue-500/10 to-teal-500/5 border border-blue-500/20 hover:border-blue-500/50 rounded-3xl p-8 transition-all">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">For Colleges & Universities 🎓</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">Boost placement rates with AI-powered campus interview prep. Track student readiness across cohorts, generate placement reports, and give every student a fair shot.</p>
                        <span className="text-blue-400 text-sm font-black group-hover:underline">Learn more →</span>
                    </Link>

                    <Link to="/corporate" className="group relative bg-gradient-to-br from-violet-500/10 to-teal-500/5 border border-violet-500/20 hover:border-violet-500/50 rounded-3xl p-8 transition-all">
                        <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">For Corporates & Coaching 🏢</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">Onboard new hires faster, prepare employees for internal moves, and track team-wide readiness goals. Managers get a real-time dashboard with nudge controls.</p>
                        <span className="text-violet-400 text-sm font-black group-hover:underline">Learn more →</span>
                    </Link>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="px-4 py-20 max-w-6xl mx-auto">
                <div className="text-center mb-14">
                    <p className="text-xs font-black text-teal-400 uppercase tracking-widest mb-3">Everything You Need</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Built for serious interview prep</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map(f => (
                        <div key={f.title} className="bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all group">
                            <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-500/20 transition">
                                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={f.icon}/>
                                </svg>
                            </div>
                            <h3 className="font-black text-white mb-2">{f.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="px-4 py-20 bg-slate-900/30">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <p className="text-xs font-black text-teal-400 uppercase tracking-widest mb-3">What People Say</p>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Trusted by students, colleges & companies</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {TESTIMONIALS.map(t => (
                            <div key={t.name} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <p className="text-slate-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center font-black text-sm">{t.avatar}</div>
                                    <div>
                                        <p className="font-black text-white text-sm">{t.name}</p>
                                        <p className="text-xs text-slate-500">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section id="pricing" className="px-4 py-20 max-w-6xl mx-auto">
                <div className="text-center mb-14">
                    <p className="text-xs font-black text-teal-400 uppercase tracking-widest mb-3">Simple Pricing</p>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Start free. Scale when you're ready.</h2>
                    <p className="text-slate-400 mt-3 text-sm">No credit card required to get started.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 items-start">
                    {PLANS.map(p => (
                        <div key={p.name} className={`relative bg-slate-900 border-2 ${p.color} rounded-3xl p-8`}>
                            {p.badge && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-black px-4 py-1 rounded-full">
                                    {p.badge}
                                </div>
                            )}
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{p.name}</p>
                            <div className="flex items-end gap-1 mb-1">
                                <span className="text-4xl font-black text-white">{p.price}</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-6">{p.period}</p>
                            <ul className="space-y-3 mb-8">
                                {p.features.map(f => (
                                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                                        <svg className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link to={p.ctaTo} className={`block text-center font-black py-3 rounded-xl text-sm transition ${p.ctaStyle}`}>
                                {p.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="px-4 py-20">
                <div className="max-w-3xl mx-auto bg-gradient-to-r from-teal-500/10 to-violet-500/10 border border-teal-500/20 rounded-3xl p-12 text-center">
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-4">Ready to get started?</h2>
                    <p className="text-slate-400 mb-8 text-sm leading-relaxed">Join thousands of students and professionals who practice smarter with AI-driven feedback.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/register" className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-black rounded-2xl transition shadow-xl shadow-teal-500/20">
                            Start Free →
                        </Link>
                        <Link to="/org/signup" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black rounded-2xl transition">
                            Sign Up Your Org
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-slate-800 px-4 py-10">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                        </div>
                        <span className="font-black text-sm text-white tracking-tighter">AI <span className="text-teal-500">INT</span>erviewer</span>
                    </div>
                    <div className="flex gap-6 text-xs text-slate-500">
                        <Link to="/college" className="hover:text-slate-300 transition">For Colleges</Link>
                        <Link to="/corporate" className="hover:text-slate-300 transition">For Corporates</Link>
                        <Link to="/org/signup" className="hover:text-slate-300 transition">Org Sign Up</Link>
                        <Link to="/org/demo" className="hover:text-slate-300 transition">Book Demo</Link>
                    </div>
                    <p className="text-xs text-slate-600">© {new Date().getFullYear()} AI Interviewer. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
