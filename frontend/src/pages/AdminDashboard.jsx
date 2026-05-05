import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    adminLogout,
    fetchRoles, createRole, updateRole, deleteRole,
    fetchSkills, createSkill, updateSkill, deleteSkill,
    fetchQuestions, createQuestion, updateQuestion, deleteQuestion, generateQuestions,
    fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
    fetchAnalytics,
    fetchOrganizations, createOrganization, updateOrganization, deleteOrganization,
    fetchStudents, fetchStudentSessions,
    seedDefaults,
} from '../features/admin/adminSlice';

const TABS = [
    { id: 'analytics',  label: 'Analytics',   icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'orgs',       label: 'Organizations', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'students',   label: 'Students',     icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'roles',      label: 'Roles & Levels', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'skills',     label: 'Skills',       icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { id: 'questions',  label: 'Question Bank', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'generate',   label: 'Generate Qs',  icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'templates',  label: 'Templates',    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'config',     label: 'Q Config',     icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const Q_TYPES = ['oral', 'coding'];
const INTERVIEW_TYPES = ['coding-mix', 'oral-only'];
const DEFAULT_LEVELS = ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Staff'];

const SEED_ROLE_NAMES = new Set([
    'MERN Stack Developer', 'MEAN Stack Developer', 'Full Stack Python', 'Full Stack Java',
    'Frontend Developer', 'Backend Developer', 'Data Scientist', 'Data Analyst',
    'Machine Learning Engineer', 'DevOps Engineer', 'Cloud Engineer (AWS/Azure/GCP)',
    'Cybersecurity Engineer', 'Blockchain Developer', 'Mobile Developer (iOS/Android)',
    'Game Developer', 'UI/UX Designer', 'QA Automation Engineer', 'Product Manager',
]);

// Which seed roles are oral-only — used to show the correct badge before DB loads hasCoding
const SEED_ORAL_ONLY = new Set(['UI/UX Designer', 'Product Manager']);

const StatCard = ({ label, value, sub, color = 'teal' }) => {
    const colors = { teal: 'from-teal-500/20 to-teal-500/5 border-teal-500/30 text-teal-400', blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400', purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400', amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400', violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400', green: 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-400' };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">{label}</p>
            <p className={`text-3xl font-black mt-1 ${colors[color].split(' ')[3]}`}>{value}</p>
            {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
    );
};

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
                <h3 className="font-black text-white uppercase tracking-tight">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

const InputField = ({ label, ...props }) => (
    <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
        <input className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm transition" {...props} />
    </div>
);

const SelectField = ({ label, children, ...props }) => (
    <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
        <select className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm transition" {...props}>{children}</select>
    </div>
);

const TextareaField = ({ label, ...props }) => (
    <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
        <textarea rows={3} className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm transition resize-none" {...props} />
    </div>
);

const Btn = ({ children, variant = 'primary', className = '', ...props }) => {
    const v = { primary: 'bg-teal-500 hover:bg-teal-400 text-slate-900', danger: 'bg-rose-600 hover:bg-rose-500 text-white', ghost: 'bg-slate-700 hover:bg-slate-600 text-white', outline: 'border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white' };
    return <button className={`inline-flex items-center gap-2 font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${className}`} {...props}>{children}</button>;
};

const confirmDelete = (name) => window.confirm(`Delete "${name}"? This cannot be undone.`);

// ─── ORGANIZATIONS TAB ────────────────────────────────────────────────────────
const COUNTRIES = [
    'India','United States','United Kingdom','Canada','Australia','Germany',
    'Singapore','United Arab Emirates','Saudi Arabia','Malaysia','Philippines',
    'Bangladesh','Pakistan','Sri Lanka','Nepal','South Africa','Nigeria',
    'Kenya','Ghana','Brazil','Mexico','France','Netherlands','Sweden',
    'New Zealand','Ireland','Japan','South Korea','China','Other',
];

const PLANS = ['free', 'basic', 'premium'];

const EMPTY_ORG_FORM = {
    name: '', type: 'college', country: 'India', orgCode: '',
    adminUsername: '', adminPassword: '', contactEmail: '',
    plan: 'free', description: '', maxUsers: 100, isActive: true,
};

function OrganizationsTab() {
    const dispatch = useDispatch();
    const { organizations, isLoading } = useSelector(s => s.admin);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(EMPTY_ORG_FORM);
    const [showPass, setShowPass] = useState(false);
    const [filter, setFilter] = useState({ search: '', type: 'all', plan: 'all' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { dispatch(fetchOrganizations()); }, [dispatch]);

    const genCode = (name) => name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ORG';

    const openCreate = () => {
        setForm(EMPTY_ORG_FORM);
        setShowPass(false);
        setModal('create');
    };
    const openEdit = (org) => {
        setForm({
            name: org.name, type: org.type, country: org.country || '',
            orgCode: org.orgCode, adminUsername: org.adminUsername,
            adminPassword: '', contactEmail: org.contactEmail || '',
            plan: org.plan, description: org.description || '',
            maxUsers: org.maxUsers || 100, isActive: org.isActive ?? true,
        });
        setShowPass(false);
        setModal({ type: 'edit', id: org._id });
    };

    const handleSave = async () => {
        setSaving(true);
        const body = { ...form };
        if (modal === 'create') {
            const res = await dispatch(createOrganization(body));
            if (!res.error) { toast.success(`${form.type === 'college' ? '🎓' : '🏢'} Organization created!`); setModal(null); }
            else toast.error(res.payload);
        } else {
            if (!body.adminPassword) delete body.adminPassword;
            const res = await dispatch(updateOrganization({ id: modal.id, body }));
            if (!res.error) { toast.success('Organization updated!'); setModal(null); }
            else toast.error(res.payload);
        }
        setSaving(false);
    };

    const handleDelete = async (org) => {
        if (!window.confirm(`Delete "${org.name}"? This will not delete their users but they'll lose access.`)) return;
        const res = await dispatch(deleteOrganization(org._id));
        if (!res.error) toast.success('Organization deleted.');
        else toast.error(res.payload);
    };

    const filtered = organizations.filter(o => {
        if (filter.type !== 'all' && o.type !== filter.type) return false;
        if (filter.plan !== 'all' && o.plan !== filter.plan) return false;
        if (filter.search) {
            const q = filter.search.toLowerCase();
            if (!o.name?.toLowerCase().includes(q) && !o.orgCode?.toLowerCase().includes(q) && !o.country?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const colleges   = organizations.filter(o => o.type === 'college').length;
    const corporates = organizations.filter(o => o.type === 'corporate').length;
    const active     = organizations.filter(o => o.isActive).length;
    const isFiltered = filter.search || filter.type !== 'all' || filter.plan !== 'all';

    const planColor = { free: 'bg-slate-700 text-slate-400', basic: 'bg-blue-500/10 text-blue-400', premium: 'bg-violet-500/10 text-violet-400' };

    return (
        <div className="space-y-5">
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total Orgs',   value: organizations.length, color: 'teal' },
                    { label: '🎓 Colleges',   value: colleges,             color: 'blue' },
                    { label: '🏢 Corporates', value: corporates,           color: 'violet' },
                    { label: 'Active',        value: active,               color: 'green' },
                ].map(({ label, value, color }) => (
                    <StatCard key={label} label={label} value={value} color={color} />
                ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-slate-400 text-sm">
                    {isFiltered
                        ? <><span className="text-white font-bold">{filtered.length}</span> of {organizations.length} organizations</>
                        : <><span className="text-white font-bold">{organizations.length}</span> organizations</>}
                </p>
                <Btn onClick={openCreate}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                    Add Organization
                </Btn>
            </div>

            {/* Filter bar */}
            {organizations.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[160px] max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" placeholder="Search name, code, country…" value={filter.search}
                            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
                        {[{ key: 'all', label: 'All' }, { key: 'college', label: '🎓 College' }, { key: 'corporate', label: '🏢 Corporate' }].map(({ key, label }) => (
                            <button key={key} onClick={() => setFilter(f => ({ ...f, type: key }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filter.type === key ? 'bg-teal-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
                        {[{ key: 'all', label: 'All Plans' }, { key: 'free', label: 'Free' }, { key: 'basic', label: 'Basic' }, { key: 'premium', label: 'Premium' }].map(({ key, label }) => (
                            <button key={key} onClick={() => setFilter(f => ({ ...f, plan: key }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filter.plan === key ? 'bg-violet-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {isFiltered && (
                        <button onClick={() => setFilter({ search: '', type: 'all', plan: 'all' })}
                            className="text-xs text-slate-500 hover:text-slate-300 font-bold transition underline underline-offset-2">Clear</button>
                    )}
                </div>
            )}

            {/* List */}
            {isLoading && organizations.length === 0 ? (
                <div className="text-center py-16 text-slate-500">Loading…</div>
            ) : filtered.length === 0 && organizations.length > 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <p className="font-bold text-slate-400 mb-1">No organizations match your filters</p>
                    <button onClick={() => setFilter({ search: '', type: 'all', plan: 'all' })} className="text-sm text-teal-400 hover:text-teal-300 transition">Clear filters</button>
                </div>
            ) : organizations.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <p className="text-slate-400 font-bold mb-1">No organizations yet</p>
                    <p className="text-sm">Add your first college or corporate organization to get started.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map(org => (
                        <div key={org._id} className={`border rounded-2xl p-4 transition-all hover:border-slate-600 ${org.isActive ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-800/20 border-slate-700/30 opacity-70'}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    {/* Name + badges */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg">{org.type === 'college' ? '🎓' : '🏢'}</span>
                                        <h3 className="font-black text-white">{org.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${org.isActive ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                                            {org.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${planColor[org.plan]}`}>{org.plan}</span>
                                        {org.type === 'college' && org.country && (
                                            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400">{org.country}</span>
                                        )}
                                    </div>
                                    {org.description && <p className="text-slate-400 text-sm mt-1">{org.description}</p>}
                                    {/* Details row */}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                        <span className="text-xs text-slate-500">
                                            Code: <span className="font-mono font-bold text-teal-400">{org.orgCode}</span>
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            Admin: <span className="text-slate-300 font-bold">{org.adminUsername}</span>
                                        </span>
                                        {org.contactEmail && (
                                            <span className="text-xs text-slate-500">
                                                Contact: <span className="text-slate-300">{org.contactEmail}</span>
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-500">
                                            Max users: <span className="text-slate-300 font-bold">{org.maxUsers}</span>
                                        </span>
                                    </div>
                                    {/* User / session counts */}
                                    <div className="flex gap-3 mt-2">
                                        <span className="text-xs bg-slate-700/60 px-2 py-0.5 rounded-full text-slate-300">
                                            <span className="font-bold">{org.userCount || 0}</span> users
                                        </span>
                                        <span className="text-xs bg-slate-700/60 px-2 py-0.5 rounded-full text-slate-300">
                                            <span className="font-bold">{org.sessionCount || 0}</span> sessions
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Btn variant="ghost" onClick={() => openEdit(org)}>Edit</Btn>
                                    <Btn variant="danger" onClick={() => handleDelete(org)}>Del</Btn>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {modal && (
                <Modal title={modal === 'create' ? 'Add Organization' : 'Edit Organization'} onClose={() => setModal(null)}>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                        {/* Type toggle */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Organization Type</label>
                            <div className="flex gap-2">
                                {['college', 'corporate'].map(t => (
                                    <button key={t} type="button"
                                        onClick={() => setForm(f => ({ ...f, type: t }))}
                                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all ${form.type === t ? (t === 'college' ? 'bg-blue-500/10 border-blue-500/40 text-blue-300' : 'bg-violet-500/10 border-violet-500/40 text-violet-300') : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                                        {t === 'college' ? '🎓 College' : '🏢 Corporate'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <InputField label="Organization Name" value={form.name}
                            onChange={e => {
                                const name = e.target.value;
                                setForm(f => ({ ...f, name, orgCode: f.orgCode || genCode(name) }));
                            }}
                            placeholder="e.g. MIT College of Engineering" />

                        {/* Org Code */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Org Code <span className="text-slate-600 normal-case font-normal">(students use this to register)</span></label>
                            <div className="flex gap-2">
                                <input type="text" value={form.orgCode}
                                    onChange={e => setForm(f => ({ ...f, orgCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                                    maxLength={10}
                                    placeholder="e.g. MIT001"
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono text-teal-300 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                                <button type="button" onClick={() => setForm(f => ({ ...f, orgCode: genCode(f.name) }))}
                                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition">Auto</button>
                            </div>
                        </div>

                        {/* Country — college only */}
                        {form.type === 'college' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Country <span className="text-slate-600 normal-case font-normal">(drives subject catalog)</span></label>
                                <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition">
                                    <option value="">Select country…</option>
                                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        )}

                        <TextareaField label="Description (optional)" value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Brief description of the organization" />

                        {/* Admin credentials */}
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 space-y-3">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Org Admin Credentials</p>
                            <InputField label="Admin Username" value={form.adminUsername}
                                onChange={e => setForm(f => ({ ...f, adminUsername: e.target.value }))}
                                placeholder="e.g. mit_admin" />
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                                    Admin Password {modal !== 'create' && <span className="text-slate-600 normal-case font-normal">(leave blank to keep current)</span>}
                                </label>
                                <div className="relative">
                                    <input type={showPass ? 'text' : 'password'} value={form.adminPassword}
                                        onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                                        placeholder={modal === 'create' ? 'Set a strong password' : '••••••••'}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
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
                        </div>

                        <InputField label="Contact Email" value={form.contactEmail}
                            onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                            placeholder="billing or admin contact email" />

                        {/* Plan + Max users */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Plan</label>
                                <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition capitalize">
                                    {PLANS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Max Users</label>
                                <input type="number" min={1} max={10000} value={form.maxUsers}
                                    onChange={e => setForm(f => ({ ...f, maxUsers: Number(e.target.value) }))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition" />
                            </div>
                        </div>

                        {/* Active toggle */}
                        {modal !== 'create' && (
                            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3 transition-all ${form.isActive ? 'border-green-500/40 bg-green-500/10' : 'border-slate-600 bg-slate-800'}`}>
                                <span className={`w-9 h-5 rounded-full flex items-center transition-all ${form.isActive ? 'bg-green-500' : 'bg-slate-600'}`}>
                                    <span className={`w-4 h-4 rounded-full bg-white shadow transition-all ${form.isActive ? 'ml-[18px]' : 'ml-0.5'}`} />
                                </span>
                                <span className={`text-sm font-bold ${form.isActive ? 'text-green-300' : 'text-slate-400'}`}>
                                    {form.isActive ? 'Active — org can log in' : 'Inactive — access suspended'}
                                </span>
                            </button>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn className="flex-1" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : modal === 'create' ? 'Create Organization' : 'Save Changes'}
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─── STUDENTS TAB ─────────────────────────────────────────────────────────────
function StudentsTab() {
    const dispatch = useDispatch();
    const { students, studentSessions, isLoading } = useSelector(s => s.admin);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('lastActive');
    const [attentionFilter, setAttentionFilter] = useState('all');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [sessionModalOpen, setSessionModalOpen] = useState(false);

    useEffect(() => { dispatch(fetchStudents()); }, [dispatch]);

    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const needsAttention = (s) => {
        const inactive = !s.lastActive
            ? (Date.now() - new Date(s.createdAt) > SEVEN_DAYS)
            : (Date.now() - new Date(s.lastActive) > SEVEN_DAYS);
        const lowScore = s.totalSessions > 0 && s.avgScore != null && s.avgScore < 40;
        return inactive || lowScore;
    };
    const attentionReasons = (s) => {
        const reasons = [];
        const inactive = !s.lastActive
            ? (Date.now() - new Date(s.createdAt) > SEVEN_DAYS)
            : (Date.now() - new Date(s.lastActive) > SEVEN_DAYS);
        if (!s.lastActive && inactive) reasons.push('Never practiced');
        else if (inactive) reasons.push('Inactive 7+ days');
        if (s.totalSessions > 0 && s.avgScore != null && s.avgScore < 40) reasons.push(`Low avg score (${Math.round(s.avgScore)}%)`);
        return reasons;
    };

    const attentionCount = students.filter(needsAttention).length;

    const openSessionModal = async (student) => {
        setSelectedStudent(student);
        setSessionModalOpen(true);
        await dispatch(fetchStudentSessions(student._id));
    };

    const closeSessionModal = () => { setSessionModalOpen(false); setSelectedStudent(null); };

    const filtered = students
        .filter(s => {
            if (attentionFilter === 'attention' && !needsAttention(s)) return false;
            if (!search) return true;
            const q = search.toLowerCase();
            return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.preferredRole?.toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (sortBy === 'lastActive') return (new Date(b.lastActive || 0)) - (new Date(a.lastActive || 0));
            if (sortBy === 'avgScore') return (b.avgScore || 0) - (a.avgScore || 0);
            if (sortBy === 'sessions') return (b.totalSessions || 0) - (a.totalSessions || 0);
            if (sortBy === 'name') return a.name?.localeCompare(b.name);
            return 0;
        });

    const scoreColor = (score) => {
        if (score == null) return 'text-slate-500';
        if (score >= 70) return 'text-green-400';
        if (score >= 40) return 'text-amber-400';
        return 'text-rose-400';
    };
    const scoreBg = (score) => {
        if (score == null) return 'bg-slate-700/60 text-slate-500';
        if (score >= 70) return 'bg-green-500/10 text-green-400';
        if (score >= 40) return 'bg-amber-500/10 text-amber-400';
        return 'bg-rose-500/10 text-rose-400';
    };
    const statusBadge = (status) => {
        const map = { completed: 'bg-green-500/10 text-green-400', 'in-progress': 'bg-blue-500/10 text-blue-400', failed: 'bg-rose-500/10 text-rose-400', pending: 'bg-slate-700 text-slate-400' };
        return map[status] || 'bg-slate-700 text-slate-400';
    };
    const timeAgo = (date) => {
        if (!date) return 'Never';
        const s = Math.floor((Date.now() - new Date(date)) / 1000);
        if (s < 60) return 'Just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <p className="text-slate-400 text-sm">
                        <span className="text-white font-bold">{students.length}</span> registered students
                    </p>
                    {attentionCount > 0 && (
                        <button
                            onClick={() => setAttentionFilter(f => f === 'attention' ? 'all' : 'attention')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black border transition-all ${attentionFilter === 'attention' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'}`}
                        >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                            {attentionCount} need{attentionCount === 1 ? 's' : ''} attention
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input
                            type="text"
                            placeholder="Search name, email, role…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition w-56"
                        />
                    </div>
                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition"
                    >
                        <option value="lastActive">Most Recent</option>
                        <option value="avgScore">Best Score</option>
                        <option value="sessions">Most Sessions</option>
                        <option value="name">Name A–Z</option>
                    </select>
                </div>
            </div>

            {isLoading && students.length === 0 ? (
                <div className="text-center py-20 text-slate-500">Loading students…</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    {attentionFilter === 'attention' ? (
                        <><p className="font-bold text-slate-400 mb-1">All students are on track</p><button onClick={() => setAttentionFilter('all')} className="text-sm text-teal-400 hover:text-teal-300 transition">View all students</button></>
                    ) : search ? 'No students match your search.' : 'No students registered yet.'}
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map(student => {
                        const flagged = needsAttention(student);
                        const reasons = flagged ? attentionReasons(student) : [];
                        return (
                        <div key={student._id} className={`border rounded-2xl p-4 flex items-center gap-4 transition-all ${flagged ? 'bg-amber-500/5 border-amber-500/25 hover:border-amber-500/40' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'}`}>
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 relative ${flagged ? 'bg-gradient-to-br from-amber-500/20 to-rose-500/20 border-amber-500/30' : 'bg-gradient-to-br from-teal-500/30 to-blue-500/30 border-teal-500/20'}`}>
                                <span className={`font-black text-sm ${flagged ? 'text-amber-300' : 'text-teal-300'}`}>{student.name?.[0]?.toUpperCase() || '?'}</span>
                                {flagged && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                                        <svg className="w-2.5 h-2.5 text-slate-900" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                    </span>
                                )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-black text-white text-sm">{student.name}</p>
                                    {student.googleId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">Google</span>}
                                    {reasons.map(r => (
                                        <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/20">{r}</span>
                                    ))}
                                </div>
                                <p className="text-slate-500 text-xs truncate">{student.email}</p>
                                <p className="text-slate-400 text-xs mt-0.5">
                                    {student.lastRole || student.preferredRole || '—'}
                                    {student.lastActive && <span className="text-slate-600 ml-2">· {timeAgo(student.lastActive)}</span>}
                                    {!student.lastActive && <span className="text-slate-600 ml-2">· joined {timeAgo(student.createdAt)}</span>}
                                </p>
                            </div>
                            {/* Stats */}
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-center hidden sm:block">
                                    <p className="text-white font-black text-lg leading-none">{student.totalSessions || 0}</p>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mt-0.5">Sessions</p>
                                </div>
                                <div className="text-center hidden sm:block">
                                    <p className="text-slate-300 font-black text-lg leading-none">{student.completedSessions || 0}</p>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mt-0.5">Done</p>
                                </div>
                                <div className="text-center">
                                    <p className={`font-black text-lg leading-none ${scoreColor(student.avgScore)}`}>
                                        {student.avgScore != null ? `${Math.round(student.avgScore)}%` : '—'}
                                    </p>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mt-0.5">Avg Score</p>
                                </div>
                                <button
                                    onClick={() => openSessionModal(student)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-300 text-xs font-bold hover:bg-slate-700 hover:text-white transition-all"
                                >
                                    History
                                </button>
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Session History Modal */}
            {sessionModalOpen && selectedStudent && (
                <Modal title={`${selectedStudent.name}'s Sessions`} onClose={closeSessionModal}>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {/* Student summary */}
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/30 to-blue-500/30 flex items-center justify-center">
                                <span className="text-teal-300 font-black text-sm">{selectedStudent.name?.[0]?.toUpperCase()}</span>
                            </div>
                            <div>
                                <p className="font-black text-white text-sm">{selectedStudent.name}</p>
                                <p className="text-slate-500 text-xs">{selectedStudent.email}</p>
                            </div>
                            <div className="ml-auto flex gap-3">
                                <div className="text-center">
                                    <p className="text-white font-black">{selectedStudent.totalSessions || 0}</p>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wide">Total</p>
                                </div>
                                <div className="text-center">
                                    <p className={`font-black ${scoreColor(selectedStudent.avgScore)}`}>
                                        {selectedStudent.avgScore != null ? `${Math.round(selectedStudent.avgScore)}%` : '—'}
                                    </p>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-wide">Avg</p>
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-8 text-slate-500">Loading sessions…</div>
                        ) : studentSessions.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">No sessions yet.</div>
                        ) : (
                            studentSessions.map(s => (
                                <div key={s._id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge(s.status)}`}>{s.status}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-700 text-slate-400">{s.interviewType === 'coding-mix' ? '💻 Coding' : '🗣 Oral'}</span>
                                        </div>
                                        <p className="text-slate-200 text-sm font-bold truncate">{s.role}</p>
                                        <p className="text-slate-500 text-xs">{s.level} · {new Date(s.createdAt).toLocaleDateString()}</p>
                                        {s.skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {s.skills.slice(0, 4).map(sk => <span key={sk} className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{sk}</span>)}
                                                {s.skills.length > 4 && <span className="text-[10px] text-slate-600">+{s.skills.length - 4}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className={`font-black text-xl ${scoreColor(s.overallScore)}`}>{s.overallScore || 0}%</p>
                                        {s.metrics?.avgTechnical > 0 && (
                                            <p className="text-slate-500 text-[10px]">Tech {Math.round(s.metrics.avgTechnical)}%</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────
function AnalyticsTab() {
    const dispatch = useDispatch();
    const { analytics, isLoading } = useSelector(s => s.admin);

    useEffect(() => { dispatch(fetchAnalytics()); }, [dispatch]);

    if (isLoading && !analytics) return <div className="text-center py-20 text-slate-500">Loading analytics…</div>;
    if (!analytics) return <div className="text-center py-20 text-slate-500">No data yet.</div>;

    const { totalSessions, totalUsers, completedSessions, totalQuestions, avgScore, byRole, byLevel, recentSessions, dailyActivity, topSkills } = analytics;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Sessions" value={totalSessions} color="teal" />
                <StatCard label="Completed" value={completedSessions} sub={`${totalSessions ? Math.round(completedSessions / totalSessions * 100) : 0}% completion rate`} color="blue" />
                <StatCard label="Total Users" value={totalUsers} color="purple" />
                <StatCard label="Avg Score" value={avgScore ? `${avgScore}%` : 'N/A'} color="amber" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                    <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4">Sessions by Role</h3>
                    <div className="space-y-3">
                        {byRole.map(r => (
                            <div key={r._id}>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span className="font-bold text-slate-300">{r._id}</span>
                                    <span>{r.count} sessions · avg {r.avgScore?.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.min(100, (r.count / (byRole[0]?.count || 1)) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                        {byRole.length === 0 && <p className="text-slate-500 text-sm">No sessions yet.</p>}
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                    <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4">Sessions by Level</h3>
                    <div className="space-y-3">
                        {byLevel.map(l => (
                            <div key={l._id}>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span className="font-bold text-slate-300">{l._id}</span>
                                    <span>{l.count} sessions · avg {l.avgScore?.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (l.count / (byLevel[0]?.count || 1)) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                        {byLevel.length === 0 && <p className="text-slate-500 text-sm">No sessions yet.</p>}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                    <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4">Top Skills Practiced</h3>
                    <div className="space-y-2">
                        {topSkills.map((s, i) => (
                            <div key={s._id} className="flex items-center gap-3">
                                <span className="text-slate-500 text-xs w-4 font-bold">{i + 1}</span>
                                <span className="flex-1 text-slate-300 text-sm font-bold">{s._id}</span>
                                <span className="bg-teal-500/10 text-teal-400 text-xs font-bold px-2 py-0.5 rounded-full">{s.count}</span>
                            </div>
                        ))}
                        {topSkills.length === 0 && <p className="text-slate-500 text-sm">No data yet.</p>}
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                    <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4">Recent Sessions</h3>
                    <div className="space-y-2">
                        {recentSessions.map(s => (
                            <div key={s._id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                                <div>
                                    <p className="text-slate-300 text-xs font-bold">{s.user?.name || 'Unknown'}</p>
                                    <p className="text-slate-500 text-xs">{s.role} · {s.level}</p>
                                </div>
                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${(s.overallScore || 0) >= 70 ? 'bg-green-500/10 text-green-400' : (s.overallScore || 0) >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {s.overallScore || 0}%
                                </span>
                            </div>
                        ))}
                        {recentSessions.length === 0 && <p className="text-slate-500 text-sm">No sessions yet.</p>}
                    </div>
                </div>
            </div>

            {dailyActivity.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                    <h3 className="font-black text-white text-sm uppercase tracking-widest mb-4">Daily Activity (Last 30 Days)</h3>
                    <div className="flex items-end gap-1 h-24">
                        {dailyActivity.map(d => {
                            const max = Math.max(...dailyActivity.map(x => x.count));
                            return (
                                <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group relative">
                                    <div className="bg-teal-500 rounded-t-sm w-full transition-all hover:bg-teal-400" style={{ height: `${(d.count / (max || 1)) * 80}px` }} />
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">{d._id}: {d.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── ROLES TAB ────────────────────────────────────────────────────────────────
function RolesTab() {
    const dispatch = useDispatch();
    const { roles, skills, isLoading } = useSelector(s => s.admin);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', levels: DEFAULT_LEVELS.join(', '), hasCoding: true });
    const [seeding, setSeeding] = useState(false);
    const [filter, setFilter] = useState({ search: '', type: 'all', source: 'all' });
    const [bulkMode, setBulkMode] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [bulkApplying, setBulkApplying] = useState(false);

    useEffect(() => { dispatch(fetchRoles()); dispatch(fetchSkills()); }, [dispatch]);

    const filteredRoles = roles.filter(r => {
        if (filter.search && !r.name.toLowerCase().includes(filter.search.toLowerCase())) return false;
        if (filter.type === 'coding' && !(r.hasCoding ?? true)) return false;
        if (filter.type === 'oral' && (r.hasCoding ?? true)) return false;
        if (filter.source === 'default' && !SEED_ROLE_NAMES.has(r.name)) return false;
        if (filter.source === 'custom' && SEED_ROLE_NAMES.has(r.name)) return false;
        return true;
    });
    const isFiltered = filter.search || filter.type !== 'all' || filter.source !== 'all';

    const toggleBulkMode = () => { setBulkMode(b => !b); setSelected(new Set()); };
    const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectAllVisible = () => setSelected(new Set(filteredRoles.map(r => r._id)));
    const deselectAll = () => setSelected(new Set());

    const handleBulkAction = async (action) => {
        if (selected.size === 0) return;
        setBulkApplying(true);
        let count = 0;
        for (const id of selected) {
            const role = roles.find(r => r._id === id);
            if (!role) continue;
            let body = {};
            if (action === 'enable-coding')   body = { hasCoding: true };
            if (action === 'disable-coding')  body = { hasCoding: false };
            if (action === 'activate')        body = { isActive: true };
            if (action === 'deactivate')      body = { isActive: false };
            const res = await dispatch(updateRole({ id, body }));
            if (!res.error) count++;
        }
        setBulkApplying(false);
        const labels = { 'enable-coding': '💻 Coding enabled', 'disable-coding': '🗣 Oral Only set', activate: 'Activated', deactivate: 'Deactivated' };
        toast.success(`${labels[action]} for ${count} role${count !== 1 ? 's' : ''}.`);
        setSelected(new Set());
    };

    const handleExport = () => {
        const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            roles: roles.map(r => ({
                name: r.name,
                description: r.description || '',
                levels: r.levels,
                hasCoding: r.hasCoding ?? true,
                isActive: r.isActive ?? true,
                isDefault: SEED_ROLE_NAMES.has(r.name),
                levelConfigs: (r.levelConfigs || []).map(lc => ({
                    level: lc.level,
                    easyCount: lc.easyCount,
                    mediumCount: lc.mediumCount,
                    hardCount: lc.hardCount,
                    codingCount: lc.codingCount,
                    oralCount: lc.oralCount,
                })),
            })),
            skills: skills.map(s => ({
                name: s.name,
                category: s.category || '',
                description: s.description || '',
                roles: s.roles || [],
                isActive: s.isActive ?? true,
            })),
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `interview-config-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${roles.length} roles + ${skills.length} skills.`);
    };

    const openCreate = () => { setForm({ name: '', description: '', levels: DEFAULT_LEVELS.join(', '), hasCoding: true }); setModal('create'); };
    const openEdit = (r) => { setForm({ name: r.name, description: r.description, levels: r.levels.join(', '), hasCoding: r.hasCoding ?? true }); setModal({ type: 'edit', id: r._id }); };

    const handleSeed = async () => {
        setSeeding(true);
        const res = await dispatch(seedDefaults());
        setSeeding(false);
        if (!res.error) {
            const { rolesCreated, skillsCreated, rolesSkipped, skillsSkipped } = res.payload;
            toast.success(`Seeded ${rolesCreated} roles + ${skillsCreated} skills. (${rolesSkipped + skillsSkipped} already existed)`);
            dispatch(fetchRoles());
        } else {
            toast.error(res.payload);
        }
    };

    const handleSave = async () => {
        const body = { name: form.name, description: form.description, levels: form.levels.split(',').map(s => s.trim()).filter(Boolean), hasCoding: form.hasCoding };
        if (modal === 'create') {
            const res = await dispatch(createRole(body));
            if (!res.error) { toast.success('Role created!'); setModal(null); }
            else toast.error(res.payload);
        } else {
            const res = await dispatch(updateRole({ id: modal.id, body }));
            if (!res.error) { toast.success('Role updated!'); setModal(null); }
            else toast.error(res.payload);
        }
    };

    const handleDelete = async (r) => {
        if (!confirmDelete(r.name)) return;
        const res = await dispatch(deleteRole(r._id));
        if (!res.error) toast.success('Role deleted.');
        else toast.error(res.payload);
    };

    return (
        <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <p className="text-slate-400 text-sm">
                    {bulkMode && selected.size > 0
                        ? <><span className="text-teal-400 font-bold">{selected.size}</span> selected</>
                        : isFiltered
                            ? <><span className="text-white font-bold">{filteredRoles.length}</span> of {roles.length} roles</>
                            : <><span className="text-white font-bold">{roles.length}</span> roles configured</>}
                </p>
                <div className="flex items-center gap-2">
                    {roles.length === 0 && (
                        <Btn variant="ghost" onClick={handleSeed} disabled={seeding}>
                            {seeding ? '⏳ Seeding…' : '🌱 Seed Default Roles & Skills'}
                        </Btn>
                    )}
                    {roles.length > 0 && (
                        <button
                            onClick={toggleBulkMode}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${bulkMode ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
                        >
                            {bulkMode ? '✕ Cancel Select' : '☑ Select'}
                        </button>
                    )}
                    {roles.length > 0 && (
                        <button
                            onClick={handleExport}
                            title="Download roles + QConfig as JSON"
                            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Export JSON
                        </button>
                    )}
                    <Btn onClick={openCreate}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Add Role
                    </Btn>
                </div>
            </div>

            {/* Filter bar */}
            {roles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[160px] max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input
                            type="text"
                            placeholder="Search roles…"
                            value={filter.search}
                            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                        />
                    </div>

                    {/* Type filter chips */}
                    <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
                        {[
                            { key: 'all',    label: 'All Types' },
                            { key: 'coding', label: '💻 Coding' },
                            { key: 'oral',   label: '🗣 Oral Only' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(f => ({ ...f, type: key }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filter.type === key ? 'bg-teal-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Source filter chips */}
                    <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
                        {[
                            { key: 'all',     label: 'All Sources' },
                            { key: 'default', label: '⚙ Default' },
                            { key: 'custom',  label: '✦ Custom' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(f => ({ ...f, source: key }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filter.source === key ? 'bg-violet-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Clear filters */}
                    {isFiltered && (
                        <button
                            onClick={() => setFilter({ search: '', type: 'all', source: 'all' })}
                            className="text-xs text-slate-500 hover:text-slate-300 font-bold transition underline underline-offset-2"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            {/* Bulk action bar */}
            {bulkMode && (
                <div className="mb-4 bg-slate-800/80 border border-teal-500/30 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
                    {/* Selection controls */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-300">{selected.size} selected</span>
                        <button onClick={selectAllVisible} className="text-[10px] font-black uppercase tracking-wide text-slate-400 hover:text-teal-300 transition">All visible</button>
                        {selected.size > 0 && <button onClick={deselectAll} className="text-[10px] font-black uppercase tracking-wide text-slate-400 hover:text-slate-200 transition">None</button>}
                    </div>

                    <div className="flex-1 h-px bg-slate-700/60" />

                    {/* hasCoding actions */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Type:</span>
                        <button
                            onClick={() => handleBulkAction('enable-coding')}
                            disabled={bulkApplying || selected.size === 0}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-black uppercase tracking-wide hover:bg-blue-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {bulkApplying ? '⏳' : '💻'} Set Coding
                        </button>
                        <button
                            onClick={() => handleBulkAction('disable-coding')}
                            disabled={bulkApplying || selected.size === 0}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-300 text-xs font-black uppercase tracking-wide hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {bulkApplying ? '⏳' : '🗣'} Set Oral
                        </button>
                    </div>

                    <div className="w-px h-5 bg-slate-700" />

                    {/* Active/inactive actions */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Status:</span>
                        <button
                            onClick={() => handleBulkAction('activate')}
                            disabled={bulkApplying || selected.size === 0}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-black uppercase tracking-wide hover:bg-green-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {bulkApplying ? '⏳' : '✓'} Activate
                        </button>
                        <button
                            onClick={() => handleBulkAction('deactivate')}
                            disabled={bulkApplying || selected.size === 0}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wide hover:bg-red-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {bulkApplying ? '⏳' : '○'} Deactivate
                        </button>
                    </div>
                </div>
            )}

            {isLoading && roles.length === 0 ? (
                <div className="text-center py-16 text-slate-500">Loading…</div>
            ) : (
                <div className="grid gap-3">
                    {filteredRoles.length === 0 && roles.length > 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <p className="font-bold text-slate-400 mb-1">No roles match your filters</p>
                            <button onClick={() => setFilter({ search: '', type: 'all', source: 'all' })} className="text-sm text-teal-400 hover:text-teal-300 transition">Clear filters</button>
                        </div>
                    )}
                    {filteredRoles.map(r => {
                        const isSelected = selected.has(r._id);
                        return (
                        <div
                            key={r._id}
                            onClick={bulkMode ? () => toggleSelect(r._id) : undefined}
                            className={`border rounded-2xl p-4 flex items-start gap-3 transition-all ${bulkMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-teal-500/60 bg-teal-500/5 ring-1 ring-teal-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}
                        >
                            {/* Checkbox in bulk mode */}
                            {bulkMode && (
                                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-slate-500'}`}>
                                    {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-black text-white">{r.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${r.isActive ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${(r.hasCoding ?? true) ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>{(r.hasCoding ?? true) ? '💻 Coding' : '🗣 Oral Only'}</span>
                                    {SEED_ROLE_NAMES.has(r.name) && (
                                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-violet-500/10 text-violet-400" title="This is a built-in default role pre-configured by the system">⚙ Default</span>
                                    )}
                                </div>
                                {r.description && <p className="text-slate-400 text-sm mt-0.5">{r.description}</p>}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {r.levels.map(l => <span key={l} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{l}</span>)}
                                </div>
                            </div>
                            {!bulkMode && (
                                <div className="flex gap-2 shrink-0">
                                    <Btn variant="ghost" onClick={() => openEdit(r)}>Edit</Btn>
                                    <Btn variant="danger" onClick={() => handleDelete(r)}>Del</Btn>
                                </div>
                            )}
                        </div>
                        );
                    })}
                    {roles.length === 0 && <div className="text-center py-16 text-slate-500">No roles yet. Add one to get started.</div>}
                </div>
            )}

            {modal && (
                <Modal title={modal === 'create' ? 'Add Role' : 'Edit Role'} onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <InputField label="Role Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. MERN Stack Developer" />
                        <TextareaField label="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this role" />
                        <InputField label="Levels (comma-separated)" value={form.levels} onChange={e => setForm(f => ({ ...f, levels: e.target.value }))} placeholder="Junior, Mid-Level, Senior" />
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Interview Type</label>
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, hasCoding: !f.hasCoding }))}
                                className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3 transition-all ${form.hasCoding ? 'border-blue-500/40 bg-blue-500/10' : 'border-slate-600 bg-slate-800'}`}
                            >
                                <span className={`w-9 h-5 rounded-full flex items-center transition-all duration-200 ${form.hasCoding ? 'bg-blue-500' : 'bg-slate-600'}`}>
                                    <span className={`w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${form.hasCoding ? 'ml-[18px]' : 'ml-0.5'}`} />
                                </span>
                                <div className="text-left">
                                    <p className={`text-sm font-bold ${form.hasCoding ? 'text-blue-300' : 'text-slate-400'}`}>
                                        {form.hasCoding ? '💻 Includes Coding Questions' : '🗣 Oral Only'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {form.hasCoding ? 'Coding challenges can be configured per level in QConfig' : 'No coding questions — all levels will be oral/behavioural'}
                                    </p>
                                </div>
                            </button>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn className="flex-1" onClick={handleSave}>Save Role</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─── SKILLS TAB ───────────────────────────────────────────────────────────────
function SkillsTab() {
    const dispatch = useDispatch();
    const { skills, roles, isLoading } = useSelector(s => s.admin);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ name: '', category: '', description: '', roles: [] });
    const [filter, setFilter] = useState({ search: '', category: 'all', role: 'all' });
    const [bulkMode, setBulkMode] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [bulkRole, setBulkRole] = useState('');
    const [bulkApplying, setBulkApplying] = useState(false);

    useEffect(() => { dispatch(fetchSkills()); dispatch(fetchRoles()); }, [dispatch]);

    const categories = [...new Set(skills.map(s => s.category).filter(Boolean))].sort();
    const roleNames  = [...new Set(skills.flatMap(s => s.roles))].sort();

    const filtered = skills.filter(s => {
        if (filter.search && !s.name.toLowerCase().includes(filter.search.toLowerCase()) && !s.category.toLowerCase().includes(filter.search.toLowerCase())) return false;
        if (filter.category !== 'all' && s.category !== filter.category) return false;
        if (filter.role !== 'all' && !s.roles.includes(filter.role)) return false;
        return true;
    });
    const isFiltered = filter.search || filter.category !== 'all' || filter.role !== 'all';
    const clearFilter = () => setFilter({ search: '', category: 'all', role: 'all' });

    const toggleBulkMode = () => { setBulkMode(b => !b); setSelected(new Set()); setBulkRole(''); };
    const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectAllVisible = () => setSelected(new Set(filtered.map(s => s._id)));
    const deselectAll = () => setSelected(new Set());

    const handleBulkApply = async (op) => {
        if (!bulkRole || selected.size === 0) return toast.error(op === 'add' ? 'Pick a role to add.' : 'Pick a role to remove.');
        setBulkApplying(true);
        let successCount = 0;
        for (const id of selected) {
            const skill = skills.find(s => s._id === id);
            if (!skill) continue;
            const currentRoles = skill.roles || [];
            const newRoles = op === 'add'
                ? currentRoles.includes(bulkRole) ? currentRoles : [...currentRoles, bulkRole]
                : currentRoles.filter(r => r !== bulkRole);
            const res = await dispatch(updateSkill({ id, body: { ...skill, roles: newRoles } }));
            if (!res.error) successCount++;
        }
        setBulkApplying(false);
        toast.success(`${op === 'add' ? 'Added' : 'Removed'} "${bulkRole}" ${op === 'add' ? 'to' : 'from'} ${successCount} skill${successCount !== 1 ? 's' : ''}.`);
        setSelected(new Set());
        setBulkRole('');
    };

    const openCreate = () => { setForm({ name: '', category: '', description: '', roles: [] }); setModal('create'); };
    const openEdit = (s) => { setForm({ name: s.name, category: s.category, description: s.description, roles: s.roles }); setModal({ type: 'edit', id: s._id }); };

    const toggleRole = (rName) => setForm(f => ({ ...f, roles: f.roles.includes(rName) ? f.roles.filter(r => r !== rName) : [...f.roles, rName] }));

    const handleSave = async () => {
        const body = { ...form };
        if (modal === 'create') {
            const res = await dispatch(createSkill(body));
            if (!res.error) { toast.success('Skill created!'); setModal(null); }
            else toast.error(res.payload);
        } else {
            const res = await dispatch(updateSkill({ id: modal.id, body }));
            if (!res.error) { toast.success('Skill updated!'); setModal(null); }
            else toast.error(res.payload);
        }
    };

    const handleDelete = async (s) => {
        if (!confirmDelete(s.name)) return;
        const res = await dispatch(deleteSkill(s._id));
        if (!res.error) toast.success('Skill deleted.');
        else toast.error(res.payload);
    };

    return (
        <div>
            {/* Header row */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <p className="text-slate-400 text-sm">
                    {bulkMode && selected.size > 0
                        ? <><span className="text-teal-400 font-bold">{selected.size}</span> selected</>
                        : isFiltered
                            ? <><span className="text-white font-bold">{filtered.length}</span> of {skills.length} skills</>
                            : <><span className="text-white font-bold">{skills.length}</span> skills configured</>}
                </p>
                <div className="flex items-center gap-2">
                    {skills.length > 0 && (
                        <button
                            onClick={toggleBulkMode}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${bulkMode ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
                        >
                            {bulkMode ? '✕ Cancel Select' : '☑ Select'}
                        </button>
                    )}
                    <Btn onClick={openCreate}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Add Skill
                    </Btn>
                </div>
            </div>

            {/* Filter bar */}
            {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[160px] max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input
                            type="text"
                            placeholder="Search skills…"
                            value={filter.search}
                            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                        />
                    </div>

                    {/* Category chips */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 flex-wrap">
                            <button
                                onClick={() => setFilter(f => ({ ...f, category: 'all' }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filter.category === 'all' ? 'bg-purple-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >All</button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(f => ({ ...f, category: f.category === cat ? 'all' : cat }))}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${filter.category === cat ? 'bg-purple-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                >{cat}</button>
                            ))}
                        </div>
                    )}

                    {/* Role dropdown */}
                    {roleNames.length > 0 && (
                        <select
                            value={filter.role}
                            onChange={e => setFilter(f => ({ ...f, role: e.target.value }))}
                            className={`bg-slate-800 border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-teal-500 transition cursor-pointer ${filter.role !== 'all' ? 'border-teal-500 text-teal-300' : 'border-slate-700 text-slate-400'}`}
                        >
                            <option value="all">All Roles</option>
                            {roleNames.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    )}

                    {/* Clear */}
                    {isFiltered && (
                        <button onClick={clearFilter} className="text-xs text-slate-500 hover:text-slate-300 font-bold transition underline underline-offset-2">Clear</button>
                    )}
                </div>
            )}

            {/* Bulk action bar */}
            {bulkMode && (
                <div className="mb-4 bg-slate-800/80 border border-teal-500/30 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
                    {/* Selection controls */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-300">{selected.size} selected</span>
                        <button onClick={selectAllVisible} className="text-[10px] font-black uppercase tracking-wide text-slate-400 hover:text-teal-300 transition">All visible</button>
                        {selected.size > 0 && <button onClick={deselectAll} className="text-[10px] font-black uppercase tracking-wide text-slate-400 hover:text-slate-200 transition">None</button>}
                    </div>

                    <div className="flex-1 h-px bg-slate-700/60" />

                    {/* Role picker */}
                    <select
                        value={bulkRole}
                        onChange={e => setBulkRole(e.target.value)}
                        className={`bg-slate-700 border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-teal-500 transition ${bulkRole ? 'border-teal-500/60 text-white' : 'border-slate-600 text-slate-400'}`}
                    >
                        <option value="">Pick a role…</option>
                        {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                    </select>

                    {/* Action buttons */}
                    <button
                        onClick={() => handleBulkApply('add')}
                        disabled={bulkApplying || !bulkRole || selected.size === 0}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-black uppercase tracking-wide hover:bg-teal-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {bulkApplying ? '⏳' : '+'} Add to Role
                    </button>
                    <button
                        onClick={() => handleBulkApply('remove')}
                        disabled={bulkApplying || !bulkRole || selected.size === 0}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wide hover:bg-red-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {bulkApplying ? '⏳' : '−'} Remove from Role
                    </button>
                </div>
            )}

            {isLoading && skills.length === 0 ? (
                <div className="text-center py-16 text-slate-500">Loading…</div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    {filtered.length === 0 && skills.length > 0 && (
                        <div className="col-span-2 text-center py-12 text-slate-500">
                            <p className="font-bold text-slate-400 mb-1">No skills match your filters</p>
                            <button onClick={clearFilter} className="text-sm text-teal-400 hover:text-teal-300 transition">Clear filters</button>
                        </div>
                    )}
                    {filtered.map(s => {
                        const isSelected = selected.has(s._id);
                        return (
                        <div
                            key={s._id}
                            onClick={bulkMode ? () => toggleSelect(s._id) : undefined}
                            className={`bg-slate-800/50 border rounded-2xl p-4 transition-all ${bulkMode ? 'cursor-pointer' : ''} ${isSelected ? 'border-teal-500/60 bg-teal-500/5 ring-1 ring-teal-500/30' : 'border-slate-700/50'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                {/* Checkbox in bulk mode */}
                                {bulkMode && (
                                    <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-slate-500'}`}>
                                        {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-black text-white text-sm">{s.name}</h3>
                                        {s.category && <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold">{s.category}</span>}
                                    </div>
                                    {s.description && <p className="text-slate-400 text-xs mt-1">{s.description}</p>}
                                    {s.roles.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {s.roles.map(r => <span key={r} className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-md">{r}</span>)}
                                        </div>
                                    )}
                                </div>
                                {!bulkMode && (
                                    <div className="flex gap-1.5 shrink-0">
                                        <Btn variant="ghost" onClick={() => openEdit(s)}>Edit</Btn>
                                        <Btn variant="danger" onClick={() => handleDelete(s)}>Del</Btn>
                                    </div>
                                )}
                            </div>
                        </div>
                        );
                    })}
                    {filtered.length === 0 && skills.length === 0 && <div className="col-span-2 text-center py-16 text-slate-500">No skills yet. Add one to get started.</div>}
                </div>
            )}

            {modal && (
                <Modal title={modal === 'create' ? 'Add Skill' : 'Edit Skill'} onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <InputField label="Skill Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. React.js" />
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Category</label>
                            <input list="cats" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Frontend, Backend, DevOps" className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition" />
                            <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                        </div>
                        <TextareaField label="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
                        {roles.length > 0 && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Tag to Roles</label>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map(r => (
                                        <button key={r._id} type="button" onClick={() => toggleRole(r.name)} className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${form.roles.includes(r.name) ? 'bg-teal-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{r.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn className="flex-1" onClick={handleSave}>Save Skill</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─── QUESTION BANK TAB ────────────────────────────────────────────────────────
function QuestionsTab() {
    const dispatch = useDispatch();
    const { questions, questionsMeta, roles, isLoading } = useSelector(s => s.admin);
    const [filters, setFilters] = useState({ role: '', level: '', difficulty: '', type: '', page: 1 });
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ questionText: '', questionType: 'oral', difficulty: 'medium', role: '', level: '', skills: '', idealAnswer: '' });
    const [expandedId, setExpandedId] = useState(null);

    const allLevels = [...new Set(roles.flatMap(r => r.levels))];

    useEffect(() => { dispatch(fetchRoles()); }, [dispatch]);
    useEffect(() => {
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
        dispatch(fetchQuestions(params));
    }, [dispatch, filters]);

    const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

    const openCreate = () => { setForm({ questionText: '', questionType: 'oral', difficulty: 'medium', role: '', level: '', skills: '', idealAnswer: '' }); setModal('create'); };
    const openEdit = (q) => { setForm({ questionText: q.questionText, questionType: q.questionType, difficulty: q.difficulty, role: q.role, level: q.level, skills: q.skills.join(', '), idealAnswer: q.idealAnswer }); setModal({ type: 'edit', id: q._id }); };

    const handleSave = async () => {
        const body = { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) };
        if (modal === 'create') {
            const res = await dispatch(createQuestion(body));
            if (!res.error) { toast.success('Question added!'); setModal(null); }
            else toast.error(res.payload);
        } else {
            const res = await dispatch(updateQuestion({ id: modal.id, body }));
            if (!res.error) { toast.success('Question updated!'); setModal(null); }
            else toast.error(res.payload);
        }
    };

    const handleDelete = async (q) => {
        if (!confirmDelete(q.questionText.slice(0, 40) + '…')) return;
        const res = await dispatch(deleteQuestion(q._id));
        if (!res.error) toast.success('Question deleted.');
        else toast.error(res.payload);
    };

    const diffColor = { easy: 'bg-green-500/10 text-green-400', medium: 'bg-amber-500/10 text-amber-400', hard: 'bg-rose-500/10 text-rose-400' };
    const typeColor = { oral: 'bg-blue-500/10 text-blue-400', coding: 'bg-purple-500/10 text-purple-400' };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-4">
                <select value={filters.role} onChange={e => setFilter('role', e.target.value)} className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                    <option value="">All Roles</option>
                    {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                </select>
                <select value={filters.level} onChange={e => setFilter('level', e.target.value)} className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                    <option value="">All Levels</option>
                    {allLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={filters.difficulty} onChange={e => setFilter('difficulty', e.target.value)} className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                    <option value="">All Difficulties</option>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={filters.type} onChange={e => setFilter('type', e.target.value)} className="bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                    <option value="">All Types</option>
                    {Q_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="ml-auto">
                    <Btn onClick={openCreate}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Add Question
                    </Btn>
                </div>
            </div>

            <p className="text-slate-500 text-xs mb-3">{questionsMeta.total} questions total · Page {questionsMeta.page} of {questionsMeta.pages}</p>

            {isLoading ? (
                <div className="text-center py-16 text-slate-500">Loading…</div>
            ) : (
                <div className="space-y-2">
                    {questions.map(q => (
                        <div key={q._id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diffColor[q.difficulty]}`}>{q.difficulty}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor[q.questionType]}`}>{q.questionType}</span>
                                        <span className="text-xs text-slate-500">{q.role} · {q.level}</span>
                                        {q.source === 'ai-generated' && <span className="text-xs bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded-md font-bold">AI</span>}
                                    </div>
                                    <p className="text-slate-300 text-sm font-medium line-clamp-2">{q.questionText}</p>
                                </div>
                                <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                    <Btn variant="ghost" onClick={() => openEdit(q)}>Edit</Btn>
                                    <Btn variant="danger" onClick={() => handleDelete(q)}>Del</Btn>
                                </div>
                            </div>
                            {expandedId === q._id && (
                                <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-3">
                                    {q.skills.length > 0 && <div className="flex flex-wrap gap-1">{q.skills.map(s => <span key={s} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{s}</span>)}</div>}
                                    {q.idealAnswer && <div><p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Ideal Answer</p><p className="text-slate-400 text-sm whitespace-pre-wrap">{q.idealAnswer}</p></div>}
                                </div>
                            )}
                        </div>
                    ))}
                    {questions.length === 0 && <div className="text-center py-16 text-slate-500">No questions found. Adjust filters or generate some.</div>}
                </div>
            )}

            {questionsMeta.pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                    <Btn variant="outline" disabled={questionsMeta.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Prev</Btn>
                    <span className="text-slate-400 text-sm">Page {questionsMeta.page} / {questionsMeta.pages}</span>
                    <Btn variant="outline" disabled={questionsMeta.page >= questionsMeta.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next →</Btn>
                </div>
            )}

            {modal && (
                <Modal title={modal === 'create' ? 'Add Question' : 'Edit Question'} onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <TextareaField label="Question Text" value={form.questionText} onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))} placeholder="Enter the interview question…" rows={4} />
                        <div className="grid grid-cols-2 gap-3">
                            <SelectField label="Type" value={form.questionType} onChange={e => setForm(f => ({ ...f, questionType: e.target.value }))}>
                                {Q_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </SelectField>
                            <SelectField label="Difficulty" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </SelectField>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Role</label>
                                <input list="roles-list" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition" placeholder="Role" />
                                <datalist id="roles-list">{roles.map(r => <option key={r._id} value={r.name} />)}</datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Level</label>
                                <input list="levels-list" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition" placeholder="Level" />
                                <datalist id="levels-list">{allLevels.map(l => <option key={l} value={l} />)}</datalist>
                            </div>
                        </div>
                        <InputField label="Skills (comma-separated)" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="React.js, Node.js, MongoDB" />
                        <TextareaField label="Ideal Answer (optional)" value={form.idealAnswer} onChange={e => setForm(f => ({ ...f, idealAnswer: e.target.value }))} placeholder="Expected answer…" rows={4} />
                        <div className="flex gap-3 pt-2">
                            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn className="flex-1" onClick={handleSave}>Save Question</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─── GENERATE TAB ─────────────────────────────────────────────────────────────
function GenerateTab() {
    const dispatch = useDispatch();
    const { roles, skills, isGenerating } = useSelector(s => s.admin);
    const [form, setForm] = useState({ role: '', level: '', questionType: 'oral', difficulty: 'medium', count: 5, skills: [] });
    const [lastResult, setLastResult] = useState(null);

    useEffect(() => { dispatch(fetchRoles()); dispatch(fetchSkills()); }, [dispatch]);

    const roleObj = roles.find(r => r.name === form.role);
    const roleLevels = roleObj ? roleObj.levels : DEFAULT_LEVELS;
    const roleSkills = skills.filter(s => s.roles.includes(form.role) || s.roles.length === 0);

    const toggleSkill = (name) => setForm(f => ({ ...f, skills: f.skills.includes(name) ? f.skills.filter(s => s !== name) : [...f.skills, name] }));

    const handleGenerate = async () => {
        if (!form.role || !form.level) return toast.error('Please select a role and level.');
        const res = await dispatch(generateQuestions({ ...form, skills: form.skills }));
        if (!res.error) {
            toast.success(`Generated ${res.payload.generated} questions and saved to bank!`);
            setLastResult(res.payload);
        } else {
            toast.error(res.payload);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
                <div>
                    <h3 className="font-black text-white uppercase tracking-tight mb-1">AI Question Generator</h3>
                    <p className="text-slate-400 text-sm">Configure parameters and let AI generate interview questions, which are automatically saved to the question bank.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <SelectField label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, level: '', skills: [] }))}>
                        <option value="">Select role…</option>
                        {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                    </SelectField>
                    <SelectField label="Level" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                        <option value="">Select level…</option>
                        {roleLevels.map(l => <option key={l} value={l}>{l}</option>)}
                    </SelectField>
                    <SelectField label="Question Type" value={form.questionType} onChange={e => setForm(f => ({ ...f, questionType: e.target.value }))}>
                        {Q_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </SelectField>
                    <SelectField label="Difficulty" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                        {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </SelectField>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Number of Questions: {form.count}</label>
                    <input type="range" min={1} max={20} value={form.count} onChange={e => setForm(f => ({ ...f, count: Number(e.target.value) }))} className="w-full accent-teal-500" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1</span><span>20</span></div>
                </div>

                {roleSkills.length > 0 && (
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Focus Skills (optional)</label>
                        <div className="flex flex-wrap gap-2">
                            {roleSkills.map(s => (
                                <button key={s._id} type="button" onClick={() => toggleSkill(s.name)} className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${form.skills.includes(s.name) ? 'bg-teal-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{s.name}</button>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !form.role || !form.level}
                    className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-black uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                    {isGenerating ? (
                        <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                            Generating with AI…
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Generate {form.count} Questions
                        </>
                    )}
                </button>
            </div>

            {lastResult && (
                <div className="mt-6 bg-slate-800/50 border border-teal-500/30 rounded-2xl p-5">
                    <h3 className="font-black text-teal-400 text-sm uppercase tracking-widest mb-3">Generated {lastResult.generated} Questions</h3>
                    <div className="space-y-3">
                        {lastResult.questions.map((q, i) => (
                            <div key={q._id} className="flex gap-3">
                                <span className="text-slate-500 text-xs font-bold w-5 shrink-0 mt-0.5">{i + 1}.</span>
                                <div>
                                    <p className="text-slate-300 text-sm">{q.questionText}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs text-slate-500">{q.questionType} · {q.difficulty}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── TEMPLATES TAB ────────────────────────────────────────────────────────────
function TemplatesTab() {
    const dispatch = useDispatch();
    const { templates, roles, skills, isLoading } = useSelector(s => s.admin);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', role: '', level: '', interviewType: 'coding-mix', skills: [], easyCount: 2, mediumCount: 3, hardCount: 2, codingCount: 2, oralCount: 3 });

    useEffect(() => { dispatch(fetchTemplates()); dispatch(fetchRoles()); dispatch(fetchSkills()); }, [dispatch]);

    const roleObj = roles.find(r => r.name === form.role);
    const roleLevels = roleObj ? roleObj.levels : DEFAULT_LEVELS;
    const roleSkills = skills.filter(s => s.roles.includes(form.role) || s.roles.length === 0);

    const toggleSkill = (name) => setForm(f => ({ ...f, skills: f.skills.includes(name) ? f.skills.filter(s => s !== name) : [...f.skills, name] }));

    const openCreate = () => { setForm({ name: '', description: '', role: '', level: '', interviewType: 'coding-mix', skills: [], easyCount: 2, mediumCount: 3, hardCount: 2, codingCount: 2, oralCount: 3 }); setModal('create'); };
    const openEdit = (t) => { setForm({ ...t, skills: t.skills || [] }); setModal({ type: 'edit', id: t._id }); };

    const handleSave = async () => {
        if (!form.name || !form.role || !form.level) return toast.error('Name, role, and level are required.');
        const body = { ...form };
        if (modal === 'create') {
            const res = await dispatch(createTemplate(body));
            if (!res.error) { toast.success('Template created!'); setModal(null); }
            else toast.error(res.payload);
        } else {
            const res = await dispatch(updateTemplate({ id: modal.id, body }));
            if (!res.error) { toast.success('Template updated!'); setModal(null); }
            else toast.error(res.payload);
        }
    };

    const handleDelete = async (t) => {
        if (!confirmDelete(t.name)) return;
        const res = await dispatch(deleteTemplate(t._id));
        if (!res.error) toast.success('Template deleted.');
        else toast.error(res.payload);
    };

    const numField = (label, key) => (
        <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
            <input type="number" min={0} max={20} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm transition" />
        </div>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-slate-400 text-sm">{templates.length} templates</p>
                <Btn onClick={openCreate}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    New Template
                </Btn>
            </div>

            {isLoading && templates.length === 0 ? (
                <div className="text-center py-16 text-slate-500">Loading…</div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    {templates.map(t => (
                        <div key={t._id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="font-black text-white text-sm">{t.name}</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">{t.role} · {t.level} · {t.interviewType}</p>
                                    {t.description && <p className="text-slate-500 text-xs mt-1">{t.description}</p>}
                                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                                        {[['Easy', t.easyCount], ['Med', t.mediumCount], ['Hard', t.hardCount], ['Code', t.codingCount], ['Oral', t.oralCount]].map(([l, v]) => (
                                            <div key={l} className="bg-slate-700/50 rounded-lg py-1.5">
                                                <p className="text-slate-400 text-xs">{l}</p>
                                                <p className="text-white font-black text-sm">{v}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {t.skills.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{t.skills.map(s => <span key={s} className="text-xs bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded-md">{s}</span>)}</div>}
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    <Btn variant="ghost" onClick={() => openEdit(t)}>Edit</Btn>
                                    <Btn variant="danger" onClick={() => handleDelete(t)}>Del</Btn>
                                </div>
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && <div className="col-span-2 text-center py-16 text-slate-500">No templates yet.</div>}
                </div>
            )}

            {modal && (
                <Modal title={modal === 'create' ? 'New Template' : 'Edit Template'} onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <InputField label="Template Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. MERN Senior Technical" />
                        <TextareaField label="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
                        <div className="grid grid-cols-2 gap-3">
                            <SelectField label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, level: '' }))}>
                                <option value="">Select role…</option>
                                {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                            </SelectField>
                            <SelectField label="Level" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                                <option value="">Select level…</option>
                                {roleLevels.map(l => <option key={l} value={l}>{l}</option>)}
                            </SelectField>
                        </div>
                        <SelectField label="Interview Type" value={form.interviewType} onChange={e => setForm(f => ({ ...f, interviewType: e.target.value }))}>
                            {INTERVIEW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </SelectField>
                        <div className="grid grid-cols-3 gap-3">
                            {numField('Easy Qs', 'easyCount')}
                            {numField('Medium Qs', 'mediumCount')}
                            {numField('Hard Qs', 'hardCount')}
                            {numField('Coding Qs', 'codingCount')}
                            {numField('Oral Qs', 'oralCount')}
                        </div>
                        {roleSkills.length > 0 && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Skills</label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {roleSkills.map(s => (
                                        <button key={s._id} type="button" onClick={() => toggleSkill(s.name)} className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${form.skills.includes(s.name) ? 'bg-teal-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{s.name}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn className="flex-1" onClick={handleSave}>Save Template</Btn>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─── Q CONFIG TAB ─────────────────────────────────────────────────────────────
function QConfigTab() {
    const dispatch = useDispatch();
    const { roles, isLoading } = useSelector(s => s.admin);
    const [selectedRole, setSelectedRole] = useState('');
    const [configs, setConfigs] = useState({});
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [changeLog, setChangeLog] = useState([]);
    const savedConfigsRef = useRef({});

    useEffect(() => { dispatch(fetchRoles()); }, [dispatch]);

    const roleObj = roles.find(r => r._id === selectedRole);

    useEffect(() => {
        if (!roleObj) return;
        const c = {};
        roleObj.levels.forEach(level => {
            const existing = roleObj.levelConfigs?.find(lc => lc.level === level);
            c[level] = existing || { level, easyCount: 2, mediumCount: 3, hardCount: 2, codingCount: 2, oralCount: 3 };
        });
        setConfigs(c);
        savedConfigsRef.current = c;
        // Load persisted change log for this role
        try {
            const stored = localStorage.getItem(`qconfig_log_${roleObj._id}`);
            setChangeLog(stored ? JSON.parse(stored) : []);
        } catch { setChangeLog([]); }
    }, [roleObj]);

    const setConfigVal = (level, key, val) => setConfigs(c => ({ ...c, [level]: { ...c[level], [key]: Number(val) } }));

    const DEFAULT_LEVEL_CONFIG = { easyCount: 2, mediumCount: 3, hardCount: 2, codingCount: 2, oralCount: 5 };

    const handleCopyLevel = (targetLevel, sourceLevel) => {
        if (!sourceLevel || sourceLevel === targetLevel) return;
        if (sourceLevel === '__reset__') {
            setConfigs(prev => ({ ...prev, [targetLevel]: { ...DEFAULT_LEVEL_CONFIG, level: targetLevel } }));
            return;
        }
        const src = configs[sourceLevel];
        if (!src) return;
        setConfigs(prev => ({ ...prev, [targetLevel]: { ...src, level: targetLevel } }));
    };

    const handleBalanceAll = () => {
        setConfigs(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(level => {
                const c = next[level];
                const diffTotal = (c.easyCount ?? 0) + (c.mediumCount ?? 0) + (c.hardCount ?? 0);
                const coding = c.codingCount ?? 0;
                const newOral = Math.max(0, diffTotal - coding);
                next[level] = { ...c, oralCount: newOral };
            });
            return next;
        });
    };

    const FIELD_LABELS = { easyCount: 'Easy', mediumCount: 'Medium', hardCount: 'Hard', codingCount: 'Coding', oralCount: 'Oral' };

    const handleSave = async () => {
        if (!roleObj) return;
        setSaving(true);

        // Compute diffs against last saved state
        const diffs = [];
        Object.keys(configs).forEach(level => {
            const prev = savedConfigsRef.current[level] || {};
            const next = configs[level] || {};
            ['easyCount','mediumCount','hardCount','codingCount','oralCount'].forEach(key => {
                const oldVal = prev[key] ?? 0;
                const newVal = next[key] ?? 0;
                if (oldVal !== newVal) {
                    diffs.push({ level, field: FIELD_LABELS[key], from: oldVal, to: newVal });
                }
            });
        });

        const levelConfigs = Object.values(configs);
        const res = await dispatch(updateRole({ id: roleObj._id, body: { levelConfigs } }));
        setSaving(false);

        if (!res.error) {
            toast.success('Question config saved!');
            savedConfigsRef.current = configs;

            if (diffs.length > 0) {
                const entry = { ts: Date.now(), diffs };
                const updated = [entry, ...changeLog].slice(0, 30);
                setChangeLog(updated);
                try { localStorage.setItem(`qconfig_log_${roleObj._id}`, JSON.stringify(updated)); } catch {}
            }
        } else {
            toast.error(res.payload);
        }
    };

    const fieldStyle = "w-16 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-center text-sm focus:outline-none focus:border-teal-500 transition";

    const validationErrors = roleObj ? roleObj.levels.reduce((acc, level) => {
        const c = configs[level] || {};
        const diffTotal = (c.easyCount ?? 0) + (c.mediumCount ?? 0) + (c.hardCount ?? 0);
        const typeTotal = (c.codingCount ?? 0) + (c.oralCount ?? 0);
        if (diffTotal !== typeTotal) acc.push({ level, diffTotal, typeTotal });
        return acc;
    }, []) : [];

    return (
        <div>
            <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Select Role to Configure</label>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm transition w-full max-w-sm">
                    <option value="">Choose a role…</option>
                    {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
            </div>

            {roleObj ? (
                <div className="space-y-4">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                        <div className="grid grid-cols-[1fr_repeat(5,56px)_auto] gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-700/30 items-center">
                            {['Level', 'Easy', 'Medium', 'Hard', 'Coding', 'Oral'].map((h, i) => (
                                <p key={i} className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center first:text-left">{h}</p>
                            ))}
                            <div className="flex justify-center">
                                {validationErrors.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={handleBalanceAll}
                                        title="Auto-balance all mismatched levels at once"
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[9px] font-black uppercase tracking-wide hover:bg-teal-500/30 transition-all whitespace-nowrap"
                                    >
                                        ⚡ All
                                    </button>
                                ) : (
                                    <span className="text-emerald-400 text-xs font-black" title="All levels balanced">✓ All</span>
                                )}
                            </div>
                        </div>
                        {roleObj.levels.map(level => {
                            const c = configs[level] || {};
                            const roleHasCoding = roleObj.hasCoding ?? true;
                            // When role has no coding, codingCount is always 0
                            const effectiveC = roleHasCoding ? c : { ...c, codingCount: 0 };
                            const diffTotal = (effectiveC.easyCount ?? 0) + (effectiveC.mediumCount ?? 0) + (effectiveC.hardCount ?? 0);
                            const typeTotal = (effectiveC.codingCount ?? 0) + (effectiveC.oralCount ?? 0);
                            const rowMismatch = diffTotal !== typeTotal;
                            return (
                                <div key={level} className={`grid grid-cols-[1fr_repeat(5,56px)_auto] gap-2 px-4 py-3 border-b border-slate-700/30 last:border-0 items-center transition-colors ${rowMismatch ? 'bg-amber-500/5' : ''}`}>
                                    <p className={`font-bold text-sm ${rowMismatch ? 'text-amber-300' : 'text-slate-300'}`}>{level}</p>
                                    {['easyCount','mediumCount','hardCount','codingCount','oralCount'].map(k => {
                                        const isCodingLocked = k === 'codingCount' && !roleHasCoding;
                                        return (
                                        <input
                                            key={k}
                                            type="number"
                                            min={0}
                                            max={20}
                                            value={isCodingLocked ? 0 : (effectiveC[k] ?? 0)}
                                            disabled={isCodingLocked}
                                            onChange={e => setConfigVal(level, k, e.target.value)}
                                            title={isCodingLocked ? 'Coding disabled for this role — toggle in Roles tab' : undefined}
                                            className={`${fieldStyle} ${isCodingLocked ? 'opacity-30 cursor-not-allowed' : ''} ${rowMismatch && (k === 'codingCount' || k === 'oralCount') && !isCodingLocked ? 'border-amber-500/50' : ''}`}
                                        />
                                        );
                                    })}
                                    <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                                        {/* Fix / balanced indicator */}
                                        {rowMismatch ? (
                                            <button
                                                type="button"
                                                title={`Auto-set Oral to ${Math.max(0, diffTotal - (effectiveC.codingCount ?? 0))}`}
                                                onClick={() => setConfigVal(level, 'oralCount', Math.max(0, diffTotal - (effectiveC.codingCount ?? 0)))}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 text-[10px] font-black uppercase tracking-wide hover:bg-teal-500/30 transition-all whitespace-nowrap w-full justify-center"
                                            >
                                                ⚡ Fix
                                            </button>
                                        ) : (
                                            <span className="text-emerald-400 text-sm font-black" title="Balanced">✓</span>
                                        )}
                                        {/* Copy from level */}
                                        {roleObj.levels.length > 1 && (
                                            <select
                                                value=""
                                                onChange={e => handleCopyLevel(level, e.target.value)}
                                                title="Copy all counts from another level into this row"
                                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-1.5 py-1 text-[9px] text-slate-400 font-bold focus:outline-none focus:border-teal-500 cursor-pointer hover:border-slate-500 transition"
                                            >
                                                <option value="" disabled>⎘ Actions…</option>
                                                <option value="__reset__">↺ Reset to defaults</option>
                                                {roleObj.levels.filter(l => l !== level).length > 0 && (
                                                    <option value="" disabled>── Copy from ──</option>
                                                )}
                                                {roleObj.levels.filter(l => l !== level).map(src => (
                                                    <option key={src} value={src}>{src}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Global Validation Banner ── */}
                    {validationErrors.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 space-y-1">
                            <p className="text-xs font-black text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                                ⚠ Mismatch detected in {validationErrors.length} level{validationErrors.length > 1 ? 's' : ''}
                            </p>
                            {validationErrors.map(({ level, diffTotal, typeTotal }) => (
                                <p key={level} className="text-xs text-amber-400/80 font-medium">
                                    <span className="font-black text-amber-300">{level}:</span> Difficulty total ({diffTotal}) ≠ Coding + Oral total ({typeTotal})
                                    {diffTotal > typeTotal
                                        ? ` — add ${diffTotal - typeTotal} more to Coding or Oral`
                                        : ` — reduce Coding + Oral by ${typeTotal - diffTotal}`}
                                </p>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Btn onClick={handleSave} disabled={saving || validationErrors.length > 0} className={`flex-1 justify-center py-3 ${validationErrors.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {saving ? 'Saving…' : validationErrors.length > 0 ? 'Fix mismatches to save' : 'Save Configuration'}
                        </Btn>
                        <button
                            type="button"
                            onClick={() => setShowPreview(p => !p)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-sm transition-all ${showPreview ? 'bg-teal-500/20 border-teal-500/50 text-teal-300' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-teal-500/50 hover:text-teal-300'}`}
                        >
                            <span>{showPreview ? '✕ Hide' : '👁 Preview'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowHistory(p => !p)}
                            className={`relative flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-sm transition-all ${showHistory ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-violet-500/50 hover:text-violet-300'}`}
                        >
                            <span>🕐 History</span>
                            {changeLog.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-violet-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                    {changeLog.length > 9 ? '9+' : changeLog.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── Preview Panel ── */}
                    {showPreview && (
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-700/50">
                                <h4 className="text-sm font-black text-white">Session Preview — {roleObj.name}</h4>
                                <p className="text-xs text-slate-400 mt-0.5">How questions will be generated and labeled per level</p>
                            </div>
                            <div className="divide-y divide-slate-700/30">
                                {roleObj.levels.map(level => {
                                    const c = configs[level] || {};
                                    const easy   = c.easyCount   ?? 0;
                                    const medium = c.mediumCount ?? 0;
                                    const hard   = c.hardCount   ?? 0;
                                    const coding = c.codingCount ?? 0;
                                    const oral   = c.oralCount   ?? 0;
                                    const diffTotal = easy + medium + hard;
                                    const typeTotal = coding + oral;
                                    const total  = diffTotal;
                                    const hasMismatch = diffTotal !== typeTotal;

                                    const questions = [];
                                    for (let i = 0; i < easy;   i++) questions.push({ diff: 'easy',   type: i < coding ? 'coding' : 'oral' });
                                    for (let i = 0; i < medium; i++) questions.push({ diff: 'medium', type: (easy + i) < coding ? 'coding' : 'oral' });
                                    for (let i = 0; i < hard;   i++) questions.push({ diff: 'hard',   type: (easy + medium + i) < coding ? 'coding' : 'oral' });

                                    const diffColor = { easy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30', hard: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };

                                    return (
                                        <div key={level} className={`px-5 py-4 ${hasMismatch ? 'bg-amber-500/5' : ''}`}>
                                            {/* Per-level mismatch warning */}
                                            {hasMismatch && (
                                                <div className="flex items-center gap-2 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                                                    <span className="text-amber-400 text-sm">⚠</span>
                                                    <p className="text-[10px] font-bold text-amber-300">
                                                        Difficulty total ({diffTotal}) ≠ Coding + Oral ({typeTotal}).
                                                        {diffTotal > typeTotal
                                                            ? ` Add ${diffTotal - typeTotal} to Coding or Oral.`
                                                            : ` Reduce Coding + Oral by ${typeTotal - diffTotal}.`}
                                                    </p>
                                                </div>
                                            )}
                                            {/* Level header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <p className={`text-sm font-black ${hasMismatch ? 'text-amber-300' : 'text-slate-200'}`}>{level}</p>
                                                <div className="flex gap-2 text-[10px] font-bold">
                                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">{easy} easy</span>
                                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{medium} med</span>
                                                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">{hard} hard</span>
                                                    <span className="bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full">💻 {coding} coding</span>
                                                    <span className="bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full">🗣 {oral} oral</span>
                                                </div>
                                            </div>

                                            {/* Question chips */}
                                            {questions.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {questions.map((q, i) => (
                                                        <div key={i} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${diffColor[q.diff]}`}>
                                                            <span>{q.type === 'coding' ? '💻' : '🗣'}</span>
                                                            <span>Q{i + 1}</span>
                                                            <span className="opacity-60">·</span>
                                                            <span className="capitalize">{q.diff}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 italic">No questions configured for this level.</p>
                                            )}

                                            {/* Summary line */}
                                            {total > 0 && (
                                                <p className="text-[10px] text-slate-500 mt-2.5 font-medium">
                                                    {total} total · {easy > 0 ? `${easy} easy` : ''}
                                                    {easy > 0 && medium > 0 ? ' → ' : ''}{medium > 0 ? `${medium} medium` : ''}
                                                    {(easy > 0 || medium > 0) && hard > 0 ? ' → ' : ''}{hard > 0 ? `${hard} hard` : ''}
                                                    {coding > 0 ? ` · ${coding} coding challenge${coding !== 1 ? 's' : ''}` : ''}
                                                    {oral > 0 ? ` · ${oral} oral` : ''}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── History Panel ── */}
                    {showHistory && (
                        <div className="bg-slate-800/60 border border-violet-500/20 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                                <div>
                                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                                        🕐 Change History — {roleObj.name}
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5">Last {changeLog.length} save{changeLog.length !== 1 ? 's' : ''} · stored locally in your browser</p>
                                </div>
                                {changeLog.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setChangeLog([]);
                                            try { localStorage.removeItem(`qconfig_log_${roleObj._id}`); } catch {}
                                        }}
                                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {changeLog.length === 0 ? (
                                <div className="px-5 py-8 text-center text-slate-500 text-sm italic">
                                    No changes saved yet for this role.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-700/30 max-h-72 overflow-y-auto">
                                    {changeLog.map((entry, ei) => {
                                        const d = new Date(entry.ts);
                                        const now = Date.now();
                                        const diffMs = now - entry.ts;
                                        const diffMin = Math.floor(diffMs / 60000);
                                        const diffHr  = Math.floor(diffMs / 3600000);
                                        const timeAgo = diffMin < 1 ? 'just now'
                                            : diffMin < 60 ? `${diffMin} min ago`
                                            : diffHr < 24  ? `${diffHr}h ago`
                                            : d.toLocaleDateString();

                                        // Group diffs by level
                                        const byLevel = entry.diffs.reduce((acc, d) => {
                                            if (!acc[d.level]) acc[d.level] = [];
                                            acc[d.level].push(d);
                                            return acc;
                                        }, {});

                                        return (
                                            <div key={ei} className="px-5 py-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        Save #{changeLog.length - ei}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-medium">{timeAgo}</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {Object.entries(byLevel).map(([level, diffs]) => (
                                                        <div key={level} className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[10px] font-black text-violet-400 shrink-0">{level}:</span>
                                                            {diffs.map((d, di) => (
                                                                <span key={di} className="text-[10px] font-bold bg-slate-700 border border-slate-600 px-2 py-0.5 rounded-full text-slate-300">
                                                                    {d.field} <span className="text-rose-400">{d.from}</span> → <span className="text-emerald-400">{d.to}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-16 text-slate-500">
                    {isLoading ? 'Loading roles…' : roles.length === 0 ? 'No roles yet — add one in the Roles tab first.' : 'Select a role above to configure question counts per level.'}
                </div>
            )}
        </div>
    );
}

// ─── MAIN ADMIN DASHBOARD ─────────────────────────────────────────────────────
export default function AdminDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { adminUser } = useSelector(s => s.admin);
    const [activeTab, setActiveTab] = useState('analytics');

    useEffect(() => {
        if (!adminUser) navigate('/admin/login');
    }, [adminUser, navigate]);

    const handleLogout = () => {
        dispatch(adminLogout());
        navigate('/admin/login');
        toast.info('Logged out of admin.');
    };

    const TAB_COMPONENTS = {
        analytics: AnalyticsTab,
        orgs: OrganizationsTab,
        students: StudentsTab,
        roles: RolesTab,
        skills: SkillsTab,
        questions: QuestionsTab,
        generate: GenerateTab,
        templates: TemplatesTab,
        config: QConfigTab,
    };
    const ActiveComponent = TAB_COMPONENTS[activeTab];

    if (!adminUser) return null;

    return (
        <div className="min-h-screen bg-slate-950">
            <header className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-teal-500/10 border border-teal-500/30 p-1.5 rounded-lg">
                            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <div>
                            <h1 className="font-black text-white text-sm uppercase tracking-tight">Admin Console</h1>
                            <p className="text-slate-500 text-xs">AI Interviewer Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs hidden sm:block">
                            <span className="text-slate-500">Logged in as</span> <span className="text-teal-400 font-bold">{adminUser.username || 'admin'}</span>
                        </span>
                        <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition active:scale-95">Logout</button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
                    <div className="flex gap-1 pb-0">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? 'text-teal-400 border-teal-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                            >
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
                                </svg>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <ActiveComponent key={activeTab} />
            </main>
        </div>
    );
}
