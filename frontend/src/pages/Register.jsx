import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { register, reset, updateUserState } from '../features/auth/authSlice'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'
import { getAllRoles, EXPERIENCE_LEVELS } from '../data/roleCatalog'

const API_URL = `${import.meta.env.VITE_API_URL}/users/`;
const ORG_ADMIN_API = `${import.meta.env.VITE_API_URL}/org-admin/`;
const CORP_ROLES = getAllRoles();

const Register = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  // inviteLocked is based purely on token presence — backend enforces all payload claims
  const inviteLocked = !!inviteToken;

  // Decode payload for display hints only (email pre-fill, org name, dept/batch labels)
  // base64url → standard base64: swap URL-safe chars then pad to multiple of 4
  const invitePayload = (() => {
    if (!inviteToken) return null;
    try {
      const seg = inviteToken.split('.')[1] || '';
      const b64 = seg.replace(/-/g, '+').replace(/_/g, '/').padEnd(
        seg.length + (4 - (seg.length % 4)) % 4, '='
      );
      return JSON.parse(atob(b64));
    } catch { return null; }
  })();

  const [formData, setFormData] = useState({
    name: '',
    email: invitePayload?.email || '',
    password: '',
    password2: '',
  })
  const { name, email, password, password2 } = formData
  const [orgCode, setOrgCode]           = useState(invitePayload?.orgCode || '');
  const [showOrgField, setShowOrgField] = useState(false);
  const [orgPreview, setOrgPreview]     = useState(null);
  const [orgLoading, setOrgLoading]     = useState(false);
  const [corpRole, setCorpRole]         = useState(CORP_ROLES[0]);
  const [corpLevel, setCorpLevel]       = useState(EXPERIENCE_LEVELS[0]);
  const [orgDepts, setOrgDepts]         = useState([]);
  const [orgBatches, setOrgBatches]     = useState([]);
  const [selDept, setSelDept]           = useState('');
  const [selBatch, setSelBatch]         = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);

  const navigate  = useNavigate()
  const dispatch  = useDispatch()
  const { user, isLoading, isError, isSuccess, message } = useSelector(s => s.auth)

  useEffect(() => {
    if (isError)   { toast.error(message); dispatch(reset()); }
    if (isSuccess) { toast.success('Account created! Welcome aboard.'); navigate('/dashboard'); dispatch(reset()); }
    // If logged in without an invite token, redirect to dashboard as usual
    if (user && !isSuccess && !inviteToken) navigate('/dashboard')
  }, [user, isError, isSuccess, message, navigate, dispatch, inviteToken])

  const onAcceptInvite = async () => {
    setAcceptLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data: updatedUser } = await axios.post(`${ORG_ADMIN_API}invite/accept`, { inviteToken }, config);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch(updateUserState(updatedUser));
      toast.success(`Successfully joined ${updatedUser.orgName || invitePayload?.orgName || 'the organization'}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept invite.');
    } finally {
      setAcceptLoading(false);
    }
  };

  // Debounced org code lookup (only when not locked via invite)
  useEffect(() => {
    if (inviteLocked) return;
    setOrgPreview(null);
    setOrgDepts([]);
    setOrgBatches([]);
    setSelDept('');
    setSelBatch('');
    if (!orgCode || orgCode.length < 3) return;
    const t = setTimeout(async () => {
      setOrgLoading(true);
      try {
        const { data } = await axios.get(`${API_URL}org-preview/${orgCode.toUpperCase()}`);
        setOrgPreview({ ...data, found: true });
        // Fetch departments and batches for this org
        try {
          const { data: deptData } = await axios.get(`${API_URL}org-departments/${orgCode.toUpperCase()}`);
          setOrgDepts(deptData.departments || []);
          setOrgBatches(deptData.batches || []);
        } catch { /* org has no departments/batches configured */ }
      } catch {
        setOrgPreview({ found: false });
      } finally { setOrgLoading(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [orgCode, inviteLocked]);

  const onChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const isCorporateVerified = orgPreview?.found && orgPreview?.type === 'corporate';

  const onSubmit = (e) => {
    e.preventDefault()
    if (password !== password2) { toast.error('Passwords do not match'); return; }
    const userData = { name, email, password };
    // Always submit the raw invite token when present — backend verifies it
    if (inviteToken) {
      // Only send the token — backend extracts dept/batch from verified JWT claims server-side
      userData.inviteToken = inviteToken;
    } else if (showOrgField && orgCode.trim()) {
      userData.orgCode = orgCode.toUpperCase().trim();
      if (isCorporateVerified) {
        userData.preferredRole  = corpRole;
        userData.preferredLevel = corpLevel;
      }
      if (selDept)  userData.department = selDept;
      if (selBatch) userData.batch      = selBatch;
    }
    dispatch(register(userData))
  }

  if (isLoading) return (
    <div className='flex justify-center items-center h-screen'>
      <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500'></div>
    </div>
  )

  // Logged-in user with an invite token — show accept flow
  if (user && inviteToken) return (
    <div className='flex justify-center items-center min-h-[90vh] bg-gray-50 sm:px-6 py-10'>
      <div className='w-full max-w-md bg-white p-6 sm:p-10 border border-gray-200 rounded-2xl shadow-xl'>
        <div className='text-center mb-8'>
          <h2 className='text-xs font-black uppercase tracking-[0.3em] text-teal-600 mb-2'>AI Interviewer</h2>
          <h1 className='text-3xl sm:text-4xl font-black text-gray-900 leading-tight'>
            Join <span className='text-teal-500'>Organization</span>
          </h1>
          <p className='text-gray-500 mt-3 text-sm sm:text-base px-2'>
            You're already signed in. Accept the invite below to link your account.
          </p>
        </div>

        {invitePayload && (
          <div className='flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl mb-6'>
            <span className='text-3xl'>{invitePayload.orgType === 'college' ? '🎓' : '🏢'}</span>
            <div className='min-w-0'>
              <p className='font-black text-teal-800 text-base leading-tight'>{invitePayload.orgName}</p>
              <p className='text-xs text-teal-600 font-medium capitalize mt-0.5'>
                {invitePayload.orgType} · Code: <span className='font-black font-mono'>{invitePayload.orgCode}</span>
              </p>
              {(invitePayload.department || invitePayload.batch) && (
                <p className='text-xs text-teal-500 mt-1'>
                  {invitePayload.department && <span>Dept: {invitePayload.department}</span>}
                  {invitePayload.department && invitePayload.batch && ' · '}
                  {invitePayload.batch && <span>Batch: {invitePayload.batch}</span>}
                </p>
              )}
            </div>
          </div>
        )}

        <div className='bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-600'>
          Signed in as <span className='font-bold text-gray-800'>{user.email || user.name}</span>. Accepting this invite will link your existing account to the organization above.
        </div>

        <button
          onClick={onAcceptInvite}
          disabled={acceptLoading}
          className='w-full bg-teal-600 text-white p-3.5 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {acceptLoading ? 'Joining…' : `Accept Invite & Join ${invitePayload?.orgName || 'Organization'}`}
        </button>

        <p className='mt-6 text-center text-sm text-gray-500'>
          Wrong account? <Link to="/login" className='text-teal-600 font-bold hover:underline'>Sign in with a different account</Link>
        </p>
      </div>
    </div>
  )

  return (
    <div className='flex justify-center items-center min-h-[90vh] bg-gray-50 sm:px-6 py-10'>
      <div className='w-full max-w-md bg-white p-6 sm:p-10 border border-gray-200 rounded-2xl shadow-xl'>

        <div className='text-center mb-8'>
          <h2 className='text-xs font-black uppercase tracking-[0.3em] text-teal-600 mb-2'>AI Interviewer</h2>
          <h1 className='text-3xl sm:text-4xl font-black text-gray-900 leading-tight'>
            Get <span className='text-teal-500'>Started</span>
          </h1>
          <p className='text-gray-500 mt-3 text-sm sm:text-base px-2'>
            Join thousands of developers practicing with AI Interviewer
          </p>
        </div>

        <form onSubmit={onSubmit} className='grid grid-cols-1 gap-4'>

          {/* Name */}
          <div className='space-y-1'>
            <label className='text-[10px] font-bold uppercase text-gray-400 ml-1'>Full Name</label>
            <input type="text" name="name" value={name} onChange={onChange} required
              placeholder='Priya Sharma'
              className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all' />
          </div>

          {/* Email */}
          <div className='space-y-1'>
            <label className='text-[10px] font-bold uppercase text-gray-400 ml-1'>Email</label>
            <input type="email" name="email" value={email} onChange={onChange} required
              placeholder='priya@college.edu'
              readOnly={!!(inviteLocked && invitePayload?.email)}
              className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all ${inviteLocked && invitePayload?.email ? 'opacity-60 cursor-not-allowed' : ''}`} />
          </div>

          {/* Passwords */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <label className='text-[10px] font-bold uppercase text-gray-400 ml-1'>Password</label>
              <input type="password" name="password" value={password} onChange={onChange} required
                placeholder='••••••••'
                className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all' />
            </div>
            <div className='space-y-1'>
              <label className='text-[10px] font-bold uppercase text-gray-400 ml-1'>Confirm</label>
              <input type="password" name="password2" value={password2} onChange={onChange} required
                placeholder='••••••••'
                className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all' />
            </div>
          </div>

          {/* Org code section — locked if invited, otherwise toggle */}
          <div className='border-t border-gray-100 pt-3'>
            {!inviteLocked && (
              <button type="button"
                onClick={() => { setShowOrgField(s => !s); setOrgCode(''); setOrgPreview(null); }}
                className='flex items-center gap-2.5 text-xs font-bold text-gray-500 hover:text-teal-600 transition-colors group'>
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${showOrgField ? 'bg-teal-500 border-teal-500' : 'border-gray-300 group-hover:border-teal-400'}`}>
                  {showOrgField && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </span>
                Joining a college or corporate organization?
              </button>
            )}

            {/* Invite-locked org banner */}
            {inviteLocked && invitePayload && (
              <div className='flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl'>
                <span className='text-2xl'>{invitePayload.orgType === 'college' ? '🎓' : '🏢'}</span>
                <div className='min-w-0'>
                  <p className='font-black text-teal-800 text-sm leading-tight'>{invitePayload.orgName}</p>
                  <p className='text-xs text-teal-600 font-medium capitalize mt-0.5'>
                    {invitePayload.orgType} · Code: <span className='font-black font-mono'>{invitePayload.orgCode}</span>
                  </p>
                </div>
                <div className='ml-auto shrink-0 flex items-center gap-1 bg-teal-500 text-white text-xs font-black px-2 py-1 rounded-full'>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                  Invited
                </div>
              </div>
            )}

            {showOrgField && (
              <div className='mt-3 space-y-2'>
                <label className='text-[10px] font-bold uppercase text-gray-400 ml-1'>
                  Organization Code <span className='normal-case font-normal text-gray-300'>(given by your admin)</span>
                </label>
                <input
                  type="text" value={orgCode}
                  onChange={e => setOrgCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={10} autoComplete="off" placeholder='e.g. MIT001'
                  className='w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all font-mono font-bold text-teal-700 text-sm placeholder-gray-300'
                />

                {orgLoading && (
                  <div className='flex items-center gap-2 text-xs text-gray-400 ml-1'>
                    <div className='w-3 h-3 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin'/>
                    Looking up organization…
                  </div>
                )}

                {orgPreview?.found && (
                  <div className='space-y-3'>
                    {/* Verified badge */}
                    <div className='flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl'>
                      <span className='text-2xl'>{orgPreview.type === 'college' ? '🎓' : '🏢'}</span>
                      <div className='min-w-0'>
                        <p className='font-black text-teal-800 text-sm leading-tight'>{orgPreview.name}</p>
                        <p className='text-xs text-teal-600 font-medium capitalize mt-0.5'>
                          {orgPreview.type}{orgPreview.country ? ` · ${orgPreview.country}` : ''}
                        </p>
                      </div>
                      <div className='ml-auto shrink-0 flex items-center gap-1 bg-teal-500 text-white text-xs font-black px-2 py-1 rounded-full'>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                        Verified
                      </div>
                    </div>

                    {/* Department & Batch selectors (shown when org has them configured) */}
                    {(orgDepts.length > 0 || orgBatches.length > 0) && (
                      <div className='bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3'>
                        <p className='text-[10px] font-black uppercase tracking-widest text-gray-400'>Your Details <span className='normal-case font-normal text-gray-300'>(optional)</span></p>
                        {orgDepts.length > 0 && (
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold uppercase text-gray-400 ml-1'>Department</label>
                            <select
                              value={selDept}
                              onChange={e => setSelDept(e.target.value)}
                              className='w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all'
                            >
                              <option value=''>— Select department —</option>
                              {orgDepts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        )}
                        {orgBatches.length > 0 && (
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold uppercase text-gray-400 ml-1'>Batch</label>
                            <select
                              value={selBatch}
                              onChange={e => setSelBatch(e.target.value)}
                              className='w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all'
                            >
                              <option value=''>— Select batch —</option>
                              {orgBatches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Corporate role + level picker */}
                    {orgPreview.type === 'corporate' && (
                      <div className='bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='text-base'>🏢</span>
                          <p className='text-xs font-black text-violet-700 uppercase tracking-widest'>Your Role at {orgPreview.name}</p>
                        </div>
                        <p className='text-[11px] text-violet-500 font-medium -mt-1'>This pre-configures your interview track so you practice the right skills from day one.</p>

                        {/* Job Role */}
                        <div className='space-y-1'>
                          <label className='text-[10px] font-bold uppercase text-violet-500 ml-1'>Job Role</label>
                          <select
                            value={corpRole}
                            onChange={e => setCorpRole(e.target.value)}
                            className='w-full p-2.5 bg-white border border-violet-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-violet-400 outline-none transition-all'
                          >
                            {CORP_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>

                        {/* Experience Level */}
                        <div className='space-y-1'>
                          <label className='text-[10px] font-bold uppercase text-violet-500 ml-1'>Experience Level</label>
                          <div className='grid grid-cols-3 gap-2'>
                            {EXPERIENCE_LEVELS.map(lvl => (
                              <button
                                key={lvl} type='button'
                                onClick={() => setCorpLevel(lvl)}
                                className={`p-2 rounded-xl text-xs font-black border-2 transition-all ${
                                  corpLevel === lvl
                                    ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
                                    : 'bg-white border-violet-200 text-violet-500 hover:border-violet-400'
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {orgPreview?.found === false && orgCode.length >= 3 && (
                  <div className='flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl'>
                    <span className='text-base'>❌</span>
                    <p className='text-xs text-rose-600 font-medium'>Organization code not found or inactive. Check with your admin.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={isLoading}
            className='w-full bg-teal-600 text-white p-3.5 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 mt-1 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'>
            Create My Account
          </button>
        </form>

        <p className='mt-8 text-center text-sm text-gray-500'>
          Already have an account? <Link to="/login" className='text-teal-600 font-bold hover:underline'>Sign In</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
