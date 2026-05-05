import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    orgAdminLogout, fetchOrgInfo, fetchOrgStudents,
    addOrgStudent, updateOrgStudent, deleteOrgStudent,
    bulkAddOrgStudents, fetchOrgAnalytics, fetchStudentSessions,
    fetchSubjectAnalytics, fetchRoleAnalytics,
    fetchDigestConfig, updateDigestConfig, sendDigestNow,
    fetchTeamGoals, sendNudge,
    fetchDepartments, addDepartment, deleteDepartment,
    fetchBatches, addBatch, updateBatch, deleteBatch, sendInvites,
    fetchDrives, createDrive, updateDrive, deleteDrive, closeDrive,
    fetchDriveLeaderboard,
    fetchQuestionPacks, createQuestionPack, updateQuestionPack, deleteQuestionPack,
    fetchAvailableQuestions,
} from '../features/orgAdmin/orgAdminSlice';
import { getSubjectIcon } from '../data/subjectCatalog';
import { getRoleIcon } from '../data/roleCatalog';

// ─── Shared UI primitives ──────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = 'primary', disabled, className = '', type = 'button' }) => {
    const base = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed';
    const styles = {
        primary: 'bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/20',
        outline: 'bg-transparent border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white',
        danger:  'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
        ghost:   'bg-slate-700/60 hover:bg-slate-700 text-slate-300',
    };
    return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};

const InputField = ({ label, note, ...props }) => (
    <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            {label}{note && <span className="text-slate-600 normal-case font-normal ml-1">{note}</span>}
        </label>
        <input {...props} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
    </div>
);

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                <h2 className="font-black text-white">{title}</h2>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition text-xl leading-none">×</button>
            </div>
            <div className="p-5">{children}</div>
        </div>
    </div>
);

const StatCard = ({ label, value, sub, color = 'teal' }) => {
    const colors = { teal: 'from-teal-500/10 border-teal-500/20 text-teal-400', blue: 'from-blue-500/10 border-blue-500/20 text-blue-400', violet: 'from-violet-500/10 border-violet-500/20 text-violet-400', green: 'from-green-500/10 border-green-500/20 text-green-400', amber: 'from-amber-500/10 border-amber-500/20 text-amber-400' };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-4`}>
            <div className={`text-2xl font-black ${colors[color].split(' ')[2]}`}>{value ?? '—'}</div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{label}</div>
            {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
        </div>
    );
};

const ScoreBadge = ({ score }) => {
    if (score == null) return <span className="text-slate-600 text-xs">No sessions</span>;
    const color = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';
    return <span className={`font-black text-sm ${color}`}>{Math.round(score)}%</span>;
};

const timeAgo = (date) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 30) return `${d}d ago`;
    return new Date(date).toLocaleDateString();
};

// ─── Student Sessions Modal ────────────────────────────────────────────────────
function StudentSessionsModal({ student, onClose }) {
    const dispatch = useDispatch();
    const { studentSessions, isLoading } = useSelector(s => s.orgAdmin);

    useEffect(() => { dispatch(fetchStudentSessions(student._id)); }, [dispatch, student._id]);

    return (
        <Modal title={`Sessions — ${student.name}`} onClose={onClose}>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {isLoading && <p className="text-center text-slate-500 py-8">Loading…</p>}
                {!isLoading && studentSessions.length === 0 && <p className="text-center text-slate-500 py-8">No sessions yet</p>}
                {studentSessions.map(s => (
                    <div key={s._id} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-bold text-sm text-white truncate">{s.role || 'Practice'}</p>
                            <p className="text-xs text-slate-500">{s.level} · {s.interviewType || 'Mixed'} · {new Date(s.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <ScoreBadge score={s.overallScore} />
                            <p className={`text-xs mt-0.5 ${s.status === 'completed' ? 'text-green-400' : 'text-slate-500'}`}>{s.status}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

// ─── Students Tab ──────────────────────────────────────────────────────────────
function StudentsTab({ orgInfo }) {
    const dispatch = useDispatch();
    const { students, isLoading, departments, batches } = useSelector(s => s.orgAdmin);
    const [modal, setModal]           = useState(null);
    const [sessionStudent, setSessionStudent] = useState(null);
    const [form, setForm]             = useState({ name: '', email: '', password: '', department: '', batch: '' });
    const [showPass, setShowPass]     = useState(false);
    const [search, setSearch]         = useState('');
    const [saving, setSaving]         = useState(false);
    const [bulkText, setBulkText]     = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [sortBy, setSortBy]         = useState('createdAt');
    const [deptFilter, setDeptFilter] = useState('');
    const [batchFilter, setBatchFilter] = useState('');
    const [showInvite, setShowInvite]   = useState(false);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteDept, setInviteDept]   = useState('');
    const [inviteBatch, setInviteBatch] = useState('');
    const [inviteSending, setInviteSending] = useState(false);
    const [showGroups, setShowGroups] = useState(false);
    const [newDept, setNewDept]       = useState('');
    const [newBatch, setNewBatch]     = useState({ name: '', targetScore: '', targetDate: '' });
    const [addingDept, setAddingDept] = useState(false);
    const [addingBatch, setAddingBatch] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null); // { id, targetScore, targetDate }
    const [savingBatch, setSavingBatch]   = useState(false);

    useEffect(() => { dispatch(fetchDepartments()); dispatch(fetchBatches()); }, [dispatch]);
    useEffect(() => { dispatch(fetchOrgStudents({ department: deptFilter, batch: batchFilter })); }, [dispatch, deptFilter, batchFilter]);

    const openAdd  = () => { setForm({ name: '', email: '', password: '', department: '', batch: '' }); setShowPass(false); setModal('add'); };
    const openEdit = (s) => { setForm({ name: s.name, email: s.email, password: '', department: s.department || '', batch: s.batch || '' }); setShowPass(false); setModal({ type: 'edit', id: s._id }); };

    const handleSave = async () => {
        setSaving(true);
        if (modal === 'add') {
            const res = await dispatch(addOrgStudent(form));
            if (!res.error) { toast.success('Student added!'); setModal(null); }
            else toast.error(res.payload);
        } else {
            const body = { name: form.name, email: form.email, department: form.department, batch: form.batch };
            if (form.password) body.password = form.password;
            const res = await dispatch(updateOrgStudent({ id: modal.id, body }));
            if (!res.error) { toast.success('Student updated!'); setModal(null); }
            else toast.error(res.payload);
        }
        setSaving(false);
    };

    const handleDelete = async (s) => {
        if (!window.confirm(`Remove "${s.name}"? Their session history will remain.`)) return;
        const res = await dispatch(deleteOrgStudent(s._id));
        if (!res.error) toast.success('Student removed.');
        else toast.error(res.payload);
    };

    const handleBulkAdd = async () => {
        const lines = bulkText.trim().split('\n').filter(l => l.trim());
        if (!lines.length) { toast.error('No data entered'); return; }
        const students = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 3) return { name: parts[0], email: parts[1], password: parts[2] };
            if (parts.length === 2) return { name: parts[0], email: parts[1] };
            return { email: parts[0] };
        }).filter(s => s.email);
        if (!students.length) { toast.error('No valid email addresses found'); return; }
        setBulkLoading(true);
        const res = await dispatch(bulkAddOrgStudents(students));
        if (!res.error) {
            const { created, skipped, errors } = res.payload;
            toast.success(`${created} student${created !== 1 ? 's' : ''} added${skipped ? `, ${skipped} skipped` : ''}`);
            if (errors?.length) errors.forEach(e => toast.warning(e, { autoClose: 5000 }));
            setBulkText('');
            setModal(null);
            dispatch(fetchOrgStudents());
        } else toast.error(res.payload);
        setBulkLoading(false);
    };

    const handleInvite = async () => {
        const emails = inviteEmails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
        if (!emails.length) { toast.error('Enter at least one email address'); return; }
        setInviteSending(true);
        const res = await dispatch(sendInvites({ emails, department: inviteDept || undefined, batch: inviteBatch || undefined }));
        if (!res.error) {
            const { sent, failed, notDelivered, alreadyExists } = res.payload;
            if (sent > 0) toast.success(`${sent} invite${sent !== 1 ? 's' : ''} sent!`);
            if (alreadyExists > 0) toast.warning(`${alreadyExists} already registered`);
            if (notDelivered > 0) toast.warning(`${notDelivered} invite link${notDelivered !== 1 ? 's' : ''} generated but not emailed (SMTP not configured)`);
            if (failed > 0) toast.error(`${failed} failed to send`);
            setInviteEmails(''); setInviteDept(''); setInviteBatch(''); setShowInvite(false);
        } else toast.error(res.payload);
        setInviteSending(false);
    };

    const handleAddDept = async () => {
        if (!newDept.trim()) return;
        setAddingDept(true);
        const res = await dispatch(addDepartment(newDept.trim()));
        if (!res.error) { setNewDept(''); } else toast.error(res.payload);
        setAddingDept(false);
    };

    const handleDeleteDept = async (name) => {
        if (!window.confirm(`Remove department "${name}"?`)) return;
        const res = await dispatch(deleteDepartment(name));
        if (res.error) toast.error(res.payload);
        if (deptFilter === name) setDeptFilter('');
    };

    const handleAddBatch = async () => {
        if (!newBatch.name.trim()) return;
        setAddingBatch(true);
        const res = await dispatch(addBatch({
            name:        newBatch.name.trim(),
            targetScore: newBatch.targetScore ? Number(newBatch.targetScore) : null,
            targetDate:  newBatch.targetDate || null,
        }));
        if (!res.error) { setNewBatch({ name: '', targetScore: '', targetDate: '' }); } else toast.error(res.payload);
        setAddingBatch(false);
    };

    const handleDeleteBatch = async (id, name) => {
        if (!window.confirm(`Remove batch "${name}"?`)) return;
        const res = await dispatch(deleteBatch(id));
        if (res.error) toast.error(res.payload);
        if (batchFilter === name) setBatchFilter('');
    };

    const handleUpdateBatch = async () => {
        if (!editingBatch) return;
        setSavingBatch(true);
        const res = await dispatch(updateBatch({
            id:          editingBatch.id,
            body:        { targetScore: editingBatch.targetScore ? Number(editingBatch.targetScore) : null, targetDate: editingBatch.targetDate || null },
        }));
        if (!res.error) { setEditingBatch(null); } else toast.error(res.payload);
        setSavingBatch(false);
    };

    const isCorporate = orgInfo?.type === 'corporate';

    const sorted = [...students].sort((a, b) => {
        if (sortBy === 'name')      return a.name.localeCompare(b.name);
        if (sortBy === 'score')     return (b.avgScore || 0) - (a.avgScore || 0);
        if (sortBy === 'readiness') return (b.readinessScore || 0) - (a.readinessScore || 0);
        if (sortBy === 'sessions')  return (b.totalSessions || 0) - (a.totalSessions || 0);
        if (sortBy === 'active')    return new Date(b.lastActive || 0) - new Date(a.lastActive || 0);
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const filtered = sorted.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    });

    const atLimit = orgInfo && students.length >= orgInfo.maxUsers;
    const usagePct = orgInfo ? Math.min(100, Math.round((students.length / orgInfo.maxUsers) * 100)) : 0;

    return (
        <div className="space-y-5">
            {/* Usage bar */}
            {orgInfo && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-300">User capacity</span>
                        <span className="text-sm font-black text-white">{students.length} / {orgInfo.maxUsers}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${usagePct}%` }} />
                    </div>
                    {atLimit && <p className="text-xs text-red-400 font-bold mt-1.5">Limit reached — upgrade plan to add more students</p>}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input type="text" placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {departments?.length > 0 && (
                        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition">
                            <option value="">All Depts</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                    {batches?.length > 0 && (
                        <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition">
                            <option value="">All Batches</option>
                            {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                        </select>
                    )}
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition">
                        <option value="createdAt">Newest</option>
                        <option value="name">Name A–Z</option>
                        <option value="score">Top Score</option>
                        {isCorporate && <option value="readiness">Readiness ↓</option>}
                        <option value="sessions">Most Sessions</option>
                        <option value="active">Last Active</option>
                    </select>
                    <Btn variant="ghost" onClick={() => setShowGroups(s => !s)}>
                        {showGroups ? 'Hide Groups' : '⊞ Groups'}
                    </Btn>
                    <Btn variant="ghost" onClick={() => setShowInvite(true)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        Invite
                    </Btn>
                    <Btn variant="ghost" onClick={() => setModal('bulk')} disabled={atLimit}>Bulk Add</Btn>
                    <Btn onClick={openAdd} disabled={atLimit}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                        Add
                    </Btn>
                </div>
            </div>

            {/* Groups management panel */}
            {showGroups && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-5">
                    <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest">Departments & Batches</h3>

                    {/* Departments */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Departments</p>
                        <div className="flex flex-wrap gap-2">
                            {departments?.map(d => (
                                <div key={d} className="flex items-center gap-1.5 bg-slate-700/60 border border-slate-600/40 rounded-lg px-3 py-1.5">
                                    <span className="text-xs font-bold text-slate-300">{d}</span>
                                    <button onClick={() => handleDeleteDept(d)} className="text-slate-500 hover:text-red-400 ml-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                    </button>
                                </div>
                            ))}
                            {(!departments || departments.length === 0) && <p className="text-xs text-slate-600">No departments yet</p>}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)}
                                placeholder="New department name…"
                                onKeyDown={e => e.key === 'Enter' && handleAddDept()}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                            <Btn onClick={handleAddDept} disabled={addingDept || !newDept.trim()}>{addingDept ? '…' : 'Add'}</Btn>
                        </div>
                    </div>

                    {/* Batches */}
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Batches</p>
                        <div className="space-y-1.5">
                            {batches?.map(b => (
                                <div key={b._id} className="bg-slate-700/40 border border-slate-600/30 rounded-xl px-3 py-2 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-200">{b.name}</p>
                                            {(b.targetScore || b.targetDate) && (
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {b.targetScore ? `Goal: ${b.targetScore}%` : ''}
                                                    {b.targetScore && b.targetDate ? ' · ' : ''}
                                                    {b.targetDate ? `By: ${new Date(b.targetDate).toLocaleDateString()}` : ''}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setEditingBatch(editingBatch?.id === b._id ? null : { id: b._id, targetScore: b.targetScore ?? '', targetDate: b.targetDate ? b.targetDate.split('T')[0] : '' })}
                                            className="text-slate-500 hover:text-teal-400 transition"
                                            title="Edit goal"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                        </button>
                                        <button onClick={() => handleDeleteBatch(b._id, b.name)} className="text-slate-500 hover:text-red-400 transition">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                    </div>
                                    {/* Inline goal editor */}
                                    {editingBatch?.id === b._id && (
                                        <div className="border-t border-slate-600/40 pt-2 flex flex-wrap items-center gap-2">
                                            <input type="number" min="0" max="100" value={editingBatch.targetScore}
                                                onChange={e => setEditingBatch(eb => ({ ...eb, targetScore: e.target.value }))}
                                                placeholder="Target %"
                                                className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
                                            <input type="date" value={editingBatch.targetDate}
                                                onChange={e => setEditingBatch(eb => ({ ...eb, targetDate: e.target.value }))}
                                                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500" />
                                            <Btn onClick={handleUpdateBatch} disabled={savingBatch} className="!text-xs !px-3 !py-1.5">
                                                {savingBatch ? '…' : 'Save'}
                                            </Btn>
                                            <button onClick={() => setEditingBatch(null)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {(!batches || batches.length === 0) && <p className="text-xs text-slate-600">No batches yet</p>}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" value={newBatch.name} onChange={e => setNewBatch(b => ({ ...b, name: e.target.value }))}
                                placeholder="Batch name…"
                                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                            <input type="number" min="0" max="100" value={newBatch.targetScore} onChange={e => setNewBatch(b => ({ ...b, targetScore: e.target.value }))}
                                placeholder="Target % (opt)"
                                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                            <input type="date" value={newBatch.targetDate} onChange={e => setNewBatch(b => ({ ...b, targetDate: e.target.value }))}
                                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                        </div>
                        <Btn onClick={handleAddBatch} disabled={addingBatch || !newBatch.name.trim()}>{addingBatch ? 'Adding…' : 'Add Batch'}</Btn>
                    </div>
                </div>
            )}

            {/* Student list */}
            {isLoading && students.length === 0 ? (
                <div className="text-center py-16 text-slate-500">Loading…</div>
            ) : filtered.length === 0 && students.length > 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <p className="font-bold text-slate-400 mb-1">No students match your search</p>
                    <button onClick={() => setSearch('')} className="text-sm text-teal-400 hover:text-teal-300">Clear search</button>
                </div>
            ) : students.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <p className="text-slate-400 font-bold mb-1">No students yet</p>
                    <p className="text-sm mb-4">Add your first student or use Bulk Add to import many at once.</p>
                    <Btn onClick={openAdd}>Add First Student</Btn>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map(s => {
                        const inactive    = s.lastActive && (Date.now() - new Date(s.lastActive).getTime() > 7 * 86400000);
                        const lowScore    = s.avgScore != null && s.avgScore < 40;
                        const noRoleWork  = isCorporate && s.completedSessions > 0 && s.readinessCount === 0;
                        const rs          = s.readinessScore != null ? Math.round(s.readinessScore) : null;
                        const rsColor     = rs == null ? 'text-slate-500' : rs >= 70 ? 'text-green-400' : rs >= 40 ? 'text-amber-400' : 'text-red-400';
                        const rsBg        = rs == null ? 'bg-slate-700/60 border-slate-600/40' : rs >= 70 ? 'bg-green-500/10 border-green-500/20' : rs >= 40 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';
                        const LEVEL_COLORS_MAP = {
                            'Junior':    'bg-sky-500/20 text-sky-300',
                            'Mid-Level': 'bg-violet-500/20 text-violet-300',
                            'Senior':    'bg-amber-500/20 text-amber-300',
                        };
                        return (
                            <div key={s._id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 hover:border-slate-600 transition-all">
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                                        <span className="text-teal-300 font-black text-sm">{s.name?.charAt(0)?.toUpperCase()}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Name row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-black text-white">{s.name}</span>
                                            {(inactive || lowScore) && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                                                    {lowScore ? 'Low score' : 'Inactive'}
                                                </span>
                                            )}
                                            {noRoleWork && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-400 font-bold">
                                                    No role sessions
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-slate-400 text-xs mt-0.5">{s.email}</p>

                                        {/* Dept / Batch tags (college) */}
                                        {!isCorporate && (s.department || s.batch) && (
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                {s.department && (
                                                    <span className="text-[9px] font-black bg-teal-500/10 border border-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                        {s.department}
                                                    </span>
                                                )}
                                                {s.batch && (
                                                    <span className="text-[9px] font-black bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                        {s.batch}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Corporate profile row */}
                                        {isCorporate && (s.preferredRole || s.preferredLevel) && (
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Role:</span>
                                                <span className="text-[10px] font-bold text-slate-300">{s.preferredRole || '—'}</span>
                                                {s.preferredLevel && (
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${LEVEL_COLORS_MAP[s.preferredLevel] || 'bg-slate-700 text-slate-400'}`}>
                                                        {s.preferredLevel}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Stats row */}
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                            <span className="text-xs text-slate-500">Sessions: <span className="text-slate-300 font-bold">{s.totalSessions || 0}</span></span>
                                            <span className="text-xs text-slate-500">Completed: <span className="text-slate-300 font-bold">{s.completedSessions || 0}</span></span>
                                            <span className="text-xs text-slate-500">Avg: <ScoreBadge score={s.avgScore} /></span>
                                            <span className="text-xs text-slate-500">Last active: <span className="text-slate-300">{timeAgo(s.lastActive)}</span></span>
                                        </div>
                                    </div>

                                    {/* Readiness badge (corporate only) */}
                                    {isCorporate && (
                                        <div className={`shrink-0 flex flex-col items-center justify-center border rounded-xl px-3 py-2 min-w-[64px] ${rsBg}`}>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Readiness</p>
                                            {rs != null ? (
                                                <>
                                                    <p className={`text-lg font-black leading-none ${rsColor}`}>{rs}<span className="text-[10px] text-slate-600">%</span></p>
                                                    <p className="text-[8px] text-slate-600 mt-0.5">{s.readinessCount} session{s.readinessCount !== 1 ? 's' : ''}</p>
                                                </>
                                            ) : (
                                                <p className="text-[10px] text-slate-500 font-bold leading-tight text-center">Not<br/>started</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-1.5 shrink-0">
                                        <Btn variant="ghost" onClick={() => setSessionStudent(s)}>Sessions</Btn>
                                        <Btn variant="ghost" onClick={() => openEdit(s)}>Edit</Btn>
                                        <Btn variant="danger" onClick={() => handleDelete(s)}>Del</Btn>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit modal */}
            {(modal === 'add' || (modal?.type === 'edit')) && (
                <Modal title={modal === 'add' ? 'Add Student' : 'Edit Student'} onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <InputField label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
                        <InputField label="Email Address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@college.edu" />
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                                Password {modal?.type === 'edit' && <span className="text-slate-600 normal-case font-normal">(leave blank to keep current)</span>}
                            </label>
                            <div className="relative">
                                <input type={showPass ? 'text' : 'password'} value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder={modal === 'add' ? 'Set initial password' : '••••••••'}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                                <button type="button" onClick={() => setShowPass(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {showPass
                                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"/>
                                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>}
                                    </svg>
                                </button>
                            </div>
                        </div>
                        {/* Dept / Batch assignment (college) */}
                        {!isCorporate && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Department</label>
                                    <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                                        <option value="">None</option>
                                        {departments?.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Batch</label>
                                    <select value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                                        <option value="">None</option>
                                        {batches?.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn className="flex-1" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : modal === 'add' ? 'Add Student' : 'Save Changes'}
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Invite by Email modal */}
            {showInvite && (
                <Modal title="Invite Students by Email" onClose={() => { setShowInvite(false); setInviteEmails(''); setInviteDept(''); setInviteBatch(''); }}>
                    <div className="space-y-4">
                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-xs text-slate-400 space-y-1">
                            <p className="font-bold text-slate-300">Send personalised invite links via email.</p>
                            <p>Enter one email per line, or separate with commas. Each invite link is valid for 7 days.</p>
                        </div>
                        {/* Dept / Batch pre-assignment (college only) */}
                        {!isCorporate && (departments?.length > 0 || batches?.length > 0) && (
                            <div className="grid grid-cols-2 gap-3">
                                {departments?.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Department <span className="normal-case font-normal text-slate-600">(optional)</span></label>
                                        <select value={inviteDept} onChange={e => { setInviteDept(e.target.value); setInviteBatch(''); }}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                                            <option value="">None</option>
                                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                )}
                                {batches?.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Batch <span className="normal-case font-normal text-slate-600">(optional)</span></label>
                                        <select value={inviteBatch} onChange={e => setInviteBatch(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                                            <option value="">None</option>
                                            {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Email Addresses</label>
                            <textarea value={inviteEmails} onChange={e => setInviteEmails(e.target.value)} rows={6}
                                placeholder={'priya@college.edu\nrahul@college.edu\ndev@college.edu'}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition resize-none" />
                            <p className="text-xs text-slate-600 mt-1">
                                {inviteEmails.split(/[\n,]+/).map(e => e.trim()).filter(Boolean).length} email(s) entered
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Btn variant="outline" className="flex-1" onClick={() => { setShowInvite(false); setInviteEmails(''); setInviteDept(''); setInviteBatch(''); }}>Cancel</Btn>
                            <Btn className="flex-1" onClick={handleInvite} disabled={inviteSending}>
                                {inviteSending ? 'Sending…' : 'Send Invites'}
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Bulk Add modal */}
            {modal === 'bulk' && (
                <Modal title="Bulk Add Students" onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-xs text-slate-400 space-y-1">
                            <p className="font-bold text-slate-300">Format — one student per line:</p>
                            <p className="font-mono text-teal-400">Name, Email, Password</p>
                            <p className="font-mono text-slate-500">Name, Email &nbsp;&nbsp;&nbsp;&nbsp;(auto password)</p>
                            <p className="font-mono text-slate-500">Email only &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(auto name + password)</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Student Data</label>
                            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={10}
                                placeholder={'Priya Sharma, priya@mit.edu, pass123\nRahul Kumar, rahul@mit.edu\ndev@mit.edu'}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500 transition resize-none" />
                            <p className="text-xs text-slate-600 mt-1">
                                {bulkText.trim().split('\n').filter(l => l.trim()).length} lines entered
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Btn variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
                            <Btn className="flex-1" onClick={handleBulkAdd} disabled={bulkLoading}>
                                {bulkLoading ? 'Adding…' : 'Add All Students'}
                            </Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Session history modal */}
            {sessionStudent && <StudentSessionsModal student={sessionStudent} onClose={() => setSessionStudent(null)} />}
        </div>
    );
}

// ─── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({ orgInfo }) {
    const dispatch = useDispatch();
    const { analytics, isLoading, departments, batches } = useSelector(s => s.orgAdmin);
    const [deptFilter, setDeptFilter] = useState('');
    const [batchFilter, setBatchFilter] = useState('');
    const isCorporate = orgInfo?.type === 'corporate';

    useEffect(() => { dispatch(fetchDepartments()); dispatch(fetchBatches()); }, [dispatch]);
    useEffect(() => { dispatch(fetchOrgAnalytics({ department: deptFilter, batch: batchFilter })); }, [dispatch, deptFilter, batchFilter]);

    if (isLoading && !analytics) return <div className="text-center py-16 text-slate-500">Loading analytics…</div>;
    if (!analytics) return null;

    const { totalStudents, totalSessions, completedSessions, avgScore, recentSessions = [], dailyActivity = [] } = analytics;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    const maxActivity = Math.max(...dailyActivity.map(d => d.count), 1);

    return (
        <div className="space-y-6">
            {/* Dept / Batch filters (college only) */}
            {!isCorporate && (departments?.length > 0 || batches?.length > 0) && (
                <div className="flex flex-wrap gap-3">
                    {departments?.length > 0 && (
                        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setBatchFilter(''); }}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                    {batches?.length > 0 && (
                        <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition">
                            <option value="">All Batches</option>
                            {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                        </select>
                    )}
                    {(deptFilter || batchFilter) && (
                        <button onClick={() => { setDeptFilter(''); setBatchFilter(''); }}
                            className="text-xs text-slate-500 hover:text-slate-300 transition">Clear filters</button>
                    )}
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Students" value={totalStudents} color="teal" />
                <StatCard label="Sessions" value={totalSessions} color="blue" />
                <StatCard label="Completion" value={`${completionRate}%`} color="green" />
                <StatCard label="Avg Score" value={avgScore > 0 ? `${avgScore}%` : '—'} color="violet" />
            </div>

            {/* Activity chart */}
            {dailyActivity.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                    <h3 className="font-black text-white mb-4">Sessions — Last 30 Days</h3>
                    <div className="flex items-end gap-1 h-24">
                        {dailyActivity.map(d => (
                            <div key={d._id} className="flex-1 flex flex-col items-center gap-1 group" title={`${d._id}: ${d.count} sessions`}>
                                <div className="w-full bg-teal-500/80 rounded-sm transition-all group-hover:bg-teal-400"
                                    style={{ height: `${(d.count / maxActivity) * 100}%`, minHeight: 2 }} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                        <span>{dailyActivity[0]?._id}</span>
                        <span>{dailyActivity[dailyActivity.length - 1]?._id}</span>
                    </div>
                </div>
            )}

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
                    <h3 className="font-black text-white mb-4">Recent Sessions</h3>
                    <div className="space-y-2">
                        {recentSessions.map(s => (
                            <div key={s._id} className="flex items-center justify-between gap-3 border-b border-slate-700/40 pb-2 last:border-0 last:pb-0">
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-white truncate">{s.user?.name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500">{s.role} · {s.level} · {new Date(s.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <ScoreBadge score={s.overallScore} />
                                    <p className={`text-xs mt-0.5 ${s.status === 'completed' ? 'text-green-400' : 'text-slate-500'}`}>{s.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {totalSessions === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <p className="font-bold text-slate-400 mb-1">No sessions yet</p>
                    <p className="text-sm">Analytics will appear once your students start practicing.</p>
                </div>
            )}
        </div>
    );
}

// ─── Subject Analytics Tab ─────────────────────────────────────────────────────
function SubjectAnalyticsTab({ orgInfo }) {
    const dispatch = useDispatch();
    const { subjectAnalytics, isLoading, departments, batches } = useSelector(s => s.orgAdmin);
    const [expanded, setExpanded]     = useState(null);
    const [deptFilter, setDeptFilter] = useState('');
    const [batchFilter, setBatchFilter] = useState('');

    useEffect(() => { dispatch(fetchDepartments()); dispatch(fetchBatches()); }, [dispatch]);
    useEffect(() => { dispatch(fetchSubjectAnalytics({ department: deptFilter, batch: batchFilter })); }, [dispatch, deptFilter, batchFilter]);

    if (isLoading && !subjectAnalytics) {
        return <div className="text-center py-16 text-slate-500">Loading subject analytics…</div>;
    }
    if (!subjectAnalytics) return null;

    const { subjects } = subjectAnalytics;
    const country = orgInfo?.country || '';

    const totalSessions  = subjects.reduce((a, s) => a + s.total, 0);
    const totalCompleted = subjects.reduce((a, s) => a + s.completed, 0);
    const scoredSubjects = subjects.filter(s => s.avgScore != null);
    const overallAvg = scoredSubjects.length
        ? Math.round(scoredSubjects.reduce((a, s) => a + s.avgScore, 0) / scoredSubjects.length * 10) / 10
        : null;

    if (subjects.length === 0) return (
        <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">📚</p>
            <p className="font-bold text-slate-400 mb-1">No subject data yet</p>
            <p className="text-sm">Analytics will appear once students start practicing subjects.</p>
        </div>
    );

    const SEMESTER_ORDER = [
        '1st Semester','2nd Semester','3rd Semester','4th Semester',
        '5th Semester','6th Semester','7th Semester','8th Semester',
    ];
    const sortedSemesters = (sems) =>
        [...sems].sort((a, b) => SEMESTER_ORDER.indexOf(a.semester) - SEMESTER_ORDER.indexOf(b.semester));

    const scoreColor = (score) => {
        if (score == null) return 'text-slate-600';
        if (score >= 70) return 'text-green-400';
        if (score >= 40) return 'text-amber-400';
        return 'text-red-400';
    };
    const barColor = (score) => {
        if (score == null) return 'bg-slate-600';
        if (score >= 70) return 'bg-green-500';
        if (score >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-5">
            {/* Dept / batch filter row */}
            {(departments?.length > 0 || batches?.length > 0) && (
                <div className="flex flex-wrap gap-2">
                    {departments?.length > 0 && (
                        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition">
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                    {batches?.length > 0 && (
                        <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition">
                            <option value="">All Batches</option>
                            {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                        </select>
                    )}
                    {(deptFilter || batchFilter) && (
                        <button onClick={() => { setDeptFilter(''); setBatchFilter(''); }}
                            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl transition">
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Active Subjects"  value={subjects.length}            color="teal"   />
                <StatCard label="Total Sessions"   value={totalSessions}              color="blue"   />
                <StatCard label="Completed"        value={totalCompleted}             color="green"  />
                <StatCard label="Avg Score"        value={overallAvg ? `${overallAvg}%` : '—'} color="violet" />
            </div>

            {/* Subject cards */}
            <div className="space-y-3">
                {subjects.map(s => {
                    const isOpen = expanded === s.subject;
                    const completionPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                    const icon = getSubjectIcon(s.subject, country);
                    return (
                        <div key={s.subject} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden transition-all">
                            {/* Header row — clickable to expand */}
                            <button
                                onClick={() => setExpanded(isOpen ? null : s.subject)}
                                className="w-full p-4 flex items-center gap-4 hover:bg-slate-800/80 transition text-left"
                            >
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg shrink-0">
                                    {icon}
                                </div>

                                {/* Name + meta */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-white text-sm leading-tight truncate">{s.subject}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        {/* Completion bar */}
                                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-[120px]">
                                            <div
                                                className={`h-full rounded-full ${barColor(s.avgScore)}`}
                                                style={{ width: `${completionPct}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-medium shrink-0">
                                            {s.completed}/{s.total} done · {s.uniqueStudents} student{s.uniqueStudents !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Avg score */}
                                {s.avgScore != null && (
                                    <div className="text-right shrink-0">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Avg</p>
                                        <p className={`text-base font-black leading-none ${scoreColor(s.avgScore)}`}>{s.avgScore}%</p>
                                    </div>
                                )}

                                {/* Top student */}
                                {s.topStudent && (
                                    <div className="text-right shrink-0 hidden sm:block">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Top</p>
                                        <p className="text-xs font-bold text-amber-400 leading-none mt-0.5">
                                            {s.topStudent.name.split(' ')[0]}
                                        </p>
                                        <p className="text-[10px] text-amber-500/70">{s.topStudent.score}%</p>
                                    </div>
                                )}

                                {/* Semesters count badge */}
                                <div className="shrink-0 flex items-center gap-2">
                                    {s.semesters.length > 0 && (
                                        <span className="text-[9px] font-black uppercase text-slate-600 bg-slate-700/60 px-1.5 py-0.5 rounded-full">
                                            {s.semesters.length} sem
                                        </span>
                                    )}
                                    <svg
                                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </div>
                            </button>

                            {/* Expanded: semester breakdown */}
                            {isOpen && (
                                <div className="border-t border-slate-700/50 bg-slate-900/40 px-5 py-4 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                        Semester Breakdown
                                    </p>
                                    {sortedSemesters(s.semesters).map(sem => {
                                        const semPct = sem.total > 0 ? Math.round((sem.completed / sem.total) * 100) : 0;
                                        return (
                                            <div key={sem.semester} className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400 font-bold w-28 shrink-0">{sem.semester}</span>
                                                {/* Completion fill bar */}
                                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${barColor(sem.avgScore)}`}
                                                        style={{ width: `${semPct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-500 w-20 text-right shrink-0">
                                                    {sem.completed}/{sem.total} done
                                                </span>
                                                <div className="w-12 text-right shrink-0">
                                                    {sem.avgScore != null
                                                        ? <span className={`text-xs font-black ${scoreColor(sem.avgScore)}`}>{sem.avgScore}%</span>
                                                        : <span className="text-xs text-slate-600">—</span>
                                                    }
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Per-subject leaderboard */}
                                    {s.top5 && s.top5.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/40">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                                Subject Leaderboard
                                            </p>
                                            <div className="space-y-2.5">
                                                {s.top5.map(entry => {
                                                    const MEDALS = ['🥇', '🥈', '🥉'];
                                                    const scoreCls = entry.bestScore >= 70 ? 'text-green-400' : entry.bestScore >= 40 ? 'text-amber-400' : 'text-red-400';
                                                    const barCls   = entry.bestScore >= 70 ? 'bg-green-500' : entry.bestScore >= 40 ? 'bg-amber-500' : 'bg-red-500';
                                                    return (
                                                        <div key={entry.rank} className="flex items-center gap-3">
                                                            {/* Rank */}
                                                            <div className="w-6 text-center shrink-0">
                                                                {entry.rank <= 3
                                                                    ? <span className="text-lg leading-none">{MEDALS[entry.rank - 1]}</span>
                                                                    : <span className="text-xs font-black text-slate-500">#{entry.rank}</span>
                                                                }
                                                            </div>
                                                            {/* Name + bar */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-xs font-bold text-slate-200 truncate">{entry.name}</p>
                                                                    <span className="text-[9px] text-slate-600 shrink-0">
                                                                        {entry.sessions} session{entry.sessions !== 1 ? 's' : ''}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${barCls}`}
                                                                        style={{ width: `${entry.bestScore}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {/* Best score */}
                                                            <div className="shrink-0 text-right w-12">
                                                                <p className={`text-sm font-black leading-none ${scoreCls}`}>{entry.bestScore}<span className="text-[10px] text-slate-500">%</span></p>
                                                                <p className="text-[9px] text-slate-600 mt-0.5">best</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Role Analytics Tab ────────────────────────────────────────────────────────
function RoleAnalyticsTab() {
    const dispatch = useDispatch();
    const { roleAnalytics, isLoading } = useSelector(s => s.orgAdmin);
    const [expanded, setExpanded] = useState(null);

    useEffect(() => { dispatch(fetchRoleAnalytics()); }, [dispatch]);

    if (isLoading && !roleAnalytics) {
        return <div className="text-center py-16 text-slate-500">Loading role analytics…</div>;
    }
    if (!roleAnalytics) return null;

    const { roles, distribution = [] } = roleAnalytics;

    // Build a grouped structure: role → { Junior: N, Mid-Level: N, Senior: N, total: N }
    const LEVEL_COLORS = {
        'Junior':    { bg: 'bg-sky-500/20',    text: 'text-sky-300',    bar: 'bg-sky-500' },
        'Mid-Level': { bg: 'bg-violet-500/20', text: 'text-violet-300', bar: 'bg-violet-500' },
        'Senior':    { bg: 'bg-amber-500/20',  text: 'text-amber-300',  bar: 'bg-amber-500' },
    };
    const LEVEL_ORDER = ['Junior', 'Mid-Level', 'Senior'];

    const distByRole = {};
    let distTotal = 0;
    for (const d of distribution) {
        const role  = d._id.role  || 'Unset';
        const level = d._id.level || 'Junior';
        if (!distByRole[role]) distByRole[role] = { total: 0 };
        distByRole[role][level] = (distByRole[role][level] || 0) + d.count;
        distByRole[role].total += d.count;
        distTotal += d.count;
    }
    const distRoles = Object.entries(distByRole)
        .map(([role, counts]) => ({ role, ...counts }))
        .sort((a, b) => b.total - a.total);

    const totalSessions  = roles.reduce((a, r) => a + r.total, 0);
    const totalCompleted = roles.reduce((a, r) => a + r.completed, 0);
    const scoredRoles    = roles.filter(r => r.avgScore != null);
    const overallAvg     = scoredRoles.length
        ? Math.round(scoredRoles.reduce((a, r) => a + r.avgScore, 0) / scoredRoles.length * 10) / 10
        : null;

    if (roles.length === 0) return (
        <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">🏢</p>
            <p className="font-bold text-slate-400 mb-1">No role data yet</p>
            <p className="text-sm">Analytics will appear once employees start practicing.</p>
        </div>
    );

    const scoreColor = (score) => {
        if (score == null) return 'text-slate-600';
        if (score >= 70) return 'text-green-400';
        if (score >= 40) return 'text-amber-400';
        return 'text-red-400';
    };
    const barColor = (score) => {
        if (score == null) return 'bg-slate-600';
        if (score >= 70) return 'bg-green-500';
        if (score >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Active Roles"    value={roles.length}                         color="violet" />
                <StatCard label="Total Sessions"  value={totalSessions}                        color="blue"   />
                <StatCard label="Completed"       value={totalCompleted}                       color="green"  />
                <StatCard label="Avg Score"       value={overallAvg ? `${overallAvg}%` : '—'} color="amber"  />
            </div>

            {/* Team Distribution: profile-based role+level breakdown */}
            {distRoles.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Distribution</p>
                            <p className="text-xs text-slate-500 mt-0.5">Employee headcount by registered role &amp; level — based on profile, not sessions</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-white">{distTotal}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">total employees</p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {LEVEL_ORDER.map(lvl => (
                            <div key={lvl} className="flex items-center gap-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${LEVEL_COLORS[lvl]?.bar || 'bg-slate-500'}`} />
                                <span className="text-[10px] font-bold text-slate-400">{lvl}</span>
                            </div>
                        ))}
                    </div>

                    {/* Stacked bar rows */}
                    <div className="space-y-3">
                        {distRoles.map(({ role, total, ...levels }) => {
                            const icon = getRoleIcon(role);
                            const pct = distTotal > 0 ? Math.round((total / distTotal) * 100) : 0;
                            return (
                                <div key={role} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm shrink-0">{icon}</span>
                                            <p className="text-xs font-bold text-slate-200 truncate">{role}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {LEVEL_ORDER.filter(l => levels[l]).map(lvl => (
                                                <span key={lvl} className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[lvl]?.bg} ${LEVEL_COLORS[lvl]?.text}`}>
                                                    {levels[lvl]} {lvl}
                                                </span>
                                            ))}
                                            <span className="text-[10px] text-slate-500 font-bold w-8 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                    {/* Stacked bar */}
                                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-700 gap-px">
                                        {LEVEL_ORDER.filter(l => levels[l]).map(lvl => (
                                            <div
                                                key={lvl}
                                                className={`h-full transition-all ${LEVEL_COLORS[lvl]?.bar || 'bg-slate-500'}`}
                                                style={{ width: `${Math.round((levels[lvl] / distTotal) * 100)}%` }}
                                                title={`${levels[lvl]} ${lvl}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Role cards */}
            <div className="space-y-3">
                {roles.map(r => {
                    const isOpen = expanded === r.role;
                    const completionPct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
                    const icon = getRoleIcon(r.role);
                    const sortedLevels = [...r.levels].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
                    return (
                        <div key={r.role} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden transition-all">
                            {/* Header row */}
                            <button
                                onClick={() => setExpanded(isOpen ? null : r.role)}
                                className="w-full p-4 flex items-center gap-4 hover:bg-slate-800/80 transition text-left"
                            >
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg shrink-0">
                                    {icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-white text-sm leading-tight truncate">{r.role}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-[120px]">
                                            <div
                                                className={`h-full rounded-full ${barColor(r.avgScore)}`}
                                                style={{ width: `${completionPct}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-medium shrink-0">
                                            {r.completed}/{r.total} done · {r.uniqueEmployees} employee{r.uniqueEmployees !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                {r.avgScore != null && (
                                    <div className="text-right shrink-0">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Avg</p>
                                        <p className={`text-base font-black leading-none ${scoreColor(r.avgScore)}`}>{r.avgScore}%</p>
                                    </div>
                                )}

                                {r.topEmployee && (
                                    <div className="text-right shrink-0 hidden sm:block">
                                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Top</p>
                                        <p className="text-xs font-bold text-amber-400 leading-none mt-0.5">
                                            {r.topEmployee.name.split(' ')[0]}
                                        </p>
                                        <p className="text-[10px] text-amber-500/70">{r.topEmployee.score}%</p>
                                    </div>
                                )}

                                <div className="shrink-0 flex items-center gap-2">
                                    {r.levels.length > 0 && (
                                        <span className="text-[9px] font-black uppercase text-slate-600 bg-slate-700/60 px-1.5 py-0.5 rounded-full">
                                            {r.levels.length} level{r.levels.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    <svg
                                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                                    </svg>
                                </div>
                            </button>

                            {/* Expanded: level breakdown + leaderboard */}
                            {isOpen && (
                                <div className="border-t border-slate-700/50 bg-slate-900/40 px-5 py-4 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                        Level Breakdown
                                    </p>
                                    {sortedLevels.map(lv => {
                                        const lvPct = lv.total > 0 ? Math.round((lv.completed / lv.total) * 100) : 0;
                                        return (
                                            <div key={lv.level} className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400 font-bold w-24 shrink-0">{lv.level}</span>
                                                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${barColor(lv.avgScore)}`}
                                                        style={{ width: `${lvPct}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-slate-500 w-20 text-right shrink-0">
                                                    {lv.completed}/{lv.total} done
                                                </span>
                                                <div className="w-12 text-right shrink-0">
                                                    {lv.avgScore != null
                                                        ? <span className={`text-xs font-black ${scoreColor(lv.avgScore)}`}>{lv.avgScore}%</span>
                                                        : <span className="text-xs text-slate-600">—</span>
                                                    }
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Role leaderboard */}
                                    {r.top5 && r.top5.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/40">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                                                Role Leaderboard
                                            </p>
                                            <div className="space-y-2.5">
                                                {r.top5.map(entry => {
                                                    const MEDALS = ['🥇', '🥈', '🥉'];
                                                    const scoreCls = entry.bestScore >= 70 ? 'text-green-400' : entry.bestScore >= 40 ? 'text-amber-400' : 'text-red-400';
                                                    const barCls   = entry.bestScore >= 70 ? 'bg-green-500' : entry.bestScore >= 40 ? 'bg-amber-500' : 'bg-red-500';
                                                    const profileLvl = entry.preferredLevel;
                                                    const lvlStyle = profileLvl ? (LEVEL_COLORS[profileLvl] || {}) : {};
                                                    return (
                                                        <div key={entry.rank} className="flex items-center gap-3">
                                                            <div className="w-6 text-center shrink-0">
                                                                {entry.rank <= 3
                                                                    ? <span className="text-lg leading-none">{MEDALS[entry.rank - 1]}</span>
                                                                    : <span className="text-xs font-black text-slate-500">#{entry.rank}</span>
                                                                }
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="text-xs font-bold text-slate-200 truncate">{entry.name}</p>
                                                                    {profileLvl && (
                                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${lvlStyle.bg || ''} ${lvlStyle.text || 'text-slate-400'}`}>
                                                                            {profileLvl}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[9px] text-slate-600 shrink-0">
                                                                        {entry.sessions} session{entry.sessions !== 1 ? 's' : ''}
                                                                    </span>
                                                                </div>
                                                                {entry.preferredRole && entry.preferredRole !== r.role && (
                                                                    <p className="text-[9px] text-slate-500 mt-0.5 truncate">Profile: {entry.preferredRole}</p>
                                                                )}
                                                                <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${barCls}`}
                                                                        style={{ width: `${entry.bestScore}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 text-right w-12">
                                                                <p className={`text-sm font-black leading-none ${scoreCls}`}>{entry.bestScore}<span className="text-[10px] text-slate-500">%</span></p>
                                                                <p className="text-[9px] text-slate-600 mt-0.5">best</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Digest Settings Modal ─────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 || 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    return { value: i, label: `${h}:00 ${ampm} UTC` };
});

function DigestSettingsModal({ onClose }) {
    const dispatch = useDispatch();
    const { digestConfig } = useSelector(s => s.orgAdmin);
    const [enabled,    setEnabled]    = useState(digestConfig?.enabled    ?? false);
    const [emails,     setEmails]     = useState((digestConfig?.emails    ?? []).join(', '));
    const [dayOfWeek,  setDayOfWeek]  = useState(digestConfig?.dayOfWeek  ?? 1);
    const [hour,       setHour]       = useState(digestConfig?.hour       ?? 8);
    const [saving,     setSaving]     = useState(false);
    const [testing,    setTesting]    = useState(false);

    useEffect(() => { dispatch(fetchDigestConfig()); }, [dispatch]);

    useEffect(() => {
        if (digestConfig) {
            setEnabled(digestConfig.enabled ?? false);
            setEmails((digestConfig.emails ?? []).join(', '));
            setDayOfWeek(digestConfig.dayOfWeek ?? 1);
            setHour(digestConfig.hour ?? 8);
        }
    }, [digestConfig]);

    const parseEmails = () => emails.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean);

    const handleSave = async () => {
        setSaving(true);
        try {
            await dispatch(updateDigestConfig({ enabled, emails: parseEmails(), dayOfWeek, hour })).unwrap();
            toast.success('Digest schedule saved!');
            onClose();
        } catch (err) { toast.error(err || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const handleTestSend = async () => {
        if (!parseEmails().length) { toast.error('Add at least one recipient email first.'); return; }
        setTesting(true);
        try {
            await dispatch(sendDigestNow()).unwrap();
            toast.success('Test digest sent! Check your inbox.');
        } catch (err) { toast.error(err || 'Send failed — check SMTP settings.'); }
        finally { setTesting(false); }
    };

    const labelCls = 'block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5';
    const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition';
    const selectCls = `${inputCls} appearance-none`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
                    <div>
                        <h2 className="font-black text-white">Weekly Digest</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Schedule an automatic team progress report by email.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">

                    {/* Enable toggle */}
                    <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-sm font-black text-white">Enable weekly digest</p>
                            <p className="text-xs text-slate-400 mt-0.5">Sends an HTML report to the recipients below.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEnabled(v => !v)}
                            className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none ${enabled ? 'bg-teal-500' : 'bg-slate-600'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Recipients */}
                    <div>
                        <label className={labelCls}>Recipient Emails</label>
                        <textarea
                            rows={2}
                            value={emails}
                            onChange={e => setEmails(e.target.value)}
                            placeholder="admin@company.com, hr@company.com"
                            className={`${inputCls} resize-none`}
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Separate multiple addresses with commas or spaces.</p>
                    </div>

                    {/* Schedule row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Day of Week</label>
                            <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} className={selectCls}>
                                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Send Time</label>
                            <select value={hour} onChange={e => setHour(Number(e.target.value))} className={selectCls}>
                                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Next send preview */}
                    {enabled && (
                        <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl px-4 py-3">
                            <p className="text-xs text-teal-400 font-bold">
                                📅 Next send: every <span className="font-black">{DAYS[dayOfWeek]}</span> at <span className="font-black">{HOURS[hour].label}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">All times are UTC. The digest uses the same data as the Export modal.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-700/50 flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={handleTestSend}
                        disabled={testing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition disabled:opacity-50"
                    >
                        {testing ? 'Sending…' : '📨 Send Test Now'}
                    </button>
                    <div className="flex-1" />
                    <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 font-bold transition">Cancel</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-black px-5 py-2 rounded-xl transition disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Team Export Modal ─────────────────────────────────────────────────────────
function TeamExportModal({ orgName, orgType, orgCode, country, onClose }) {
    const { students, analytics, roleAnalytics, subjectAnalytics } = useSelector(s => s.orgAdmin);
    const [copied, setCopied] = useState('');
    const isCorporate = orgType === 'corporate';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // ── Derived data ──────────────────────────────────────────────────────────
    const totalEmployees  = students.length;
    const withSessions    = students.filter(s => s.completedSessions > 0);
    const overallAvg      = withSessions.length
        ? Math.round(withSessions.reduce((a, s) => a + (s.avgScore || 0), 0) / withSessions.length)
        : null;

    // Corporate: readiness
    const corpStudents    = isCorporate ? students : [];
    const withReadiness   = corpStudents.filter(s => s.readinessScore != null);
    const avgReadiness    = withReadiness.length
        ? Math.round(withReadiness.reduce((a, s) => a + s.readinessScore, 0) / withReadiness.length)
        : null;
    const needsCoaching   = corpStudents.filter(s => s.readinessScore == null || s.readinessScore < 50)
        .sort((a, b) => (a.readinessScore || 0) - (b.readinessScore || 0))
        .slice(0, 5);
    const topPerformers   = [...students]
        .filter(s => isCorporate ? s.readinessScore != null : s.avgScore != null)
        .sort((a, b) => isCorporate ? (b.readinessScore - a.readinessScore) : (b.avgScore - a.avgScore))
        .slice(0, 5);

    // Role / subject distribution
    const distribution = roleAnalytics?.distribution || [];
    const LEVEL_ORDER  = ['Junior', 'Mid-Level', 'Senior'];
    const distByRole   = {};
    for (const d of distribution) {
        const role  = d._id.role  || 'Unset';
        const level = d._id.level || 'Junior';
        if (!distByRole[role]) distByRole[role] = { total: 0 };
        distByRole[role][level] = (distByRole[role][level] || 0) + d.count;
        distByRole[role].total  += d.count;
    }
    const distRoles = Object.entries(distByRole)
        .map(([role, counts]) => ({ role, ...counts }))
        .sort((a, b) => b.total - a.total);

    const subjects = subjectAnalytics?.subjects || [];

    // ── Score label helpers ───────────────────────────────────────────────────
    const scoreLabel = (v) => v == null ? '—' : `${Math.round(v)}%`;
    const statusEmoji = (v) => v == null ? '⬜' : v >= 70 ? '🟢' : v >= 40 ? '🟡' : '🔴';

    // ── HTML builder ─────────────────────────────────────────────────────────
    const buildHTML = () => {
        const h = (tag, style, content) => `<${tag} style="${style}">${content}</${tag}>`;
        const row = (label, value, color = '#1e293b') =>
            `<tr><td style="padding:6px 12px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">${label}</td><td style="padding:6px 12px;font-size:13px;font-weight:700;color:${color};text-align:right;border-bottom:1px solid #f1f5f9;">${value}</td></tr>`;
        const sectionTitle = (t) =>
            `<p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin:28px 0 12px;">${t}</p>`;

        let html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1e293b;background:#fff;">`;

        // Header
        html += `<div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:16px;padding:24px 28px;margin-bottom:24px;">`;
        html += `<p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;margin:0 0 6px;">${isCorporate ? '🏢 Corporate' : '🎓 College'} · AI Interviewer</p>`;
        html += `<h1 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 4px;">${orgName} — Team Progress Report</h1>`;
        html += `<p style="font-size:13px;color:#64748b;margin:0;">Generated ${dateStr}${country ? ' · ' + country : ''}${orgCode ? ' · Code: ' + orgCode : ''}</p>`;
        html += `</div>`;

        // Overview stats table
        html += sectionTitle('Team Overview');
        html += `<table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:4px;">`;
        html += row('Total Employees', totalEmployees);
        html += row('With Completed Sessions', withSessions.length);
        html += row('Overall Avg Score', scoreLabel(overallAvg), overallAvg >= 70 ? '#16a34a' : overallAvg >= 40 ? '#d97706' : '#dc2626');
        if (isCorporate && avgReadiness != null) {
            html += row('Avg Readiness Score', scoreLabel(avgReadiness), avgReadiness >= 70 ? '#16a34a' : avgReadiness >= 40 ? '#d97706' : '#dc2626');
        }
        if (analytics) {
            html += row('Total Sessions', analytics.totalSessions || 0);
            html += row('Completion Rate', analytics.totalSessions ? `${Math.round((analytics.completedSessions / analytics.totalSessions) * 100)}%` : '—');
        }
        html += `</table>`;

        // Corporate: Role Distribution
        if (isCorporate && distRoles.length > 0) {
            html += sectionTitle('Role Distribution (by Employee Profile)');
            html += `<table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:4px;">`;
            html += `<tr style="background:#e2e8f0;"><th style="padding:8px 12px;font-size:11px;text-align:left;color:#475569;">Role</th>${LEVEL_ORDER.map(l=>`<th style="padding:8px 12px;font-size:11px;text-align:center;color:#475569;">${l}</th>`).join('')}<th style="padding:8px 12px;font-size:11px;text-align:right;color:#475569;">Total</th></tr>`;
            for (const r of distRoles) {
                html += `<tr><td style="padding:6px 12px;font-size:13px;border-bottom:1px solid #f1f5f9;">${r.role}</td>${LEVEL_ORDER.map(l=>`<td style="padding:6px 12px;font-size:13px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9;">${r[l] || 0}</td>`).join('')}<td style="padding:6px 12px;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #f1f5f9;">${r.total}</td></tr>`;
            }
            html += `</table>`;
        }

        // College: Subject Performance
        if (!isCorporate && subjects.length > 0) {
            html += sectionTitle('Subject Performance');
            html += `<table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:4px;">`;
            html += `<tr style="background:#e2e8f0;"><th style="padding:8px 12px;font-size:11px;text-align:left;color:#475569;">Subject</th><th style="padding:8px 12px;font-size:11px;text-align:center;color:#475569;">Students</th><th style="padding:8px 12px;font-size:11px;text-align:center;color:#475569;">Sessions</th><th style="padding:8px 12px;font-size:11px;text-align:right;color:#475569;">Avg Score</th></tr>`;
            for (const s of subjects.slice(0, 8)) {
                const c = s.avgScore >= 70 ? '#16a34a' : s.avgScore >= 40 ? '#d97706' : s.avgScore != null ? '#dc2626' : '#94a3b8';
                html += `<tr><td style="padding:6px 12px;font-size:13px;border-bottom:1px solid #f1f5f9;">${s.subject}</td><td style="padding:6px 12px;font-size:13px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9;">${s.uniqueStudents}</td><td style="padding:6px 12px;font-size:13px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9;">${s.completed}/${s.total}</td><td style="padding:6px 12px;font-size:13px;font-weight:700;text-align:right;color:${c};border-bottom:1px solid #f1f5f9;">${scoreLabel(s.avgScore)}</td></tr>`;
            }
            html += `</table>`;
        }

        // Top performers
        if (topPerformers.length > 0) {
            html += sectionTitle(`Top Performers${isCorporate ? ' (by Readiness)' : ' (by Avg Score)'}`);
            html += `<table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;margin-bottom:4px;">`;
            topPerformers.forEach((s, i) => {
                const medals = ['🥇','🥈','🥉'];
                const score  = isCorporate ? s.readinessScore : s.avgScore;
                const c      = score >= 70 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';
                const roleInfo = isCorporate && s.preferredRole ? `<br/><span style="font-size:11px;color:#94a3b8;">${s.preferredRole} · ${s.preferredLevel || ''}</span>` : '';
                html += `<tr><td style="padding:8px 12px;font-size:16px;border-bottom:1px solid #f1f5f9;width:32px;">${medals[i] || `#${i+1}`}</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9;">${s.name}${roleInfo}</td><td style="padding:8px 12px;font-size:15px;font-weight:900;text-align:right;color:${c};border-bottom:1px solid #f1f5f9;">${scoreLabel(score)}</td></tr>`;
            });
            html += `</table>`;
        }

        // Corporate: Needs coaching
        if (isCorporate && needsCoaching.length > 0) {
            html += sectionTitle('Needs Coaching (Readiness below 50%)');
            html += `<table style="width:100%;border-collapse:collapse;background:#fff8f8;border-radius:12px;overflow:hidden;border:1px solid #fecaca;margin-bottom:4px;">`;
            needsCoaching.forEach(s => {
                const roleInfo = s.preferredRole ? ` · ${s.preferredRole} (${s.preferredLevel || 'Junior'})` : '';
                html += `<tr><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #fee2e2;">${s.name}<br/><span style="font-size:11px;color:#94a3b8;">${s.email}${roleInfo}</span></td><td style="padding:8px 12px;font-size:14px;font-weight:900;text-align:right;color:${s.readinessScore != null ? '#dc2626' : '#94a3b8'};border-bottom:1px solid #fee2e2;">${s.readinessScore != null ? scoreLabel(s.readinessScore) : 'Not started'}</td></tr>`;
            });
            html += `</table>`;
        }

        // Footer
        html += `<p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid #f1f5f9;">Generated by AI Interviewer · ${dateStr}</p>`;
        html += `</div>`;
        return html;
    };

    // ── Plain text builder ────────────────────────────────────────────────────
    const buildText = () => {
        const lines = [];
        const sep   = '─'.repeat(56);
        lines.push(`${orgName} — Team Progress Report`);
        lines.push(`Generated: ${dateStr}${orgCode ? '  |  Code: ' + orgCode : ''}${country ? '  |  ' + country : ''}`);
        lines.push(sep);
        lines.push('TEAM OVERVIEW');
        lines.push(`  Total employees      : ${totalEmployees}`);
        lines.push(`  With sessions        : ${withSessions.length}`);
        lines.push(`  Overall avg score    : ${scoreLabel(overallAvg)}`);
        if (isCorporate && avgReadiness != null) lines.push(`  Avg readiness score  : ${scoreLabel(avgReadiness)}`);
        if (analytics) {
            lines.push(`  Total sessions       : ${analytics.totalSessions || 0}`);
            lines.push(`  Completion rate      : ${analytics.totalSessions ? Math.round((analytics.completedSessions / analytics.totalSessions) * 100) + '%' : '—'}`);
        }

        if (isCorporate && distRoles.length > 0) {
            lines.push(''); lines.push(sep); lines.push('ROLE DISTRIBUTION');
            for (const r of distRoles) {
                const levelStr = LEVEL_ORDER.filter(l => r[l]).map(l => `${r[l]} ${l}`).join(' · ');
                lines.push(`  ${r.role.padEnd(34)} ${levelStr}`);
            }
        }
        if (!isCorporate && subjects.length > 0) {
            lines.push(''); lines.push(sep); lines.push('SUBJECT PERFORMANCE');
            for (const s of subjects.slice(0, 8)) {
                lines.push(`  ${statusEmoji(s.avgScore)} ${s.subject.padEnd(30)} ${scoreLabel(s.avgScore).padStart(5)}  (${s.uniqueStudents} students)`);
            }
        }

        if (topPerformers.length > 0) {
            lines.push(''); lines.push(sep);
            lines.push(`TOP PERFORMERS${isCorporate ? ' (by Readiness)' : ' (by Avg Score)'}`);
            topPerformers.forEach((s, i) => {
                const medals = ['🥇','🥈','🥉'];
                const score  = isCorporate ? s.readinessScore : s.avgScore;
                const extra  = isCorporate && s.preferredRole ? `  [${s.preferredRole}]` : '';
                lines.push(`  ${medals[i] || '#' + (i+1)}  ${s.name.padEnd(24)} ${scoreLabel(score)}${extra}`);
            });
        }

        if (isCorporate && needsCoaching.length > 0) {
            lines.push(''); lines.push(sep); lines.push('NEEDS COACHING (readiness < 50%)');
            needsCoaching.forEach(s => {
                const score = s.readinessScore != null ? scoreLabel(s.readinessScore) : 'Not started';
                lines.push(`  🔴  ${s.name.padEnd(24)} ${score}   ${s.email}`);
            });
        }

        lines.push(''); lines.push(sep);
        lines.push(`Generated by AI Interviewer · ${dateStr}`);
        return lines.join('\n');
    };

    const copyToClipboard = async (text, label) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(label);
            setTimeout(() => setCopied(''), 2500);
        } catch {
            toast.error('Could not copy — try selecting and copying manually.');
        }
    };

    const htmlReport  = buildHTML();
    const textReport  = buildText();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 shrink-0">
                    <div>
                        <h2 className="font-black text-white">Team Progress Report</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{orgName} · {dateStr}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-y-auto p-5">
                    <div className="bg-white rounded-xl p-4 text-sm" dangerouslySetInnerHTML={{ __html: htmlReport }} />
                </div>

                {/* Footer actions */}
                <div className="px-5 py-4 border-t border-slate-700/50 shrink-0 flex flex-wrap items-center gap-3">
                    <p className="text-xs text-slate-500 flex-1">Copy and paste into email, Slack, or Notion.</p>
                    <button
                        onClick={() => copyToClipboard(textReport, 'text')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${copied === 'text' ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                    >
                        {copied === 'text' ? '✓ Copied!' : '📋 Copy Plain Text'}
                    </button>
                    <button
                        onClick={() => copyToClipboard(htmlReport, 'html')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${copied === 'html' ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-600 hover:bg-teal-500 border-teal-500 text-white'}`}
                    >
                        {copied === 'html' ? '✓ Copied!' : '📨 Copy as HTML'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Goals Tab (corporate + college) ───────────────────────────────────────────
function GoalsTab({ orgInfo }) {
    const dispatch = useDispatch();
    const { teamGoals, isLoading, departments, batches } = useSelector(s => s.orgAdmin);
    const isCorporate = orgInfo?.type === 'corporate';
    const [nudging, setNudging]       = useState({});
    const [sortBy, setSortBy]         = useState('status');
    const [deptFilter, setDeptFilter] = useState('');
    const [batchFilter, setBatchFilter] = useState('');

    useEffect(() => { dispatch(fetchDepartments()); dispatch(fetchBatches()); }, [dispatch]);
    useEffect(() => { dispatch(fetchTeamGoals({ department: deptFilter, batch: batchFilter })); }, [dispatch, deptFilter, batchFilter]);

    const handleNudge = async (id, name) => {
        setNudging(p => ({ ...p, [id]: true }));
        const res = await dispatch(sendNudge(id));
        if (!res.error) toast.success(`Nudge sent to ${name}!`);
        else toast.error(res.payload || 'Could not send nudge');
        setNudging(p => ({ ...p, [id]: false }));
    };

    if (isLoading && !teamGoals.length)
        return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"/></div>;

    const withGoal   = teamGoals.filter(u => u.goalStatus !== 'no-goal');
    const achieved   = withGoal.filter(u => u.goalStatus === 'achieved').length;
    const needsAttn  = withGoal.filter(u => u.goalStatus === 'overdue' || u.goalStatus === 'urgent').length;
    const inProgress = withGoal.filter(u => u.goalStatus === 'in-progress').length;

    const STATUS_ORDER = { overdue: 0, urgent: 1, 'in-progress': 2, achieved: 3, 'no-goal': 4 };
    const STATUS_STYLES = {
        achieved:      { bg: 'bg-teal-500/10 border-teal-500/20 text-teal-400',    dot: 'bg-teal-500',   label: 'Achieved'    },
        overdue:       { bg: 'bg-red-500/10 border-red-500/20 text-red-400',        dot: 'bg-red-500',    label: 'Overdue'     },
        urgent:        { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',  dot: 'bg-amber-500',  label: 'Urgent'      },
        'in-progress': { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',     dot: 'bg-blue-500',   label: 'In Progress' },
        'no-goal':     { bg: 'bg-slate-700/30 border-slate-700 text-slate-500',     dot: 'bg-slate-600',  label: 'No Goal'     },
    };

    const sorted = [...teamGoals].sort((a, b) => {
        if (sortBy === 'status') return (STATUS_ORDER[a.goalStatus] ?? 99) - (STATUS_ORDER[b.goalStatus] ?? 99);
        if (sortBy === 'name')   return a.name.localeCompare(b.name);
        if (sortBy === 'days')   return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
        if (sortBy === 'gap')    return (b.gap ?? -1) - (a.gap ?? -1);
        return 0;
    });

    const urgentOrOverdue = sorted.filter(u => u.goalStatus === 'overdue' || u.goalStatus === 'urgent');

    return (
        <div className="space-y-6">
            {/* Dept / batch filter row (college) */}
            {!isCorporate && (departments?.length > 0 || batches?.length > 0) && (
                <div className="flex flex-wrap gap-2">
                    {departments?.length > 0 && (
                        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition">
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                    {batches?.length > 0 && (
                        <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 transition">
                            <option value="">All Batches</option>
                            {batches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                        </select>
                    )}
                    {(deptFilter || batchFilter) && (
                        <button onClick={() => { setDeptFilter(''); setBatchFilter(''); }}
                            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl transition">
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Set Goals"       value={withGoal.length} sub={`of ${teamGoals.length} ${isCorporate ? 'employees' : 'students'}`} color="violet" />
                <StatCard label="Achieved"         value={achieved}                                                  color="green"  />
                <StatCard label="Needs Attention"  value={needsAttn}       sub="overdue or urgent"                   color="amber"  />
                <StatCard label="In Progress"      value={inProgress}                                                color="blue"   />
            </div>

            {/* College-specific info banner */}
            {!isCorporate && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-300">
                    <p className="font-bold text-blue-400 mb-1">🎓 Batch Goals</p>
                    <p>Goals are set per batch by an admin. Each student's readiness is their average score across all completed sessions.</p>
                </div>
            )}

            {/* Needs-attention callout */}
            {urgentOrOverdue.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        ⚠️ Needs Attention — {urgentOrOverdue.length} {isCorporate ? 'employee' : 'student'}{urgentOrOverdue.length !== 1 ? 's' : ''} near or past deadline
                    </p>
                    {urgentOrOverdue.map(u => (
                        <div key={u._id} className="flex items-center gap-3 bg-slate-900/60 rounded-xl px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-white truncate">{u.name}</p>
                                <p className="text-xs text-slate-400 truncate">
                                    {isCorporate
                                        ? `${u.preferredLevel || ''} ${u.preferredRole || ''}`.trim()
                                        : [u.department, u.batch].filter(Boolean).join(' · ') || u.email
                                    }
                                </p>
                            </div>
                            <div className="text-right text-xs shrink-0">
                                <p className={`font-black ${u.goalStatus === 'overdue' ? 'text-red-400' : 'text-amber-400'}`}>
                                    {u.goalStatus === 'overdue' ? `${Math.abs(u.daysLeft)}d overdue` : `${u.daysLeft}d left`}
                                </p>
                                <p className="text-slate-500">
                                    {u.currentScore ?? 0}% → {isCorporate ? u.readinessGoal?.targetScore : u.batchGoal?.targetScore}%
                                </p>
                            </div>
                            <Btn variant="outline" disabled={nudging[u._id]} onClick={() => handleNudge(u._id, u.name)} className="shrink-0 !text-xs !px-2.5 !py-1.5">
                                {nudging[u._id] ? '…' : '📣 Nudge'}
                            </Btn>
                        </div>
                    ))}
                </div>
            )}

            {/* Full list */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        All {isCorporate ? 'Employees' : 'Students'}
                    </p>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-teal-500 transition">
                        <option value="status">Sort: Status</option>
                        <option value="name">Sort: Name</option>
                        <option value="days">Sort: Days Left</option>
                        <option value="gap">Sort: Gap</option>
                    </select>
                </div>
                <div className="space-y-2">
                    {sorted.map(u => {
                        const st = STATUS_STYLES[u.goalStatus] || STATUS_STYLES['no-goal'];
                        const canNudge = u.goalStatus === 'urgent' || u.goalStatus === 'overdue' || u.goalStatus === 'in-progress';
                        const targetScore = isCorporate ? u.readinessGoal?.targetScore : u.batchGoal?.targetScore;
                        return (
                            <div key={u._id} className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`}/>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm text-white truncate">{u.name}</p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {isCorporate
                                            ? `${u.preferredLevel || ''} ${u.preferredRole || ''}`.trim()
                                            : [u.department, u.batch].filter(Boolean).join(' · ') || u.email
                                        }
                                    </p>
                                </div>
                                {u.goalStatus !== 'no-goal' ? (<>
                                    <div className="text-center shrink-0 w-14">
                                        <p className="text-sm font-black text-white">{u.currentScore ?? '—'}%</p>
                                        <p className="text-[10px] text-slate-500">now</p>
                                    </div>
                                    <div className="text-center shrink-0 w-14">
                                        <p className="text-sm font-black text-white">{targetScore ?? '—'}%</p>
                                        <p className="text-[10px] text-slate-500">target</p>
                                    </div>
                                    <div className="text-center shrink-0 w-16">
                                        <p className={`text-sm font-black ${u.daysLeft < 0 ? 'text-red-400' : u.daysLeft <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                                            {u.daysLeft !== null ? (u.daysLeft < 0 ? `${Math.abs(u.daysLeft)}d ago` : `${u.daysLeft}d`) : '—'}
                                        </p>
                                        <p className="text-[10px] text-slate-500">deadline</p>
                                    </div>
                                </>) : (
                                    <p className="text-xs text-slate-600 italic mr-2">No goal set</p>
                                )}
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${st.bg}`}>{st.label}</span>
                                {canNudge && (
                                    <Btn variant="ghost" disabled={nudging[u._id]} onClick={() => handleNudge(u._id, u.name)} className="shrink-0 !text-xs !px-2 !py-1">
                                        {nudging[u._id] ? '…' : '📣'}
                                    </Btn>
                                )}
                            </div>
                        );
                    })}
                    {!isLoading && teamGoals.length === 0 && (
                        <p className="text-center text-slate-600 py-8">No {isCorporate ? 'employees' : 'students'} found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── DrivesTab ─────────────────────────────────────────────────────────────────
const DRIVE_DEFAULTS = { companyName: '', jobRole: '', visitDate: '', minScore: 60, description: '', interviewRole: '', interviewLevel: 'Mid-Level', eligibleDepartments: '', eligibleBatches: '', questionPackId: '' };

function DrivesTab({ orgInfo }) {
    const dispatch = useDispatch();
    const { drives, driveLeaderboard, isLoading, questionPacks, availableQuestions } = useSelector(s => s.orgAdmin);
    const orgAdminToken = localStorage.getItem('orgAdminToken');
    const orgApiBase = `${import.meta.env.VITE_API_URL}/org-admin`;

    const [showForm, setShowForm]           = useState(false);
    const [editing, setEditing]             = useState(null);
    const [form, setForm]                   = useState(DRIVE_DEFAULTS);
    const [saving, setSaving]               = useState(false);
    const [deleting, setDeleting]           = useState({});
    const [closing, setClosing]             = useState({});
    const [lbDrive, setLbDrive]             = useState(null);

    useEffect(() => { dispatch(fetchDrives()); dispatch(fetchQuestionPacks()); }, [dispatch]);
    useEffect(() => {
        if (lbDrive) dispatch(fetchDriveLeaderboard(lbDrive._id));
    }, [lbDrive, dispatch]);

    const openCreate = () => { setEditing(null); setForm(DRIVE_DEFAULTS); setShowForm(true); };
    const openEdit   = d  => { setEditing(d);    setForm({ ...DRIVE_DEFAULTS, ...d, visitDate: d.visitDate?.slice(0,10) || '', eligibleDepartments: (d.eligibleDepartments || []).join(', '), eligibleBatches: (d.eligibleBatches || []).join(', '), questionPackId: d.questionPackId?._id || d.questionPackId || '' }); setShowForm(true); };
    const closeForm  = () => { setShowForm(false); setEditing(null); };

    const handleSave = async () => {
        if (!form.companyName.trim() || !form.jobRole.trim() || !form.visitDate) {
            toast.error('Company name, job role and visit date are required.'); return;
        }
        setSaving(true);
        const parsedForm = {
            ...form,
            eligibleDepartments: form.eligibleDepartments
                ? form.eligibleDepartments.split(',').map(s => s.trim()).filter(Boolean)
                : [],
            eligibleBatches: form.eligibleBatches
                ? form.eligibleBatches.split(',').map(s => s.trim()).filter(Boolean)
                : [],
        };
        const res = editing
            ? await dispatch(updateDrive({ id: editing._id, body: parsedForm }))
            : await dispatch(createDrive(parsedForm));
        setSaving(false);
        if (!res.error) { toast.success(editing ? 'Drive updated.' : 'Drive created.'); closeForm(); }
        else toast.error(res.payload || 'Failed to save.');
    };

    const handleDelete = async id => {
        if (!window.confirm('Delete this drive? This cannot be undone.')) return;
        setDeleting(p => ({ ...p, [id]: true }));
        const res = await dispatch(deleteDrive(id));
        setDeleting(p => ({ ...p, [id]: false }));
        if (!res.error) toast.success('Drive deleted.');
        else toast.error(res.payload || 'Failed to delete.');
    };

    const handleClose = async id => {
        if (!window.confirm('Close this drive? Students will no longer be able to enroll.')) return;
        setClosing(p => ({ ...p, [id]: true }));
        const res = await dispatch(closeDrive(id));
        setClosing(p => ({ ...p, [id]: false }));
        if (!res.error) toast.success('Drive closed.');
        else toast.error(res.payload || 'Failed to close.');
    };

    const handleExportCSV = d => {
        const url = `${orgApiBase}/drives/${d._id}/leaderboard/export`;
        fetch(url, { headers: { Authorization: `Bearer ${orgAdminToken}` } })
            .then(r => r.ok ? r.blob() : Promise.reject(r))
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${(d.companyName || 'drive').replace(/\s+/g, '-').toLowerCase()}-enrollments.csv`;
                link.click();
                URL.revokeObjectURL(blobUrl);
            })
            .catch(() => toast.error('Export failed. Try again.'));
    };

    const isCorporate = orgInfo?.type === 'corporate';

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Placement Drives</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Create & manage company visit drives for your {isCorporate ? 'employees' : 'students'}.</p>
                </div>
                <Btn onClick={openCreate} className="!text-xs">+ New Drive</Btn>
            </div>

            {/* Summary stats */}
            {drives.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="Total Drives"   value={drives.length} color="teal" />
                    <StatCard label="Active"          value={drives.filter(d => d.status === 'open').length} color="green" />
                    <StatCard label="Closed"          value={drives.filter(d => d.status === 'closed').length} color="slate" />
                    <StatCard label="Total Enrolled"  value={drives.reduce((s, d) => s + (d.enrollmentCount || 0), 0)} color="blue" />
                </div>
            )}

            {/* Drive list */}
            <div className="space-y-3">
                {isLoading && drives.length === 0 && (
                    <p className="text-center text-slate-600 py-10 text-xs font-bold uppercase tracking-widest animate-pulse">Loading drives…</p>
                )}
                {!isLoading && drives.length === 0 && (
                    <div className="text-center py-14 bg-slate-800/30 border border-slate-700/30 rounded-2xl">
                        <p className="text-3xl mb-3">🏢</p>
                        <p className="text-slate-400 font-bold text-sm">No placement drives yet</p>
                        <p className="text-slate-600 text-xs mt-1 mb-4">Create your first drive to let {isCorporate ? 'employees' : 'students'} prepare and qualify.</p>
                        <Btn onClick={openCreate} className="!text-xs">Create First Drive</Btn>
                    </div>
                )}
                {drives.map(d => {
                    const daysLeft = Math.ceil((new Date(d.visitDate) - Date.now()) / 86_400_000);
                    const isPast   = daysLeft < 0;
                    const isClosed = d.status === 'closed';
                    return (
                        <div key={d._id} className={`bg-slate-800/50 border rounded-2xl p-5 space-y-4 ${isClosed ? 'border-slate-700/30 opacity-70' : 'border-slate-700/50'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-white text-base leading-tight">{d.companyName}</p>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isClosed ? 'bg-slate-700/40 text-slate-500 border-slate-600/30' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'}`}>
                                            {isClosed ? 'CLOSED' : 'ACTIVE'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 font-medium mt-0.5">{d.jobRole}</p>
                                    {d.description && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{d.description}</p>}
                                </div>
                                <div className="text-right shrink-0 space-y-1">
                                    <p className={`text-xs font-black ${isPast ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                                        {isPast ? `${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? 'Today!' : `${daysLeft}d away`}
                                    </p>
                                    <p className="text-[11px] text-slate-500">{new Date(d.visitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-2 text-center">
                                <div className="bg-slate-900/60 rounded-xl py-2">
                                    <p className="text-base font-black text-white">{d.enrollmentCount || 0}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Enrolled</p>
                                </div>
                                <div className="bg-slate-900/60 rounded-xl py-2">
                                    <p className="text-base font-black text-amber-400">{d.attempted || 0}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Attempted</p>
                                </div>
                                <div className="bg-slate-900/60 rounded-xl py-2">
                                    <p className="text-base font-black text-teal-400">{d.qualifiedCount || 0}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Qualified</p>
                                </div>
                                <div className="bg-slate-900/60 rounded-xl py-2">
                                    <p className="text-base font-black text-blue-400">{d.avgScore != null ? `${d.avgScore}%` : '—'}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Score</p>
                                </div>
                                <div className="bg-slate-900/60 rounded-xl py-2">
                                    <p className="text-base font-black text-slate-300">{d.minScore}%</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Min Score</p>
                                </div>
                            </div>
                            {d.questionPackId && (
                                <p className="text-[11px] text-teal-400 font-semibold">
                                    📦 Pack: {d.questionPackId?.name || 'Attached'}
                                    <span className="text-slate-500 font-normal ml-1">({d.questionPackId?.questions?.length || 0} questions)</span>
                                </p>
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setLbDrive(d)}
                                    className="flex-1 sm:flex-none text-xs font-black bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl transition-colors"
                                >
                                    📊 Leaderboard
                                </button>
                                <button
                                    onClick={() => {
                                        setLbDrive(d);
                                        setTimeout(() => handleExportCSV(d), 500);
                                    }}
                                    className="text-xs font-black bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl transition-colors"
                                >
                                    ⬇ CSV
                                </button>
                                {!isClosed && (
                                    <button onClick={() => openEdit(d)}
                                        className="text-xs font-black bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl transition-colors">
                                        ✏ Edit
                                    </button>
                                )}
                                {!isClosed && (
                                    <button onClick={() => handleClose(d._id)} disabled={closing[d._id]}
                                        className="text-xs font-black bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-2 rounded-xl transition-colors">
                                        {closing[d._id] ? '…' : '🔒 Close'}
                                    </button>
                                )}
                                <button onClick={() => handleDelete(d._id)} disabled={deleting[d._id]}
                                    className="text-xs font-black bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl transition-colors ml-auto">
                                    {deleting[d._id] ? '…' : '🗑 Delete'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create / Edit modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-7 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-white text-base">{editing ? 'Edit Drive' : 'New Placement Drive'}</h3>
                            <button onClick={closeForm} className="text-slate-500 hover:text-white text-xl leading-none transition">✕</button>
                        </div>

                        <div className="space-y-4">
                            {[
                                { label: 'Company Name', key: 'companyName', placeholder: 'e.g. Google' },
                                { label: 'Job Role',     key: 'jobRole',     placeholder: 'e.g. Software Engineer' },
                                { label: 'Description',  key: 'description', placeholder: 'Brief description of the drive…' },
                                { label: 'Interview Role (optional)', key: 'interviewRole', placeholder: 'Role for mock sessions (defaults to Job Role)' },
                            ].map(({ label, key, placeholder }) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">{label}</label>
                                    {key === 'description' ? (
                                        <textarea
                                            value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                                            placeholder={placeholder} rows={2}
                                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition resize-none"
                                        />
                                    ) : (
                                        <input
                                            value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                                            placeholder={placeholder}
                                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition"
                                        />
                                    )}
                                </div>
                            ))}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Visit Date</label>
                                    <input type="date" value={form.visitDate} onChange={e => setForm(p => ({ ...p, visitDate: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Min Score (%)</label>
                                    <input type="number" min="0" max="100" value={form.minScore} onChange={e => setForm(p => ({ ...p, minScore: Number(e.target.value) }))}
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Interview Level</label>
                                <select value={form.interviewLevel} onChange={e => setForm(p => ({ ...p, interviewLevel: e.target.value }))}
                                    className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition">
                                    {['Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal'].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">
                                    Question Pack <span className="text-slate-600 normal-case font-normal">(optional — leave blank to use AI generation)</span>
                                </label>
                                <select
                                    value={form.questionPackId || ''}
                                    onChange={e => setForm(p => ({ ...p, questionPackId: e.target.value || null }))}
                                    className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition"
                                >
                                    <option value="">— AI-generated questions (default) —</option>
                                    {questionPacks.map(pack => (
                                        <option key={pack._id} value={pack._id}>
                                            {pack.name} ({pack.questions?.length || 0} questions{pack.interviewRole ? ` · ${pack.interviewRole}` : ''})
                                        </option>
                                    ))}
                                </select>
                                {questionPacks.length === 0 && (
                                    <p className="text-[11px] text-slate-500 ml-1">No question packs yet — create one in the Packs section below.</p>
                                )}
                            </div>

                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-3">
                                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Eligibility Filters (optional — leave blank = all)</p>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 ml-1">Eligible Departments</label>
                                    <input
                                        value={form.eligibleDepartments}
                                        onChange={e => setForm(p => ({ ...p, eligibleDepartments: e.target.value }))}
                                        placeholder="e.g. Computer Science, IT (comma-separated)"
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500 transition"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 ml-1">Eligible Batches</label>
                                    <input
                                        value={form.eligibleBatches}
                                        onChange={e => setForm(p => ({ ...p, eligibleBatches: e.target.value }))}
                                        placeholder="e.g. 2024, 2025 (comma-separated)"
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Btn onClick={handleSave} disabled={saving} className="flex-1">
                                {saving ? 'Saving…' : editing ? 'Update Drive' : 'Create Drive'}
                            </Btn>
                            <Btn variant="outline" onClick={closeForm}>Cancel</Btn>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard modal */}
            {lbDrive && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-7 w-full max-w-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-white text-base">{lbDrive.companyName} — {lbDrive.jobRole}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Enrollment leaderboard · min score: {lbDrive.minScore}%</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleExportCSV(lbDrive)}
                                    className="text-xs font-black text-teal-400 hover:text-teal-300 bg-teal-500/10 px-3 py-1.5 rounded-xl transition">⬇ CSV</button>
                                <button onClick={() => setLbDrive(null)} className="text-slate-500 hover:text-white text-xl leading-none transition">✕</button>
                            </div>
                        </div>

                        {isLoading ? (
                            <p className="text-center text-slate-600 py-8 text-xs animate-pulse">Loading…</p>
                        ) : !driveLeaderboard?.entries?.length ? (
                            <p className="text-center text-slate-600 py-10 text-sm">No enrollments yet for this drive.</p>
                        ) : (
                            <div className="space-y-2">
                                {driveLeaderboard.entries.map((e, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3">
                                            <span className={`text-sm font-black w-6 text-center shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-sm text-white truncate">{e.name || '—'}</p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {e.email || ''}
                                                    {e.department ? ` · ${e.department}` : ''}
                                                    {e.batch ? ` · ${e.batch}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0 space-y-0.5">
                                                <p className={`text-sm font-black ${(e.bestScore || 0) >= lbDrive.minScore ? 'text-teal-400' : 'text-slate-400'}`}>
                                                    {e.bestScore != null ? `${e.bestScore}%` : '—'}
                                                </p>
                                                <p className="text-[10px] text-slate-600">{e.sessionsCompleted || 0} sessions</p>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                                e.certificateIssued ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-700/40 text-slate-500'
                                            }`}>
                                                {e.certificateIssued ? '✓ Cert' : 'Not Qual.'}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Question Packs ── */}
            <QuestionPacksSection
                questionPacks={questionPacks}
                availableQuestions={availableQuestions}
                dispatch={dispatch}
                isLoading={isLoading}
            />
        </div>
    );
}

// ─── Question Packs Section ───────────────────────────────────────────────────
function QuestionPacksSection({ questionPacks, availableQuestions, dispatch, isLoading }) {
    const PACK_DEFAULTS = { name: '', description: '', interviewRole: '', interviewLevel: '', questionIds: [] };
    const [showPackForm, setShowPackForm] = useState(false);
    const [editingPack, setEditingPack]   = useState(null);
    const [packForm, setPackForm]         = useState(PACK_DEFAULTS);
    const [savingPack, setSavingPack]     = useState(false);
    const [qSearch, setQSearch]           = useState('');
    const [expanded, setExpanded]         = useState(null);

    const openPackCreate = () => { setEditingPack(null); setPackForm(PACK_DEFAULTS); dispatch(fetchAvailableQuestions()); setShowPackForm(true); };
    const openPackEdit   = p  => {
        setEditingPack(p);
        setPackForm({ name: p.name, description: p.description || '', interviewRole: p.interviewRole || '', interviewLevel: p.interviewLevel || '', questionIds: (p.questions || []).map(q => q._id || q) });
        dispatch(fetchAvailableQuestions({ role: p.interviewRole || '', level: p.interviewLevel || '' }));
        setShowPackForm(true);
    };
    const closePackForm  = () => { setShowPackForm(false); setEditingPack(null); };

    const toggleQuestion = id => {
        setPackForm(p => ({
            ...p,
            questionIds: p.questionIds.includes(id) ? p.questionIds.filter(q => q !== id) : [...p.questionIds, id],
        }));
    };

    const handlePackSave = async () => {
        if (!packForm.name.trim()) { toast.error('Pack name is required.'); return; }
        setSavingPack(true);
        const res = editingPack
            ? await dispatch(updateQuestionPack({ id: editingPack._id, body: packForm }))
            : await dispatch(createQuestionPack(packForm));
        setSavingPack(false);
        if (!res.error) { toast.success(editingPack ? 'Pack updated.' : 'Pack created.'); closePackForm(); }
        else toast.error(res.payload || 'Failed to save pack.');
    };

    const handlePackDelete = async id => {
        if (!window.confirm('Delete this question pack?')) return;
        const res = await dispatch(deleteQuestionPack(id));
        if (!res.error) toast.success('Pack deleted.');
        else toast.error(res.payload || 'Failed to delete.');
    };

    const filteredQs = availableQuestions.filter(q =>
        !qSearch || q.questionText.toLowerCase().includes(qSearch.toLowerCase()) ||
        q.role?.toLowerCase().includes(qSearch.toLowerCase())
    );

    return (
        <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Question Packs</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Create curated sets of questions from the question bank to attach to drives.</p>
                </div>
                <Btn onClick={openPackCreate} className="!text-xs">+ New Pack</Btn>
            </div>

            {questionPacks.length === 0 && !showPackForm && (
                <div className="text-center py-8 bg-slate-800/30 border border-slate-700/30 rounded-2xl">
                    <p className="text-slate-400 font-bold text-sm">No question packs yet</p>
                    <p className="text-slate-600 text-xs mt-1 mb-3">Create a pack to attach to drives, replacing AI generation.</p>
                    <Btn onClick={openPackCreate} className="!text-xs">Create First Pack</Btn>
                </div>
            )}

            {questionPacks.map(p => (
                <div key={p._id} className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="font-black text-white text-sm">{p.name}</p>
                            {p.description && <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>}
                            <p className="text-[11px] text-slate-500 mt-1">
                                {p.questions?.length || 0} questions
                                {p.interviewRole && ` · ${p.interviewRole}`}
                                {p.interviewLevel && ` · ${p.interviewLevel}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setExpanded(expanded === p._id ? null : p._id)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-200 transition">
                                {expanded === p._id ? 'Hide' : 'Preview'}
                            </button>
                            <Btn variant="ghost" onClick={() => openPackEdit(p)} className="!text-xs !py-1 !px-2">Edit</Btn>
                            <Btn variant="danger" onClick={() => handlePackDelete(p._id)} className="!text-xs !py-1 !px-2">Delete</Btn>
                        </div>
                    </div>
                    {expanded === p._id && p.questions?.length > 0 && (
                        <div className="bg-slate-900/60 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
                            {p.questions.map((q, i) => (
                                <div key={q._id || i} className="flex items-start gap-2 text-[11px]">
                                    <span className="text-slate-500 shrink-0 w-4">{i+1}.</span>
                                    <span className="text-slate-300 line-clamp-2 flex-1">{q.questionText}</span>
                                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${q.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' : q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{q.difficulty}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Pack create/edit modal */}
            {showPackForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-7 w-full max-w-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-white text-base">{editingPack ? 'Edit Pack' : 'New Question Pack'}</h3>
                            <button onClick={closePackForm} className="text-slate-500 hover:text-white text-xl leading-none transition">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Pack Name *</label>
                                    <input value={packForm.name} onChange={e => setPackForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. SDE Pack – Google 2025"
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Interview Role</label>
                                    <input value={packForm.interviewRole} onChange={e => setPackForm(p => ({ ...p, interviewRole: e.target.value }))}
                                        placeholder="e.g. Software Engineer"
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Description</label>
                                    <input value={packForm.description} onChange={e => setPackForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Optional description…"
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Level</label>
                                    <select value={packForm.interviewLevel} onChange={e => setPackForm(p => ({ ...p, interviewLevel: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 transition">
                                        <option value="">Any level</option>
                                        {['Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                        Select Questions
                                        <span className="text-teal-400 ml-2 normal-case font-normal">{packForm.questionIds.length} selected</span>
                                    </label>
                                    <button onClick={() => dispatch(fetchAvailableQuestions({ role: packForm.interviewRole, level: packForm.interviewLevel }))}
                                        className="text-[10px] text-teal-400 hover:text-teal-300 font-bold">Refresh</button>
                                </div>
                                <input value={qSearch} onChange={e => setQSearch(e.target.value)}
                                    placeholder="Search questions…"
                                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500 transition" />

                                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-700/30">
                                    {isLoading && <p className="text-center py-6 text-slate-500 text-xs animate-pulse">Loading questions…</p>}
                                    {!isLoading && filteredQs.length === 0 && (
                                        <p className="text-center py-6 text-slate-500 text-xs">No questions found. Try a different filter or add questions to the bank.</p>
                                    )}
                                    {filteredQs.map(q => {
                                        const selected = packForm.questionIds.includes(q._id);
                                        return (
                                            <label key={q._id} className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-700/30 transition ${selected ? 'bg-teal-500/5' : ''}`}>
                                                <input type="checkbox" checked={selected} onChange={() => toggleQuestion(q._id)}
                                                    className="mt-0.5 accent-teal-500 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-xs leading-snug line-clamp-2 ${selected ? 'text-teal-200' : 'text-slate-300'}`}>{q.questionText}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-slate-500">{q.role}</span>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${q.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' : q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{q.difficulty}</span>
                                                        <span className="text-[10px] text-slate-600">{q.questionType}</span>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <Btn onClick={handlePackSave} disabled={savingPack} className="flex-1">
                                {savingPack ? 'Saving…' : editingPack ? 'Update Pack' : 'Create Pack'}
                            </Btn>
                            <Btn variant="outline" onClick={closePackForm}>Cancel</Btn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const ALL_TABS = [
    { id: 'students',  label: 'Students',  icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'subjects',  label: 'Subjects',  icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'roles',     label: 'Roles',     icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'goals',     label: 'Goals',     icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { id: 'drives',    label: 'Drives',    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
];

export default function OrgAdminDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { orgAdmin, orgInfo } = useSelector(s => s.orgAdmin);
    const [activeTab, setActiveTab]     = useState('students');
    const [showExport, setShowExport]   = useState(false);
    const [showDigest, setShowDigest]   = useState(false);

    useEffect(() => { dispatch(fetchOrgInfo()); }, [dispatch]);

    const handleLogout = () => {
        dispatch(orgAdminLogout());
        navigate('/org-admin/login', { replace: true });
        toast.info('Logged out.');
    };

    const orgName  = orgInfo?.name  || orgAdmin?.orgName  || 'Organization';
    const orgType  = orgInfo?.type  || orgAdmin?.orgType  || 'college';
    const orgCode  = orgInfo?.orgCode || orgAdmin?.orgCode || '';
    const country  = orgInfo?.country || '';
    const plan     = orgInfo?.plan   || 'free';

    const planColor = { free: 'bg-slate-700 text-slate-400', basic: 'bg-blue-500/10 text-blue-400', premium: 'bg-violet-500/10 text-violet-400' };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="font-black text-white text-sm leading-tight truncate">{orgName}</h1>
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-bold capitalize shrink-0">
                                    {orgType === 'college' ? '🎓 College' : '🏢 Corporate'}
                                </span>
                                {country && <span className="text-xs text-slate-500">{country}</span>}
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold capitalize ${planColor[plan]}`}>{plan}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono">Code: <span className="text-teal-400 font-bold">{orgCode}</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => setShowDigest(true)}
                            className="text-sm text-slate-400 hover:text-teal-400 font-bold transition flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            Schedule
                        </button>
                        <button onClick={() => setShowExport(true)}
                            className="text-sm text-slate-400 hover:text-teal-400 font-bold transition flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                            Export
                        </button>
                        <button onClick={handleLogout}
                            className="text-sm text-slate-400 hover:text-white font-bold transition flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Tab nav */}
            <div className="border-b border-slate-800 bg-slate-900/50">
                <div className="max-w-5xl mx-auto px-4 flex gap-1">
                    {ALL_TABS.filter(t => (t.id !== 'subjects' || orgType === 'college') && (t.id !== 'roles' || orgType === 'corporate') && (t.id !== 'goals' || orgType === 'corporate' || orgType === 'college')).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon}/></svg>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-4 py-6">
                {activeTab === 'students'  && <StudentsTab  orgInfo={orgInfo} />}
                {activeTab === 'analytics' && <AnalyticsTab orgInfo={orgInfo} />}
                {activeTab === 'subjects'  && <SubjectAnalyticsTab orgInfo={orgInfo} />}
                {activeTab === 'roles'     && <RoleAnalyticsTab />}
                {activeTab === 'goals'     && <GoalsTab orgInfo={orgInfo} />}
                {activeTab === 'drives'    && <DrivesTab orgInfo={orgInfo} />}
            </main>

            {showExport && (
                <TeamExportModal
                    orgName={orgName}
                    orgType={orgType}
                    orgCode={orgCode}
                    country={country}
                    onClose={() => setShowExport(false)}
                />
            )}

            {showDigest && (
                <DigestSettingsModal onClose={() => setShowDigest(false)} />
            )}
        </div>
    );
}
