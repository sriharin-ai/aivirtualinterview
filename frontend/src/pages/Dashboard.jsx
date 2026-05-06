import { useState, useEffect, useRef, useMemo } from "react"
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { createSession, getSessions, reset, deleteSession, fetchPublicTemplates, fetchLeaderboard, fetchPublicRoles, fetchPublicSkills, clearJustQualified } from '../features/sessions/sessionSlice'
import { fetchEligibleDrives, enrollInDrive, fetchStudentLeaderboard, clearStudentLeaderboard, fetchDriveSessions, clearDriveSessions, fetchMyEnrollments } from '../features/drives/drivesSlice'
import { updateProfile, saveUserGoal, fetchBatchLeaderboard } from '../features/auth/authSlice'
import { toast } from 'react-toastify'
import SessionCard from "../components/SessionCard"
import { getSubjectsForCountry, getTopicsForSubject, SEMESTERS } from '../data/subjectCatalog'
import { getTopicsForRole, getAllRoles, EXPERIENCE_LEVELS } from '../data/roleCatalog'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const SKILL_COLORS = [
  { line: '#14b8a6', fill: 'rgba(20,184,166,0.08)' },
  { line: '#6366f1', fill: 'rgba(99,102,241,0.08)' },
  { line: '#f59e0b', fill: 'rgba(245,158,11,0.08)' },
  { line: '#ec4899', fill: 'rgba(236,72,153,0.08)' },
  { line: '#10b981', fill: 'rgba(16,185,129,0.08)' },
  { line: '#3b82f6', fill: 'rgba(59,130,246,0.08)' },
  { line: '#f97316', fill: 'rgba(249,115,22,0.08)' },
  { line: '#8b5cf6', fill: 'rgba(139,92,246,0.08)' },
];

const computeSkillHistory = (sessions) => {
  const skillMap = {};
  const completed = [...sessions]
    .filter(s => s.status === 'completed' && s.skills?.length > 0 && s.questions?.length > 0)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  for (const session of completed) {
    for (const skill of session.skills) {
      const matched = session.questions.filter(q =>
        q.isEvaluated && q.questionText?.toLowerCase().includes(skill.toLowerCase())
      );
      if (matched.length === 0) continue;
      const score = Math.round(
        matched.reduce((sum, q) => sum + (q.technicalScore + q.confidenceScore) / 2, 0) / matched.length
      );
      const label = new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!skillMap[skill]) skillMap[skill] = [];
      skillMap[skill].push({ label, score, sessionId: session._id });
    }
  }
  return Object.entries(skillMap)
    .filter(([, pts]) => pts.length >= 2)
    .map(([skill, points]) => ({ skill, points }));
};

const ROLES = [
  "MERN Stack Developer",
  "MEAN Stack Developer",
  "Full Stack Python",
  "Full Stack Java",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Cloud Engineer (AWS/Azure/GCP)",
  "Cybersecurity Engineer",
  "Blockchain Developer",
  "Mobile Developer (iOS/Android)",
  "Game Developer",
  "UI/UX Designer",
  "QA Automation Engineer",
  "Product Manager"
];
const LEVELS = ["Junior", "Mid-Level", "Senior"];
const TYPES = [{ label: 'Oral only', value: 'oral-only' }, { label: 'Coding Mix', value: 'coding-mix' }];
const COUNTS = [5, 10, 15];

const getRoleIcon = (role = '') => {
  if (role.includes('Python')) return '🐍';
  if (role.includes('MERN') || role.includes('MEAN') || role.includes('React') || role.includes('Frontend')) return '⚛️';
  if (role.includes('Data') || role.includes('Machine') || role.includes('AI')) return '📊';
  if (role.includes('DevOps') || role.includes('Cloud')) return '☁️';
  if (role.includes('Security') || role.includes('Cyber')) return '🛡️';
  if (role.includes('Blockchain')) return '⛓️';
  if (role.includes('Mobile') || role.includes('iOS') || role.includes('Android')) return '📱';
  if (role.includes('Game')) return '🎮';
  if (role.includes('UI') || role.includes('UX') || role.includes('Designer')) return '🎨';
  if (role.includes('QA') || role.includes('Test')) return '🧪';
  if (role.includes('Product') || role.includes('Manager')) return '📝';
  if (role.includes('Java') || role.includes('Backend')) return '☕';
  return '💻';
};

const computeRoleInsights = (sessions) => {
  const completed = sessions.filter(s => s.status === 'completed' && typeof s.overallScore === 'number');
  if (completed.length < 2) return null;

  const byRole = {};
  completed.forEach(s => {
    if (!byRole[s.role]) byRole[s.role] = { scores: [], role: s.role };
    byRole[s.role].scores.push(s.overallScore);
  });

  const roleStats = Object.values(byRole).map(r => ({
    role: r.role,
    avg: Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length),
    count: r.scores.length,
  }));

  if (roleStats.length < 2) return null;

  const sorted = [...roleStats].sort((a, b) => b.avg - a.avg);
  const best = sorted[0];
  const needsWork = [...roleStats].filter(r => r.count >= 1).sort((a, b) => a.avg - b.avg)[0];
  const recommended = needsWork.role !== best.role ? needsWork : sorted[sorted.length - 1];

  return { best, recommended };
};

const computeStats = (sessions) => {
  const completed = [...sessions]
    .filter(s => s.status === 'completed' && typeof s.overallScore === 'number')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (completed.length === 0) return { streak: 0, best: 0, avg: 0, trend: [] };

  const scores = completed.map(s => s.overallScore);
  const best = Math.max(...scores);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const trend = scores.slice(-8);

  let streak = 1;
  for (let i = scores.length - 1; i > 0; i--) {
    if (scores[i] >= scores[i - 1]) streak++;
    else break;
  }

  return { streak, best, avg, trend };
};

// ─── Practice Streak (consecutive calendar days with ≥1 completed session) ─────
const STREAK_BADGES = [
  { days: 3,  icon: '🔥', label: 'On a Roll',    bg: 'from-orange-500 to-red-500',    ring: 'ring-orange-300' },
  { days: 7,  icon: '⚡', label: 'Week Warrior',  bg: 'from-amber-400 to-yellow-500',  ring: 'ring-yellow-300' },
  { days: 30, icon: '🏆', label: 'Month Master',  bg: 'from-violet-500 to-indigo-600', ring: 'ring-violet-300' },
];

const computePracticeStreak = (sessions) => {
  const toDay = d => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  };
  const daySet = new Set(
    sessions.filter(s => s.status === 'completed').map(s => toDay(s.createdAt || s.startTime))
  );
  if (!daySet.size) return { current: 0, longest: 0 };

  const MS_DAY = 86_400_000;
  const todayStr = toDay(new Date());

  // Current streak — walk backwards from today; if today empty, try yesterday
  let current = 0;
  let cursor = new Date(todayStr).getTime();
  if (!daySet.has(todayStr)) cursor -= MS_DAY;       // grace: streak continues if missed today
  while (daySet.has(toDay(new Date(cursor)))) {
    current++;
    cursor -= MS_DAY;
  }

  // Longest streak — scan sorted day list
  const sorted = [...daySet].sort();
  let longest = 0, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / MS_DAY;
    if (diff === 1) { run++; if (run > longest) longest = run; }
    else { if (run > longest) longest = run; run = 1; }
  }
  if (run > longest) longest = run;
  longest = Math.max(longest, current);

  return { current, longest };
};

// ─── Certificate Generator ─────────────────────────────────────────────────────
function generateCertificateDataURL(name, role, level, readiness) {
  const W = 1200, H = 630, PAD = 56;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e293b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Subtle diagonal grid
  ctx.strokeStyle = 'rgba(255,255,255,0.022)'; ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 60) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
  }

  // Card background
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, H - PAD * 2, 20); ctx.fill();

  // Card border
  ctx.strokeStyle = 'rgba(20,184,166,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, H - PAD * 2, 20); ctx.stroke();

  // Top accent bar (teal → indigo)
  const accent = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  accent.addColorStop(0, '#14b8a6'); accent.addColorStop(1, '#6366f1');
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, 7, [20, 20, 0, 0]); ctx.fill();

  // Brand (top-left)
  ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#14b8a6'; ctx.textAlign = 'left';
  ctx.fillText('AI INTERVIEWER', PAD + 38, PAD + 54);

  // Date (top-right)
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#475569'; ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), W - PAD - 38, PAD + 54);

  // Separator
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD + 38, PAD + 72); ctx.lineTo(W - PAD - 38, PAD + 72); ctx.stroke();

  // "THIS CERTIFIES THAT"
  ctx.textAlign = 'center'; ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = '#475569';
  ctx.fillText('THIS CERTIFIES THAT', W / 2, PAD + 114);

  // Name (auto-shrink for long names)
  let nameFontSize = 46;
  ctx.font = `bold ${nameFontSize}px system-ui, -apple-system, sans-serif`;
  while (ctx.measureText(name || 'Candidate').width > W - PAD * 2 - 100 && nameFontSize > 24) {
    nameFontSize -= 2;
    ctx.font = `bold ${nameFontSize}px system-ui, sans-serif`;
  }
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(name || 'Candidate', W / 2, PAD + 160);

  // "has achieved"
  ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#64748b';
  ctx.fillText('has achieved', W / 2, PAD + 197);

  // Score (hero — gradient)
  const scoreGrad = ctx.createLinearGradient(W / 2 - 120, 0, W / 2 + 120, 0);
  scoreGrad.addColorStop(0, '#14b8a6'); scoreGrad.addColorStop(1, '#818cf8');
  ctx.font = 'bold 108px system-ui, -apple-system, sans-serif'; ctx.fillStyle = scoreGrad;
  ctx.fillText(`${readiness}%`, W / 2, PAD + 315);

  // "JOB READINESS"
  ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillStyle = '#94a3b8';
  ctx.fillText('JOB READINESS', W / 2, PAD + 350);

  // Role pill
  const roleText = `${level}  ·  ${role}`;
  ctx.font = '17px system-ui, sans-serif';
  const rw = ctx.measureText(roleText).width + 52;
  const rx = W / 2 - rw / 2, ry = PAD + 368;
  ctx.fillStyle = 'rgba(99,102,241,0.15)';
  ctx.beginPath(); ctx.roundRect(rx, ry, rw, 36, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(rx, ry, rw, 36, 18); ctx.stroke();
  ctx.fillStyle = '#a5b4fc'; ctx.fillText(roleText, W / 2, ry + 25);

  // "Job-Ready" badge (100% only)
  if (readiness >= 100) {
    const bw = 166, bh = 34, bx = W - PAD - 38 - bw, by = PAD + 370;
    const badgeGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    badgeGrad.addColorStop(0, '#14b8a6'); badgeGrad.addColorStop(1, '#6366f1');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 17); ctx.fill();
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('✓  FULLY JOB-READY', bx + bw / 2, by + 23);
  }

  // Progress bar
  const barW = 480, barH = 10, barX = W / 2 - 240, barY = PAD + 428;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 5); ctx.fill();
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, '#14b8a6'); fillGrad.addColorStop(1, '#6366f1');
  ctx.fillStyle = fillGrad;
  ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(barH, barW * readiness / 100), barH, 5); ctx.fill();

  // Milestone pips
  [25, 50, 75, 100].forEach(m => {
    const x = barX + barW * m / 100;
    ctx.fillStyle = readiness >= m ? '#14b8a6' : 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(x, barY + barH / 2, 7, 0, Math.PI * 2); ctx.fill();
    if (readiness >= m) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.fillText('✓', x, barY + barH / 2 + 3);
    }
  });

  // Pip labels
  ctx.font = '11px system-ui, sans-serif';
  [[25,'left'],[50,'center'],[75,'center'],[100,'right']].forEach(([m, align]) => {
    const x = barX + barW * m / 100;
    ctx.fillStyle = readiness >= m ? '#14b8a6' : '#475569';
    ctx.textAlign = align;
    ctx.fillText(`${m}%`, x, barY + barH + 20);
  });
  ctx.textAlign = 'center';

  // Footer
  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#334155';
  ctx.fillText('Generated by AI Interviewer · AI-powered technical interview practice', W / 2, H - PAD - 6);

  return c.toDataURL('image/png');
}

function generateProgressCardDataURL(name, avgScore, subjectCount, batchGoal, currentScore) {
  const W = 1200, H = 630, PAD = 56;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e293b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.022)'; ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 60) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, H - PAD * 2, 20); ctx.fill();

  ctx.strokeStyle = 'rgba(20,184,166,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, H - PAD * 2, 20); ctx.stroke();

  const accent = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  accent.addColorStop(0, '#14b8a6'); accent.addColorStop(1, '#6366f1');
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, 7, [20, 20, 0, 0]); ctx.fill();

  ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#14b8a6'; ctx.textAlign = 'left';
  ctx.fillText('AI INTERVIEWER', PAD + 38, PAD + 54);

  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#475569'; ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), W - PAD - 38, PAD + 54);

  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD + 38, PAD + 72); ctx.lineTo(W - PAD - 38, PAD + 72); ctx.stroke();

  ctx.textAlign = 'center'; ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = '#475569';
  ctx.fillText('PLACEMENT READINESS REPORT', W / 2, PAD + 114);

  let nameFontSize = 46;
  ctx.font = `bold ${nameFontSize}px system-ui, -apple-system, sans-serif`;
  while (ctx.measureText(name || 'Student').width > W - PAD * 2 - 100 && nameFontSize > 24) {
    nameFontSize -= 2;
    ctx.font = `bold ${nameFontSize}px system-ui, sans-serif`;
  }
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(name || 'Student', W / 2, PAD + 160);

  ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#64748b';
  ctx.fillText('average practice score', W / 2, PAD + 197);

  const scoreGrad = ctx.createLinearGradient(W / 2 - 120, 0, W / 2 + 120, 0);
  scoreGrad.addColorStop(0, '#14b8a6'); scoreGrad.addColorStop(1, '#818cf8');
  ctx.font = 'bold 108px system-ui, -apple-system, sans-serif'; ctx.fillStyle = scoreGrad;
  ctx.fillText(avgScore != null ? `${avgScore}%` : '—', W / 2, PAD + 315);

  ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${subjectCount} SUBJECT${subjectCount !== 1 ? 'S' : ''} PRACTICED`, W / 2, PAD + 350);

  if (batchGoal?.targetScore) {
    const pct = Math.min(100, Math.round(((currentScore || 0) / batchGoal.targetScore) * 100));
    const barW = 480, barH = 10, barX = W / 2 - 240, barY = PAD + 395;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 5); ctx.fill();
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fillGrad.addColorStop(0, '#14b8a6'); fillGrad.addColorStop(1, '#6366f1');
    ctx.fillStyle = fillGrad;
    ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(barH, barW * pct / 100), barH, 5); ctx.fill();
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'center';
    ctx.fillText(`${pct}% of batch goal (${batchGoal.targetScore}% target)`, W / 2, barY + barH + 22);
  }

  ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#334155'; ctx.textAlign = 'center';
  ctx.fillText('Generated by AI Interviewer · AI-powered technical interview practice', W / 2, H - PAD - 6);

  return c.toDataURL('image/png');
}

function buildLinkedInPost(name, role, level, readiness) {
  const milestones = [100, 75, 50, 25].find(m => readiness >= m);
  const headline = milestones === 100 ? "I'm fully job-ready!" :
    milestones === 75 ? "I'm almost job-ready — 75% there!" :
    milestones === 50 ? "I've hit the halfway mark in my interview prep!" :
    milestones === 25 ? "I've crossed my first interview readiness milestone!" :
    "I've started my technical interview prep journey!";
  return `🎯 ${headline}

I just achieved ${readiness}% job readiness as a ${level} ${role} through AI-powered mock interview practice.

Consistently working through real technical questions, getting instant AI feedback, and tracking progress milestone by milestone. Deliberate practice > passive studying.

#JobSearch #TechInterview #CareerGrowth #InterviewPrep #${role.split(' ').join('')}`;
}

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const skillsInputRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  const { sessions, templates, leaderboard, publicRoles, publicSkills, isLoading, isGenerating, isError, message, justQualifiedDrive } = useSelector((state) => state.sessions);
  const { eligibleDrives, myEnrollments, studentLeaderboard, driveSessionsMap, driveSessionsLoading } = useSelector((state) => state.drives);
  const { batchLeaderboard, batchLeaderboardLoading } = useSelector((state) => state.auth);
  const isProcessing = isGenerating;

  const isCollegeUser = user?.userType === 'college';
  const isCorporateUser = user?.userType === 'corporate';
  const collegeSubjects = isCollegeUser ? getSubjectsForCountry(user?.orgCountry || '') : [];
  const collegeSubjectNames = collegeSubjects.map(s => s.name);

  const [formData, setFormData] = useState({
    role:  isCollegeUser ? (collegeSubjectNames[0] || ROLES[0]) : (user.preferredRole || ROLES[0]),
    level: isCollegeUser ? SEMESTERS[0] : (user.preferredLevel || LEVELS[0]),
    interviewType: TYPES[1].value,
    count: COUNTS[0],
  });
  const [skills, setSkills] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [appliedTemplateId, setAppliedTemplateId] = useState(null);
  const [historicalDrivesMap, setHistoricalDrivesMap] = useState({});
  const fetchedDriveIds = useRef(new Set());

  useEffect(() => {
    dispatch(getSessions());
    dispatch(fetchPublicTemplates());
    dispatch(fetchLeaderboard());
    dispatch(fetchPublicRoles());
    dispatch(fetchPublicSkills());
    if (user?.orgId) { dispatch(fetchEligibleDrives()); dispatch(fetchMyEnrollments()); }
  }, [dispatch, user?.orgId]);

  useEffect(() => {
    if (!sessions.length) return;
    const eligibleIds = new Set(eligibleDrives.map(d => d._id));
    const missing = [...new Set(
      sessions.map(s => s.driveId).filter(id => id && !eligibleIds.has(id) && !fetchedDriveIds.current.has(id))
    )];
    if (!missing.length) return;
    missing.forEach(id => fetchedDriveIds.current.add(id));
    const token = JSON.parse(localStorage.getItem('user') || '{}')?.token;
    const base = import.meta.env.VITE_API_URL;
    Promise.allSettled(
      missing.map(id =>
        fetch(`${base}/drives/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const updates = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) updates[missing[i]] = r.value;
      });
      if (Object.keys(updates).length) setHistoricalDrivesMap(prev => ({ ...prev, ...updates }));
    });
  }, [sessions, eligibleDrives]);

  useEffect(() => {
    if (isCollegeUser && user?.batch && user?.orgId) {
      dispatch(fetchBatchLeaderboard());
    }
  }, [dispatch, isCollegeUser, user?._id, user?.batch, user?.orgId]);

  const dynamicRoles = publicRoles.length > 0 ? publicRoles.map(r => r.name) : ROLES;

  const selectedRoleObj = useMemo(() =>
    publicRoles.find(r => r.name === formData.role) || null,
  [publicRoles, formData.role]);

  const dynamicLevels = selectedRoleObj?.levels?.length > 0 ? selectedRoleObj.levels : LEVELS;

  const activeLevelConfig = useMemo(() => {
    if (!selectedRoleObj?.levelConfigs?.length) return null;
    return selectedRoleObj.levelConfigs.find(lc => lc.level === formData.level) || null;
  }, [selectedRoleObj, formData.level]);

  const configuredCount = activeLevelConfig
    ? (activeLevelConfig.easyCount || 0) + (activeLevelConfig.mediumCount || 0) + (activeLevelConfig.hardCount || 0)
    : null;

  const suggestedSkills = useMemo(() => {
    if (!publicSkills.length) return [];
    const roleSkills = publicSkills.filter(s =>
      !s.roles?.length || s.roles.includes(formData.role)
    );
    return roleSkills.map(s => s.name);
  }, [publicSkills, formData.role]);

  const topicSuggestions = useMemo(() => {
    if (!isCollegeUser) return [];
    return getTopicsForSubject(formData.role, user?.orgCountry || '');
  }, [isCollegeUser, formData.role, user?.orgCountry]);

  const corporateTopicSuggestions = useMemo(() => {
    if (!isCorporateUser) return [];
    return getTopicsForRole(formData.role, formData.level);
  }, [isCorporateUser, formData.role, formData.level]);

  const coachingNudge = useMemo(() => {
    if (!isCorporateUser || !user?.preferredRole || !user?.preferredLevel) return null;

    const role  = user.preferredRole;
    const level = user.preferredLevel;
    const roleTopics = getTopicsForRole(role, level);
    if (!roleTopics.length) return null;

    // Completed sessions in the user's own role+level track
    const trackSessions = sessions.filter(
      s => s.status === 'completed' && s.role === role && s.level === level
    );

    // Readiness score for nudge threshold
    const scoredTrack = trackSessions.filter(s => typeof s.overallScore === 'number' && s.overallScore > 0);
    const readiness = scoredTrack.length
      ? Math.round(scoredTrack.reduce((a, s) => a + s.overallScore, 0) / scoredTrack.length)
      : null;

    // Only show nudge when readiness is null (never started) or < 50
    if (readiness !== null && readiness >= 50) return null;

    // Score each topic: avg of evaluated question scores across all track sessions where
    // the session.skills array contains that topic
    const topicScores = roleTopics.map(topic => {
      const topicKey = topic.toLowerCase();
      const matched = trackSessions.filter(s =>
        s.skills?.some(sk => sk.toLowerCase().includes(topicKey) || topicKey.includes(sk.toLowerCase()))
      );
      if (!matched.length) return { topic, score: null };
      const evalQs = matched.flatMap(s =>
        (s.questions || []).filter(q => q.isEvaluated)
      );
      if (!evalQs.length) return { topic, score: null };
      const avg = Math.round(
        evalQs.reduce((sum, q) => sum + (q.technicalScore + q.confidenceScore) / 2, 0) / evalQs.length
      );
      return { topic, score: avg };
    });

    // Priority: null (never practiced) first, then lowest score
    const nullFirst = topicScores.filter(t => t.score === null);
    const scored    = topicScores.filter(t => t.score !== null).sort((a, b) => a.score - b.score);
    const weakest   = nullFirst[0] || scored[0];
    if (!weakest) return null;

    return { weakestTopic: weakest.topic, weakestScore: weakest.score, readiness, sessionCount: trackSessions.length, role, level };
  }, [isCorporateUser, user, sessions]);

  // ── Milestone notifications (25 / 50 / 75 / 100 % readiness) ──────────────
  const MILESTONES = [25, 50, 75, 100];
  const msKey = user?._id ? `aiint_ms_${user._id}` : null;
  const [seenMilestones, setSeenMilestones] = useState(() => {
    if (!msKey) return [];
    try { return JSON.parse(localStorage.getItem(msKey)) || []; } catch { return []; }
  });

  const milestoneNotif = useMemo(() => {
    if (!isCorporateUser || !user?.preferredRole || !user?.preferredLevel) return null;
    const role  = user.preferredRole;
    const level = user.preferredLevel;
    const trackSessions = sessions.filter(
      s => s.status === 'completed' && s.role === role && s.level === level
    );
    const scored = trackSessions.filter(s => typeof s.overallScore === 'number' && s.overallScore > 0);
    if (!scored.length) return null;
    const readiness = Math.round(scored.reduce((a, s) => a + s.overallScore, 0) / scored.length);
    const crossed = MILESTONES.filter(m => readiness >= m);
    const unseen  = crossed.filter(m => !seenMilestones.includes(m));
    if (!unseen.length) return null;
    const milestone = Math.max(...unseen);
    return { milestone, readiness, role, level };
  }, [isCorporateUser, user, sessions, seenMilestones]);

  const dismissMilestone = (m) => {
    const next = [...seenMilestones, m];
    setSeenMilestones(next);
    if (msKey) localStorage.setItem(msKey, JSON.stringify(next));
  };

  // ── Practice Streak + Badge notifications ──────────────────────────────────
  const practiceStreakData = useMemo(() => {
    if (!isCorporateUser) return null;
    const { current, longest } = computePracticeStreak(sessions);
    const earned = STREAK_BADGES.filter(b => longest >= b.days);
    return { current, longest, earned };
  }, [isCorporateUser, sessions]);

  const badgeKey = user?._id ? `aiint_badges_${user._id}` : null;
  const [seenBadges, setSeenBadges] = useState(() => {
    if (!badgeKey) return [];
    try { return JSON.parse(localStorage.getItem(badgeKey)) || []; } catch { return []; }
  });

  useEffect(() => {
    if (!practiceStreakData || !badgeKey) return;
    const newBadges = practiceStreakData.earned.filter(b => !seenBadges.includes(b.days));
    if (!newBadges.length) return;
    newBadges.forEach(b =>
      toast.success(`${b.icon} Badge unlocked: ${b.label}! You've kept a ${b.days}-day practice streak.`, { autoClose: 6000 })
    );
    const next = [...seenBadges, ...newBadges.map(b => b.days)];
    setSeenBadges(next);
    localStorage.setItem(badgeKey, JSON.stringify(next));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceStreakData]);

  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileRole, setProfileRole]   = useState(user?.preferredRole  || getAllRoles()[0]);
  const [profileLevel, setProfileLevel] = useState(user?.preferredLevel || EXPERIENCE_LEVELS[0]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certDataURL,   setCertDataURL]   = useState(null);
  const [certReadiness, setCertReadiness] = useState(0);
  const [certLICopied,  setCertLICopied]  = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressCardURL,   setProgressCardURL]   = useState(null);
  const [progressCardCopied, setProgressCardCopied] = useState(false);
  const [showBatchLeaderboard, setShowBatchLeaderboard] = useState(false);

  const goalKey = user?._id ? `aiint_goal_${user._id}` : null;
  const [goal, setGoalRaw] = useState(() => {
    if (!goalKey) return null;
    try { return JSON.parse(localStorage.getItem(goalKey)) || null; } catch { return null; }
  });

  useEffect(() => {
    if (isCorporateUser && !goal && user?.readinessGoal?.targetScore && user?.readinessGoal?.targetDate) {
      const g = { targetScore: user.readinessGoal.targetScore, targetDate: user.readinessGoal.targetDate };
      setGoalRaw(g);
      if (goalKey) localStorage.setItem(goalKey, JSON.stringify(g));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalDraftScore, setGoalDraftScore] = useState(80);
  const [goalDraftDate,  setGoalDraftDate]  = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const openCertModal = () => {
    if (!user?.preferredRole || !user?.preferredLevel) return;
    const trackSessions = sessions.filter(
      s => s.status === 'completed' && s.role === user.preferredRole && s.level === user.preferredLevel
    );
    const scored = trackSessions.filter(s => typeof s.overallScore === 'number' && s.overallScore > 0);
    const r = scored.length
      ? Math.round(scored.reduce((a, s) => a + s.overallScore, 0) / scored.length)
      : 0;
    setCertReadiness(r);
    setCertDataURL(generateCertificateDataURL(user.name, user.preferredRole, user.preferredLevel, r));
    setShowCertModal(true);
  };

  const openProgressModal = () => {
    const completedScored = sessions.filter(s => s.status === 'completed' && typeof s.overallScore === 'number' && s.overallScore > 0);
    const avgScore = completedScored.length
      ? Math.round(completedScored.reduce((a, s) => a + s.overallScore, 0) / completedScored.length)
      : null;
    const subjectSet = new Set(completedScored.map(s => s.role).filter(Boolean));
    const url = generateProgressCardDataURL(
      user.name,
      avgScore,
      subjectSet.size,
      user.batchGoal || null,
      avgScore
    );
    setProgressCardURL(url);
    setShowProgressModal(true);
  };

  const handleDownloadProgress = () => {
    if (!progressCardURL) return;
    const a = document.createElement('a');
    a.href = progressCardURL;
    a.download = `progress-${(user.name || 'student').replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  const handleCopyProgressText = async () => {
    const completedScored = sessions.filter(s => s.status === 'completed' && typeof s.overallScore === 'number' && s.overallScore > 0);
    const avgScore = completedScored.length
      ? Math.round(completedScored.reduce((a, s) => a + s.overallScore, 0) / completedScored.length)
      : 0;
    const subjectSet = new Set(completedScored.map(s => s.role).filter(Boolean));
    const text = `I've been sharpening my technical interview skills with AI-powered mock interviews!\n\nAvg score: ${avgScore}%\nSubjects practiced: ${subjectSet.size}\nBatch: ${user.batch || 'College Track'}\n\nConsistent practice, real AI feedback, measurable progress.\n\n#PlacementReady #TechInterviewPrep #CareerGrowth #InterviewPrep`;
    try {
      await navigator.clipboard.writeText(text);
      setProgressCardCopied(true);
      setTimeout(() => setProgressCardCopied(false), 2500);
    } catch { toast.error('Could not copy — try selecting manually.'); }
  };

  const handleDownloadCert = () => {
    if (!certDataURL) return;
    const a = document.createElement('a');
    a.href = certDataURL;
    a.download = `readiness-${(user.name || 'candidate').replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  const handleCopyLinkedIn = async () => {
    const text = buildLinkedInPost(user.name, user.preferredRole, user.preferredLevel, certReadiness);
    try {
      await navigator.clipboard.writeText(text);
      setCertLICopied(true);
      setTimeout(() => setCertLICopied(false), 2500);
    } catch { toast.error('Could not copy — try selecting manually.'); }
  };

  const goalData = useMemo(() => {
    if (!isCorporateUser || !goal || !user?.preferredRole || !user?.preferredLevel) return null;
    const trackSessions = sessions.filter(
      s => s.status === 'completed' && s.role === user.preferredRole && s.level === user.preferredLevel
    );
    const scored = trackSessions
      .filter(s => typeof s.overallScore === 'number' && s.overallScore > 0)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const currentReadiness = scored.length
      ? Math.round(scored.reduce((a, s) => a + s.overallScore, 0) / scored.length)
      : 0;

    const todayMs  = new Date().setHours(0, 0, 0, 0);
    const targetMs = new Date(goal.targetDate).setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((targetMs - todayMs) / 86_400_000);
    const gap      = goal.targetScore - currentReadiness;
    const pctOfGoal = goal.targetScore > 0
      ? Math.min(100, Math.round((currentReadiness / goal.targetScore) * 100))
      : 0;

    let projectedDaysToGoal = null;
    if (scored.length >= 2) {
      const daySpan = Math.max(
        1,
        (new Date(scored.at(-1).createdAt) - new Date(scored[0].createdAt)) / 86_400_000
      );
      const ratePerDay = (scored.at(-1).overallScore - scored[0].overallScore) / daySpan;
      if (ratePerDay > 0 && gap > 0) projectedDaysToGoal = Math.ceil(gap / ratePerDay);
    }

    const achieved = gap <= 0;
    const overdue  = !achieved && daysLeft < 0;
    const onTrack  = achieved || (!overdue && projectedDaysToGoal !== null && projectedDaysToGoal <= daysLeft);

    return { currentReadiness, daysLeft, gap, pctOfGoal, projectedDaysToGoal, onTrack, achieved, overdue };
  }, [isCorporateUser, goal, sessions, user]);

  const saveGoal = () => {
    const g = { targetScore: goalDraftScore, targetDate: goalDraftDate };
    setGoalRaw(g);
    if (goalKey) localStorage.setItem(goalKey, JSON.stringify(g));
    setShowGoalForm(false);
    toast.success('🎯 Goal saved! We\'ll track your pace to keep you on target.');
    dispatch(saveUserGoal(g));
  };

  const clearGoal = () => {
    setGoalRaw(null);
    if (goalKey) localStorage.removeItem(goalKey);
    setShowGoalForm(false);
  };

  const openGoalForm = () => {
    if (goal) { setGoalDraftScore(goal.targetScore); setGoalDraftDate(goal.targetDate); }
    setShowGoalForm(true);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await dispatch(updateProfile({ preferredRole: profileRole, preferredLevel: profileLevel })).unwrap();
      setFormData(prev => ({ ...prev, role: profileRole, level: profileLevel }));
      toast.success('Profile updated — interview form synced!');
      setShowProfileSettings(false);
    } catch (err) {
      toast.error(err || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const [selectedLeaderboardIdx, setSelectedLeaderboardIdx] = useState(0);

  useEffect(() => {
    if (location.state?.practiceSkill) {
      setSkills(location.state.practiceSkill);
      setTimeout(() => {
        skillsInputRef.current?.focus();
        skillsInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.state]);

  useEffect(() => {
    if (isError && message) {
      toast.error(message);
      dispatch(reset());
    }
  }, [isError, message, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({ ...prevState, [e.target.name]: e.target.value }));
  };

  const applyTemplate = (tpl) => {
    setFormData({
      role: tpl.role,
      level: tpl.level,
      interviewType: tpl.interviewType || 'coding-mix',
      count: (tpl.easyCount || 0) + (tpl.mediumCount || 0) + (tpl.hardCount || 0) || COUNTS[0],
    });
    setSkills((tpl.skills || []).join(', '));
    setAppliedTemplateId(tpl._id);
    window.scrollTo({ top: document.querySelector('#new-interview-form')?.offsetTop - 80 || 0, behavior: 'smooth' });
    toast.success(`Template "${tpl.name}" applied!`);
  };

  const onResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setResumeFileName(file.name);
    }
  };

  const [activeDriveId, setActiveDriveId]   = useState(null);
  const [lbDriveId, setLbDriveId]           = useState(null);
  const [historyDriveId, setHistoryDriveId] = useState(null);
  const [pastDrivesExpanded, setPastDrivesExpanded]     = useState(true);
  const [pastHistoryDriveId, setPastHistoryDriveId]     = useState(null);

  const pastDriveEnrollments = useMemo(() => {
    const eligibleIds = new Set(eligibleDrives.map(d => d._id));
    return myEnrollments.filter(e => {
      const drive = e.driveId;
      if (!drive || typeof drive !== 'object') return false;
      return !eligibleIds.has(String(drive._id)) &&
        (drive.status === 'closed' || new Date(drive.visitDate) < Date.now());
    });
  }, [myEnrollments, eligibleDrives]);

  useEffect(() => {
    const ds = location.state?.driveSession;
    if (ds) {
      setActiveDriveId(ds.driveId);
      setFormData(p => ({
        ...p,
        role:  ds.role  || p.role,
        level: ds.level || p.level,
      }));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state]);

  const onSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('role', formData.role);
    data.append('level', formData.level);
    data.append('interviewType', formData.interviewType);
    data.append('count', formData.count);
    if (skills.trim()) data.append('skills', skills.trim());
    if (resumeFile) data.append('resumeFile', resumeFile);
    if (appliedTemplateId) data.append('templateId', appliedTemplateId);
    if (activeDriveId) data.append('driveId', activeDriveId);
    dispatch(createSession(data));
    setAppliedTemplateId(null);
    setActiveDriveId(null);
  };

  const viewSession = (session) => {
    if (session.status === 'completed') {
      navigate(`/review/${session._id}`);
    } else if(session.status === 'in-progress') {
      navigate(`/interview/${session._id}`);
    }else{
      toast.info('Session not ready yet')
    }
  }


  const handleDelete = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session?')) {
      dispatch(deleteSession(sessionId));
      toast.error('Session Deleted')
    }
  }



  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterScore, setFilterScore] = useState('all');
  const [selectedSkills, setSelectedSkills] = useState(null);

  const templateBestScores = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      if (s.templateId && s.status === 'completed' && typeof s.overallScore === 'number' && s.overallScore > 0) {
        if (map[s.templateId] === undefined || s.overallScore > map[s.templateId]) {
          map[s.templateId] = s.overallScore;
        }
      }
    }
    return map;
  }, [sessions]);

  const taggableDrives = useMemo(
    () => eligibleDrives.filter(d => d.enrollment && !d.enrollment.certificateIssued),
    [eligibleDrives]
  );

  const recentlyUsedTemplates = useMemo(() => {
    if (!templates.length || !sessions.length) return [];
    const templateMap = Object.fromEntries(templates.map(t => [t._id, t]));
    const seen = new Set();
    const result = [];
    const sorted = [...sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    for (const s of sorted) {
      if (s.templateId && templateMap[s.templateId] && !seen.has(s.templateId)) {
        seen.add(s.templateId);
        result.push({ template: templateMap[s.templateId], lastUsed: s.createdAt, count: 0 });
      }
      if (result.length >= 3) break;
    }
    // enrich with count and personal best score
    return result.map(r => {
      const templateSessions = sessions.filter(s => s.templateId === r.template._id);
      const completedWithScore = templateSessions.filter(s => s.status === 'completed' && typeof s.overallScore === 'number' && s.overallScore > 0);
      const bestScore = completedWithScore.length > 0 ? Math.max(...completedWithScore.map(s => s.overallScore)) : null;
      return { ...r, count: templateSessions.length, bestScore };
    });
  }, [sessions, templates]);

  const skillHistory = useMemo(() => computeSkillHistory(sessions), [sessions]);

  const activeSkills = useMemo(() => {
    if (!selectedSkills) return skillHistory.map(s => s.skill);
    return selectedSkills;
  }, [selectedSkills, skillHistory]);

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => {
      const current = prev ?? skillHistory.map(s => s.skill);
      if (current.includes(skill)) {
        const next = current.filter(s => s !== skill);
        return next.length === 0 ? current : next;
      }
      return [...current, skill];
    });
  };

  const allSkillLabels = useMemo(() => {
    const labelSet = new Set();
    skillHistory.forEach(({ points }) => points.forEach(p => labelSet.add(p.label)));
    return [...labelSet];
  }, [skillHistory]);

  const skillChartData = useMemo(() => ({
    labels: allSkillLabels,
    datasets: skillHistory
      .filter(({ skill }) => activeSkills.includes(skill))
      .map(({ skill, points }, i) => {
        const color = SKILL_COLORS[i % SKILL_COLORS.length];
        const scoreByLabel = Object.fromEntries(points.map(p => [p.label, p.score]));
        return {
          label: skill,
          data: allSkillLabels.map(lbl => scoreByLabel[lbl] ?? null),
          borderColor: color.line,
          backgroundColor: color.fill,
          pointBackgroundColor: color.line,
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          tension: 0.35,
          fill: false,
          spanGaps: false,
        };
      }),
  }), [skillHistory, activeSkills, allSkillLabels]);

  const skillChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}/100`,
        },
        backgroundColor: '#0f172a',
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        padding: 10,
        cornerRadius: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11, weight: 'bold' } },
      },
      y: {
        min: 0, max: 100,
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', font: { size: 11 }, callback: v => `${v}` },
      },
    },
  };

  const filteredSessions = sessions.filter(s => {
    const matchSearch = s.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const score = s.overallScore ?? 0;
    const matchScore =
      filterScore === 'all' ? true :
      filterScore === 'high' ? score >= 70 :
      filterScore === 'mid'  ? score >= 40 && score < 70 :
      filterScore === 'low'  ? score < 40 : true;
    return matchSearch && matchStatus && matchScore;
  });

  const { streak, best, avg, trend } = computeStats(sessions);
  const trendMax = trend.length > 0 ? Math.max(...trend, 1) : 1;
  const completedCount = sessions.filter(s => s.status === 'completed').length;
  const roleInsights = computeRoleInsights(sessions);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-8 sm:space-y-12 animate-in duration-700">

      {/* ── Qualification congratulations banner ── */}
      {justQualifiedDrive && (
        <div className="relative flex items-start gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl px-5 py-4 shadow-md animate-in slide-in-from-top duration-500">
          <span className="text-4xl shrink-0 mt-0.5">🏆</span>
          <div className="min-w-0 flex-1">
            <p className="font-black text-emerald-800 text-base leading-tight">
              You qualified for {justQualifiedDrive.companyName}!
            </p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Your score of <span className="font-black">{justQualifiedDrive.bestScore}%</span> cleared the {justQualifiedDrive.minScore}% minimum for the <span className="font-semibold">{justQualifiedDrive.jobRole}</span> role.
              Your certificate is ready to download from the drive card below.
            </p>
          </div>
          <button
            onClick={() => { dispatch(clearJustQualified()); dispatch(fetchEligibleDrives()); dispatch(fetchMyEnrollments()); }}
            className="shrink-0 text-emerald-500 hover:text-emerald-700 transition mt-0.5"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 sm:pb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">Welcome, <span className="text-teal-600">{user.name.split(' ')[0]}</span></h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-lg font-medium">{isCollegeUser ? 'Subject-based interview practice' : 'Ready for your technical prep?'}</p>
        </div>
        <div className="bg-teal-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-teal-100 flex sm:block items-center gap-2">
          <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Total Sessions</p>
          <p className="text-xl sm:text-2xl font-black text-teal-700 leading-none">{sessions.length}</p>
        </div>
      </div>

      {/* ── College org banner ── */}
      {isCollegeUser && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-teal-50 border border-teal-200 rounded-2xl px-5 py-4">
            <span className="text-3xl shrink-0">🎓</span>
            <div className="min-w-0">
              <p className="font-black text-teal-800 text-sm leading-tight">{user.orgName || 'College Portal'}</p>
              <p className="text-xs text-teal-600 font-medium mt-0.5">
                {user.orgCountry ? `${user.orgCountry} · ` : ''}College Track · {collegeSubjectNames.length} subjects available
              </p>
              {(user.department || user.batch) && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {user.department && (
                    <span className="text-[9px] font-black bg-teal-100 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      {user.department}
                    </span>
                  )}
                  {user.batch && (
                    <span className="text-[9px] font-black bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      {user.batch}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="ml-auto shrink-0 flex items-center gap-2">
              {user.orgCode && (
                <div className="flex items-center gap-1.5 bg-teal-500/10 border border-teal-400/30 text-teal-700 text-xs font-black px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"/>
                  {user.orgCode}
                </div>
              )}
              <button
                onClick={openProgressModal}
                className="flex items-center gap-1.5 bg-white border border-teal-300 text-teal-600 hover:bg-teal-50 text-xs font-black px-3 py-1.5 rounded-full transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Share Progress
              </button>
            </div>
          </div>

          {/* ── My Batch Leaderboard card ── */}
          {user.batch && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
              <button
                onClick={() => {
                  setShowBatchLeaderboard(p => !p);
                  if (!batchLeaderboard && !batchLeaderboardLoading) dispatch(fetchBatchLeaderboard());
                }}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-blue-100/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">🏅</span>
                  <p className="text-xs font-black text-blue-800 uppercase tracking-widest">
                    My Batch Leaderboard
                  </p>
                  {batchLeaderboard?.myRank && (
                    <span className="text-[10px] font-black bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                      Your rank: #{batchLeaderboard.myRank}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-blue-400 transition-transform ${showBatchLeaderboard ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              {showBatchLeaderboard && (
                <div className="px-5 pb-4 space-y-2 border-t border-blue-200 pt-3">
                  {batchLeaderboardLoading && (
                    <p className="text-xs text-blue-500 text-center py-2 font-medium">Loading…</p>
                  )}
                  {!batchLeaderboardLoading && batchLeaderboard && batchLeaderboard.entries.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-2">No scores yet — be the first to practice!</p>
                  )}
                  {!batchLeaderboardLoading && batchLeaderboard && (() => {
                    const top5 = batchLeaderboard.entries;
                    const myEntryInTop5 = top5.some(e => e.isMe);
                    const myEntry = batchLeaderboard.myEntry;
                    const renderRow = (e, isDivider) => (
                      <div
                        key={isDivider ? 'me-row' : e.rank}
                        className={`flex items-center gap-2.5 text-[12px] rounded-xl px-3 py-2 ${
                          e.isMe
                            ? 'bg-blue-100 border border-blue-300 font-black text-blue-900'
                            : 'bg-white/70 text-slate-600'
                        }`}
                      >
                        <span className={`w-6 text-center font-black shrink-0 ${e.rank <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
                        </span>
                        <span className="flex-1 truncate">{e.name}{e.isMe ? ' (you)' : ''}</span>
                        <span className="font-black text-teal-600 shrink-0">{e.avgScore}%</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{e.sessionCount} session{e.sessionCount !== 1 ? 's' : ''}</span>
                      </div>
                    );
                    return (
                      <>
                        {top5.map(e => renderRow(e, false))}
                        {!myEntryInTop5 && myEntry && (
                          <>
                            <div className="border-t border-blue-100 my-1" />
                            {renderRow(myEntry, true)}
                          </>
                        )}
                      </>
                    );
                  })()}
                  {!batchLeaderboardLoading && batchLeaderboard && batchLeaderboard.totalWithSessions > 5 && (
                    <p className="text-[10px] text-slate-400 text-center pt-1">
                      +{batchLeaderboard.totalWithSessions - 5} more in your batch
                    </p>
                  )}
                  {!batchLeaderboardLoading && batchLeaderboard && (
                    <p className="text-[10px] text-blue-500 text-center pt-0.5 font-medium">
                      {batchLeaderboard.totalInBatch} students in {user.batch} · Names anonymized except yours
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Batch readiness goal widget (college students with a batch goal set by admin) */}
          {user.batchGoal?.targetScore && user.batchGoal?.targetDate && (() => {
            const todayMs  = new Date().setHours(0, 0, 0, 0);
            const targetMs = new Date(user.batchGoal.targetDate).setHours(0, 0, 0, 0);
            const daysLeft = Math.ceil((targetMs - todayMs) / 86_400_000);
            const completedScored = sessions.filter(s => s.status === 'completed' && typeof s.overallScore === 'number' && s.overallScore > 0);
            const currentScore = completedScored.length
              ? Math.round(completedScored.reduce((a, s) => a + s.overallScore, 0) / completedScored.length)
              : 0;
            const gap = user.batchGoal.targetScore - currentScore;
            const pctOfGoal = user.batchGoal.targetScore > 0
              ? Math.min(100, Math.round((currentScore / user.batchGoal.targetScore) * 100))
              : 0;
            const achieved = gap <= 0;
            const overdue  = !achieved && daysLeft < 0;
            return (
              <div className={`rounded-2xl border px-5 py-4 space-y-3 ${
                achieved ? 'bg-teal-50 border-teal-200' :
                overdue  ? 'bg-red-50 border-red-200'   : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{achieved ? '🏅' : overdue ? '⚠️' : '🎯'}</span>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${
                      achieved ? 'text-teal-700' : overdue ? 'text-red-700' : 'text-blue-700'
                    }`}>
                      {achieved ? 'Batch Goal Achieved!' : overdue ? 'Batch Deadline Passed' : `Batch Goal — ${user.batch}`}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Target: {user.batchGoal.targetScore}% by {new Date(user.batchGoal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                    <span>Now: {currentScore}%</span>
                    <span>Goal: {user.batchGoal.targetScore}%</span>
                  </div>
                  <div className="relative h-3 bg-white rounded-full overflow-visible border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${achieved ? 'bg-teal-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, currentScore)}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400/70 rounded-full z-10"
                      style={{ left: `${Math.min(100, user.batchGoal.targetScore)}%` }}
                    />
                  </div>
                  <p className="text-center text-[11px] font-black text-slate-500 mt-1.5">{pctOfGoal}% of batch goal reached</p>
                </div>
                {!achieved && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white/70 rounded-xl p-2.5 text-center">
                      <p className="text-xl font-black text-slate-700 leading-none">{Math.max(0, daysLeft)}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Days Left</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-2.5 text-center">
                      <p className="text-xl font-black text-slate-700 leading-none">{gap > 0 ? `+${gap}` : '0'}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Points Needed</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Corporate org banner + profile settings ── */}
      {isCorporateUser && (
        <div className="space-y-3">
          {/* Banner row */}
          <div className="flex items-center gap-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl px-5 py-4">
            <span className="text-3xl shrink-0">🏢</span>
            <div className="min-w-0">
              <p className="font-black text-violet-800 text-sm leading-tight">{user.orgName || 'Corporate Portal'}</p>
              <p className="text-xs text-violet-600 font-medium mt-0.5">
                Corporate Track · <span className="font-black">{user.preferredRole || 'Role not set'}</span> · {user.preferredLevel || 'Junior'}
              </p>
            </div>
            <div className="ml-auto shrink-0 flex items-center gap-2">
              {user.orgCode && (
                <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-400/30 text-violet-700 text-xs font-black px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"/>
                  {user.orgCode}
                </div>
              )}
              {/* Streak counter */}
              {practiceStreakData && practiceStreakData.current > 0 && (
                <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black px-3 py-1.5 rounded-full">
                  <span className="text-sm leading-none">🔥</span>
                  {practiceStreakData.current}d
                </div>
              )}
              <button
                onClick={openCertModal}
                className="flex items-center gap-1.5 bg-white border border-violet-300 text-violet-600 hover:bg-violet-50 text-xs font-black px-3 py-1.5 rounded-full transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Share
              </button>
              <button
                onClick={() => setShowProfileSettings(p => !p)}
                className="flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-black px-3 py-1.5 rounded-full transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Edit Role
              </button>
            </div>
          </div>

          {/* Earned streak badges */}
          {practiceStreakData && practiceStreakData.earned.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {practiceStreakData.earned.map(b => (
                <div
                  key={b.days}
                  className={`flex items-center gap-1.5 bg-gradient-to-r ${b.bg} text-white text-[11px] font-black px-3 py-1.5 rounded-full ring-2 ${b.ring} ring-offset-1 shadow-sm`}
                >
                  <span className="text-sm leading-none">{b.icon}</span>
                  {b.label}
                  <span className="opacity-70 font-medium">· {b.days}d</span>
                </div>
              ))}
              <span className="text-[10px] text-slate-400 font-medium">
                Best streak: {practiceStreakData.longest} day{practiceStreakData.longest !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* ── Readiness Goal card ── */}
          {!showGoalForm && !goal && (
            <button
              onClick={openGoalForm}
              className="w-full text-left flex items-center gap-3 bg-slate-50 hover:bg-violet-50 border border-dashed border-slate-300 hover:border-violet-300 text-slate-500 hover:text-violet-600 rounded-2xl px-5 py-3.5 transition-all group"
            >
              <span className="text-xl">🎯</span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest group-hover:text-violet-700 transition-colors">Set a Readiness Goal</p>
                <p className="text-[11px] font-medium mt-0.5">Pick a target score &amp; deadline — we'll track your daily pace.</p>
              </div>
              <svg className="w-4 h-4 ml-auto shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          )}

          {showGoalForm && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-violet-700 uppercase tracking-widest">🎯 Readiness Goal</p>
                <button onClick={() => setShowGoalForm(false)} className="text-violet-400 hover:text-violet-600 transition-colors text-lg leading-none">✕</button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-violet-500 ml-1">
                  Target Score: <span className="text-violet-700 font-black">{goalDraftScore}%</span>
                </label>
                <input
                  type="range" min="10" max="100" step="5"
                  value={goalDraftScore}
                  onChange={e => setGoalDraftScore(Number(e.target.value))}
                  className="w-full accent-violet-500 h-1.5 rounded-full"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                  <span>10%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-violet-500 ml-1">Target Date</label>
                <input
                  type="date"
                  value={goalDraftDate}
                  min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                  onChange={e => setGoalDraftDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-violet-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-violet-400 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={saveGoal}
                  className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
                >
                  Save Goal
                </button>
                {goal && (
                  <button onClick={clearGoal} className="text-xs text-red-400 hover:text-red-600 font-bold px-3 py-2 transition-colors">
                    Clear Goal
                  </button>
                )}
                <button onClick={() => setShowGoalForm(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold px-3 py-2 ml-auto transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showGoalForm && goal && goalData && (
            <div className={`rounded-2xl border px-5 py-4 space-y-3 ${
              goalData.achieved ? 'bg-teal-50 border-teal-200'    :
              goalData.overdue  ? 'bg-red-50 border-red-200'      :
              goalData.onTrack  ? 'bg-violet-50 border-violet-200' :
                                  'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">
                    {goalData.achieved ? '🏅' : goalData.overdue ? '⚠️' : goalData.onTrack ? '🎯' : '📌'}
                  </span>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${
                      goalData.achieved ? 'text-teal-700'   :
                      goalData.overdue  ? 'text-red-700'    :
                      goalData.onTrack  ? 'text-violet-700' : 'text-amber-700'
                    }`}>
                      {goalData.achieved ? 'Goal Achieved!' : goalData.overdue ? 'Deadline Passed' : goalData.onTrack ? 'On Track' : 'At Risk'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Target: {goal.targetScore}% by {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openGoalForm}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-colors px-2 py-1 rounded-lg hover:bg-white/60"
                >
                  Edit
                </button>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                  <span>Now: {goalData.currentReadiness}%</span>
                  <span>Goal: {goal.targetScore}%</span>
                </div>
                <div className="relative h-3 bg-white rounded-full overflow-visible border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      goalData.achieved ? 'bg-teal-500' :
                      goalData.onTrack  ? 'bg-violet-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, goalData.currentReadiness)}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400/70 rounded-full z-10"
                    style={{ left: `${Math.min(100, goal.targetScore)}%` }}
                  />
                </div>
                <p className="text-center text-[11px] font-black text-slate-500 mt-1.5">{goalData.pctOfGoal}% of goal reached</p>
              </div>

              {/* Stats row */}
              {!goalData.achieved && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-white/70 rounded-xl p-2.5 text-center">
                    <p className="text-xl font-black text-slate-700 leading-none">{Math.max(0, goalData.daysLeft)}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Days Left</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-2.5 text-center">
                    <p className="text-xl font-black text-slate-700 leading-none">{goalData.gap > 0 ? `+${goalData.gap}` : '0'}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Points Needed</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-2.5 text-center">
                    <p className={`text-xl font-black leading-none ${goalData.onTrack ? 'text-teal-600' : 'text-amber-600'}`}>
                      {goalData.projectedDaysToGoal !== null ? `${goalData.projectedDaysToGoal}d` : '—'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Proj. Days</p>
                  </div>
                </div>
              )}
              {goalData.achieved && (
                <p className="text-xs text-teal-600 font-bold text-center pb-1">
                  You've hit your target! Update your goal to keep pushing forward.
                </p>
              )}
            </div>
          )}

          {/* Collapsible profile settings */}
          {showProfileSettings && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-violet-700 uppercase tracking-widest">My Role Profile</p>
                  <p className="text-[11px] text-violet-500 font-medium mt-0.5">Changes sync to the interview form and org analytics.</p>
                </div>
                <button onClick={() => setShowProfileSettings(false)} className="text-violet-400 hover:text-violet-600 transition-colors text-lg leading-none">✕</button>
              </div>

              {/* Job Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-violet-500 ml-1">Job Role</label>
                <select
                  value={profileRole}
                  onChange={e => setProfileRole(e.target.value)}
                  className="w-full p-2.5 bg-white border border-violet-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-violet-400 outline-none transition-all"
                >
                  {getAllRoles().map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Experience Level */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-violet-500 ml-1">Experience Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPERIENCE_LEVELS.map(lvl => (
                    <button
                      key={lvl} type="button"
                      onClick={() => setProfileLevel(lvl)}
                      className={`p-2.5 rounded-xl text-xs font-black border-2 transition-all ${
                        profileLevel === lvl
                          ? 'bg-violet-500 border-violet-500 text-white shadow-sm'
                          : 'bg-white border-violet-200 text-violet-500 hover:border-violet-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white text-sm font-black rounded-xl transition-colors"
                >
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setShowProfileSettings(false)}
                  className="px-4 py-2.5 bg-white border border-violet-200 text-violet-500 text-sm font-bold rounded-xl hover:bg-violet-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming Placement Drives ── */}
      {eligibleDrives && eligibleDrives.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">🏢</span>
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest">Upcoming Placement Drives</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {eligibleDrives.map(drive => {
              const enrolled = !!drive.enrollment;
              const daysLeft = Math.ceil((new Date(drive.visitDate) - Date.now()) / 86_400_000);
              const qualified = drive.enrollment?.certificateIssued;
              const bestScore = drive.enrollment?.bestScore;
              const sessionsCompleted = drive.enrollment?.sessionsCompleted ?? 0;
              const progressPct = bestScore != null && drive.minScore > 0 ? Math.min(100, Math.round((bestScore / drive.minScore) * 100)) : 0;
              return (
                <div key={drive._id} className={`rounded-2xl border px-5 py-4 space-y-3 ${
                  qualified ? 'bg-emerald-50 border-emerald-200' :
                  enrolled  ? 'bg-teal-50 border-teal-200' :
                              'bg-white border-slate-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-sm leading-tight truncate">{drive.companyName}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{drive.jobRole}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {qualified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-500 text-white border border-emerald-600 px-2 py-0.5 rounded-full shadow-sm">✅ Qualified!</span>
                      ) : enrolled ? (
                        <span className="text-[10px] font-black bg-teal-100 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">Enrolled</span>
                      ) : (
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">Open</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                    <span className={`font-bold ${daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-slate-600'}`}>
                      🗓 {daysLeft > 0 ? `${daysLeft}d away` : 'Today!'}
                    </span>
                    <span>Min: <span className="font-black text-slate-700">{drive.minScore}%</span></span>
                    {bestScore != null && (
                      <span>Best: <span className={`font-black ${bestScore >= drive.minScore ? 'text-emerald-600' : 'text-amber-600'}`}>{bestScore}%</span></span>
                    )}
                    {enrolled && (
                      <span className="font-bold text-slate-500">{sessionsCompleted} {sessionsCompleted === 1 ? 'session' : 'sessions'}</span>
                    )}
                    {enrolled && (
                      <button
                        onClick={() => {
                          if (lbDriveId === drive._id) {
                            setLbDriveId(null);
                            dispatch(clearStudentLeaderboard());
                          } else {
                            setLbDriveId(drive._id);
                            setHistoryDriveId(null);
                            dispatch(fetchStudentLeaderboard(drive._id));
                          }
                        }}
                        className="text-teal-600 font-black hover:underline"
                      >
                        {lbDriveId === drive._id ? 'Hide Ranking' : 'View Ranking'}
                      </button>
                    )}
                    {enrolled && sessionsCompleted > 0 && (
                      <button
                        onClick={() => {
                          if (historyDriveId === drive._id) {
                            setHistoryDriveId(null);
                            dispatch(clearDriveSessions(drive._id));
                          } else {
                            setHistoryDriveId(drive._id);
                            setLbDriveId(null);
                            dispatch(clearStudentLeaderboard());
                            dispatch(fetchDriveSessions(drive._id));
                          }
                        }}
                        className="text-violet-600 font-black hover:underline"
                      >
                        {historyDriveId === drive._id ? 'Hide History' : 'Session History'}
                      </button>
                    )}
                  </div>

                  {enrolled && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={qualified ? 'text-emerald-600' : 'text-slate-500'}>
                          {qualified ? '🎉 Score goal reached!' : `Score progress to ${drive.minScore}% target`}
                        </span>
                        <span className={qualified ? 'text-emerald-600' : bestScore != null && bestScore >= drive.minScore ? 'text-emerald-600' : 'text-slate-500'}>
                          {bestScore != null ? `${bestScore}% / ${drive.minScore}%` : `0% / ${drive.minScore}%`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${qualified ? 'bg-emerald-500' : progressPct >= 100 ? 'bg-emerald-400' : progressPct >= 60 ? 'bg-teal-400' : 'bg-amber-400'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {lbDriveId === drive._id && studentLeaderboard && (
                    <div className="bg-white/60 border border-teal-100 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase text-teal-700 tracking-widest">Leaderboard</p>
                        {studentLeaderboard.myRank && (
                          <span className="text-[10px] font-black bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                            Your rank: #{studentLeaderboard.myRank} / {studentLeaderboard.totalEnrolled}
                          </span>
                        )}
                      </div>
                      {studentLeaderboard.entries.slice(0, 5).map(e => (
                        <div key={e.rank} className={`flex items-center gap-2 text-[11px] rounded-lg px-2 py-1 ${e.isMe ? 'bg-teal-50 border border-teal-200 font-black text-teal-800' : 'text-slate-600'}`}>
                          <span className={`w-5 text-center font-black ${e.rank <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
                          </span>
                          <span className="flex-1 truncate">{e.name}{e.isMe ? ' (you)' : ''}</span>
                          <span className={`font-black ${e.bestScore >= drive.minScore ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {e.bestScore !== null ? `${e.bestScore}%` : '—'}
                          </span>
                          {e.certificateIssued && <span className="text-emerald-500 text-[10px]">✓</span>}
                        </div>
                      ))}
                      {studentLeaderboard.totalEnrolled > 5 && (
                        <p className="text-[10px] text-slate-400 text-center pt-1">+{studentLeaderboard.totalEnrolled - 5} more enrolled</p>
                      )}
                    </div>
                  )}

                  {historyDriveId === drive._id && (
                    <div className="bg-white/60 border border-violet-100 rounded-xl p-3 space-y-1.5">
                      <p className="text-[10px] font-black uppercase text-violet-700 tracking-widest">Session History</p>
                      {driveSessionsLoading[drive._id] ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">Loading…</p>
                      ) : driveSessionsMap[drive._id]?.length > 0 ? (
                        driveSessionsMap[drive._id].map((s, idx) => {
                          const score = s.overallScore ?? null;
                          const qualified = score !== null && score >= drive.minScore;
                          return (
                            <div
                              key={s._id}
                              className="flex items-center gap-2 text-[11px] rounded-lg px-2 py-1.5 bg-white/80 border border-violet-50 cursor-pointer hover:border-violet-200 transition-colors"
                              onClick={() => navigate(`/review/${s._id}`)}
                            >
                              <span className="w-5 text-center font-black text-slate-400">#{idx + 1}</span>
                              <span className="flex-1 truncate text-slate-600">
                                {s.role || drive.interviewRole}{s.level ? ` · ${s.level}` : ''}
                              </span>
                              <span className="text-slate-400 shrink-0">
                                {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className={`font-black shrink-0 ${score === null ? 'text-slate-400' : qualified ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {score !== null ? `${score}%` : '—'}
                              </span>
                              {qualified && <span className="text-emerald-500 text-[10px] shrink-0">✓</span>}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-slate-400 text-center py-2">No sessions recorded yet for this drive.</p>
                      )}
                    </div>
                  )}

                  {drive.description && (
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{drive.description}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {!enrolled ? (
                      <button
                        onClick={async () => {
                          const res = await dispatch(enrollInDrive(drive._id));
                          if (!res.error) toast.success(`Enrolled in ${drive.companyName} drive!`);
                          else toast.error(res.payload || 'Failed to enroll');
                        }}
                        className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-black rounded-xl transition-colors"
                      >
                        Enroll Now
                      </button>
                    ) : !qualified ? (
                      <button
                        onClick={() => {
                          navigate('/dashboard', { state: {
                            driveSession: {
                              driveId: drive._id,
                              role: drive.interviewRole || drive.jobRole,
                              level: drive.interviewLevel || 'Mid-Level',
                            }
                          }});
                          setTimeout(() => {
                            document.querySelector('#new-interview-form')?.scrollIntoView({ behavior: 'smooth' });
                          }, 200);
                        }}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-colors"
                      >
                        Practice Now
                      </button>
                    ) : (
                      <div className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black rounded-xl text-center shadow-sm ring-2 ring-emerald-300 ring-offset-1">
                        🏆 Certificate Issued — Well Done!
                      </div>
                    )}
                    <div className="text-xs text-slate-400 font-medium">
                      {new Date(drive.visitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Past Placement Drives ── */}
      {pastDriveEnrollments.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setPastDrivesExpanded(v => !v)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <span className="text-lg leading-none">🗂</span>
            <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest flex-1">
              Past Placement Drives
              <span className="ml-2 text-[10px] font-bold text-slate-400 normal-case tracking-normal">
                ({pastDriveEnrollments.length})
              </span>
            </h2>
            <span className="text-slate-400 text-xs font-bold group-hover:text-slate-600 transition-colors">
              {pastDrivesExpanded ? '▲ Collapse' : '▼ Expand'}
            </span>
          </button>

          {pastDrivesExpanded && (
            <div className="grid gap-3 sm:grid-cols-2">
              {pastDriveEnrollments.map(enrollment => {
                const drive = enrollment.driveId;
                const qualified = enrollment.certificateIssued;
                const bestScore = enrollment.bestScore;
                const sessionsCompleted = enrollment.sessionsCompleted ?? 0;
                const progressPct = bestScore != null && drive.minScore > 0
                  ? Math.min(100, Math.round((bestScore / drive.minScore) * 100))
                  : 0;
                const driveId = drive._id;
                const visitDateStr = drive.visitDate
                  ? new Date(drive.visitDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;
                return (
                  <div key={driveId} className={`rounded-2xl border px-5 py-4 space-y-3 ${
                    qualified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 text-sm leading-tight truncate">{drive.companyName}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{drive.jobRole}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {qualified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-500 text-white border border-emerald-600 px-2 py-0.5 rounded-full shadow-sm">✅ Qualified!</span>
                        ) : (
                          <span className="text-[10px] font-black bg-slate-200 text-slate-500 border border-slate-300 px-2 py-0.5 rounded-full">Closed</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                      {visitDateStr && (
                        <span className="text-slate-400 font-bold">🗓 {visitDateStr}</span>
                      )}
                      <span>Min: <span className="font-black text-slate-700">{drive.minScore}%</span></span>
                      <span>Best: <span className={`font-black ${bestScore == null ? 'text-slate-400' : bestScore >= drive.minScore ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {bestScore != null ? `${bestScore}%` : '—'}
                      </span></span>
                      <span className="font-bold text-slate-500">{sessionsCompleted} {sessionsCompleted === 1 ? 'session' : 'sessions'}</span>
                      {sessionsCompleted > 0 && (
                        <button
                          onClick={() => {
                            if (pastHistoryDriveId === driveId) {
                              setPastHistoryDriveId(null);
                              dispatch(clearDriveSessions(driveId));
                            } else {
                              setPastHistoryDriveId(driveId);
                              dispatch(fetchDriveSessions(driveId));
                            }
                          }}
                          className="text-violet-600 font-black hover:underline"
                        >
                          {pastHistoryDriveId === driveId ? 'Hide History' : 'Session History'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={qualified ? 'text-emerald-600' : 'text-slate-500'}>
                          {qualified ? '🎉 Score goal reached!' : `Score vs ${drive.minScore}% target`}
                        </span>
                        <span className={qualified ? 'text-emerald-600' : bestScore != null && bestScore >= drive.minScore ? 'text-emerald-600' : 'text-slate-500'}>
                          {bestScore != null ? `${bestScore}% / ${drive.minScore}%` : `0% / ${drive.minScore}%`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${qualified ? 'bg-emerald-500' : progressPct >= 100 ? 'bg-emerald-400' : progressPct >= 60 ? 'bg-teal-400' : 'bg-amber-400'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {pastHistoryDriveId === driveId && (
                      <div className="bg-white/60 border border-violet-100 rounded-xl p-3 space-y-1.5">
                        <p className="text-[10px] font-black uppercase text-violet-700 tracking-widest">Session History</p>
                        {driveSessionsLoading[driveId] ? (
                          <p className="text-[11px] text-slate-400 text-center py-2">Loading…</p>
                        ) : driveSessionsMap[driveId]?.length > 0 ? (
                          driveSessionsMap[driveId].map((s, idx) => {
                            const score = s.overallScore ?? null;
                            const didQualify = score !== null && score >= drive.minScore;
                            return (
                              <div
                                key={s._id}
                                className="flex items-center gap-2 text-[11px] rounded-lg px-2 py-1.5 bg-white/80 border border-violet-50 cursor-pointer hover:border-violet-200 transition-colors"
                                onClick={() => navigate(`/review/${s._id}`)}
                              >
                                <span className="w-5 text-center font-black text-slate-400">#{idx + 1}</span>
                                <span className="flex-1 truncate text-slate-600">
                                  {s.role || drive.interviewRole}{s.level ? ` · ${s.level}` : ''}
                                </span>
                                <span className="text-slate-400 shrink-0">
                                  {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span className={`font-black shrink-0 ${score === null ? 'text-slate-400' : didQualify ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {score !== null ? `${score}%` : '—'}
                                </span>
                                {didQualify && <span className="text-emerald-500 text-[10px] shrink-0">✓</span>}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[11px] text-slate-400 text-center py-2">No sessions recorded for this drive.</p>
                        )}
                      </div>
                    )}

                    {qualified && (
                      <div className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black rounded-xl text-center shadow-sm ring-2 ring-emerald-300 ring-offset-1">
                        🏆 Certificate Issued — Well Done!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Milestone Notification ── */}
      {milestoneNotif && (() => {
        const { milestone, readiness, role, level } = milestoneNotif;
        const cfg = {
          25:  { icon: '🌱', label: 'First Milestone Unlocked!', color: 'from-blue-50 to-indigo-50',   border: 'border-blue-200',   iconBg: 'bg-blue-100 border-blue-200',   badge: 'bg-blue-100 text-blue-600',   title: 'text-blue-700',   msgCls: 'text-blue-600',   bar: 'bg-blue-400',   text: `You've cleared your first 25% readiness checkpoint as a ${level} ${role}. A strong start — keep your momentum going.` },
          50:  { icon: '⚡', label: 'Halfway to Job-Ready!',     color: 'from-amber-50 to-yellow-50',  border: 'border-amber-200',  iconBg: 'bg-amber-100 border-amber-200',  badge: 'bg-amber-100 text-amber-700', title: 'text-amber-700',  msgCls: 'text-amber-700',  bar: 'bg-amber-400',  text: `You've hit the halfway mark for ${level} ${role}. You're building real interview confidence — the second half is where it counts.` },
          75:  { icon: '🚀', label: 'Almost Job-Ready!',         color: 'from-teal-50 to-emerald-50',  border: 'border-teal-200',   iconBg: 'bg-teal-100 border-teal-200',   badge: 'bg-teal-100 text-teal-700',  title: 'text-teal-700',   msgCls: 'text-teal-600',   bar: 'bg-teal-400',   text: `75% readiness for ${level} ${role}. You're in the final stretch — sharpen your weakest topics and you'll be ready to interview.` },
          100: { icon: '🎉', label: "You're Job-Ready!",         color: 'from-violet-50 to-purple-50', border: 'border-violet-300', iconBg: 'bg-violet-100 border-violet-300', badge: 'bg-violet-100 text-violet-700', title: 'text-violet-700', msgCls: 'text-violet-600', bar: 'bg-violet-500', text: `You've hit 100% readiness as a ${level} ${role}. You're ready to walk into that interview with confidence. Go get it.` },
        }[milestone];
        return (
          <div className={`bg-gradient-to-r ${cfg.color} border ${cfg.border} rounded-2xl p-5 relative`}>
            {/* Dismiss */}
            <button
              type="button"
              onClick={() => dismissMilestone(milestone)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition text-base leading-none"
            >×</button>

            <div className="flex items-start gap-4 pr-6">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${cfg.iconBg} border flex items-center justify-center text-2xl shrink-0`}>
                {cfg.icon}
              </div>

              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className={`text-sm font-black ${cfg.title}`}>{cfg.label}</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {milestone}% readiness
                  </span>
                </div>

                {/* Message */}
                <p className={`text-sm font-medium ${cfg.msgCls} leading-snug`}>{cfg.text}</p>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/70 rounded-full overflow-hidden border border-white/40">
                    <div
                      className={`h-full rounded-full transition-all ${cfg.bar}`}
                      style={{ width: `${readiness}%` }}
                    />
                  </div>
                  <span className={`text-xs font-black ${cfg.title} shrink-0`}>{readiness}%</span>
                </div>

                {/* Milestone pip track */}
                <div className="flex items-center gap-0 mt-2">
                  {[25, 50, 75, 100].map((m, i) => (
                    <div key={m} className="flex items-center flex-1 last:flex-none">
                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${readiness >= m ? cfg.bar + ' border-transparent' : 'bg-white border-slate-300'}`} />
                      {i < 3 && <div className={`flex-1 h-0.5 ${readiness >= m ? cfg.bar : 'bg-slate-200'}`} />}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-0.5">
                  {[25, 50, 75, 100].map(m => (
                    <span key={m} className={`text-[9px] font-bold ${readiness >= m ? cfg.title : 'text-slate-400'}`}>{m}%</span>
                  ))}
                </div>

                {/* Share CTA — prominent on the 100% banner */}
                {milestone === 100 && (
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={openCertModal}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                      </svg>
                      Download Certificate
                    </button>
                    <p className="text-[10px] text-violet-500 font-medium">Share your achievement on LinkedIn or attach it to a job application.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Coaching Nudge (corporate, readiness < 50 or not started) ── */}
      {coachingNudge && (
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-xl shrink-0">
              🎯
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-black text-rose-700">Coaching Tip</p>
                {coachingNudge.readiness !== null ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-200/60 text-rose-600">
                    {coachingNudge.readiness}% readiness in {coachingNudge.role}
                  </span>
                ) : (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-500">
                    No {coachingNudge.role} sessions yet
                  </span>
                )}
              </div>

              {coachingNudge.readiness !== null ? (
                <p className="text-sm text-rose-600 font-medium">
                  Your readiness as a <span className="font-black">{coachingNudge.level} {coachingNudge.role}</span> is below 50%.{' '}
                  {coachingNudge.weakestScore !== null
                    ? `You scored ${coachingNudge.weakestScore}% on `
                    : "You haven't practiced "
                  }
                  <span className="font-black">{coachingNudge.weakestTopic}</span> — that's your biggest growth area right now.
                </p>
              ) : (
                <p className="text-sm text-rose-600 font-medium">
                  You haven't done any interviews in your registered track yet (<span className="font-black">{coachingNudge.level} {coachingNudge.role}</span>).
                  Start with <span className="font-black">{coachingNudge.weakestTopic}</span> — it's the foundation of your role.
                </p>
              )}

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-rose-200 rounded-xl px-3 py-2">
                  <span className="text-base">📖</span>
                  <span className="text-xs font-black text-slate-700">{coachingNudge.weakestTopic}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, role: coachingNudge.role, level: coachingNudge.level }));
                    setSkills(coachingNudge.weakestTopic);
                    setTimeout(() => {
                      const form = document.querySelector('#new-interview-form');
                      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }}
                  className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Practice this now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Performance Stats Bar ── */}
      {completedCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Streak */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${streak >= 3 ? 'bg-amber-50' : 'bg-slate-50'}`}>
              {streak >= 5 ? '🔥' : streak >= 3 ? '⚡' : '📈'}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Streak</p>
              <p className={`text-3xl font-black leading-none mt-0.5 ${streak >= 3 ? 'text-amber-500' : 'text-slate-800'}`}>{streak}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">session{streak !== 1 ? 's' : ''} improving</p>
            </div>
          </div>

          {/* Best Score */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl shrink-0">🏆</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal Best</p>
              <p className="text-3xl font-black text-emerald-600 leading-none mt-0.5">{best}<span className="text-base font-bold text-slate-400">%</span></p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">overall score</p>
            </div>
          </div>

          {/* Avg Score */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">📊</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average</p>
              <p className="text-3xl font-black text-blue-600 leading-none mt-0.5">{avg}<span className="text-base font-bold text-slate-400">%</span></p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">across {completedCount} session{completedCount !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Sparkline Trend */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Score Trend</p>
            {trend.length >= 2 ? (
              <div className="flex items-end gap-1.5 h-10">
                {trend.map((score, i) => {
                  const height = Math.max(4, Math.round((score / trendMax) * 40));
                  const isLast = i === trend.length - 1;
                  const improved = i > 0 && score >= trend[i - 1];
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${score}%`}>
                      <div
                        className={`w-full rounded-sm transition-all ${isLast ? 'bg-teal-500' : improved ? 'bg-emerald-300' : 'bg-rose-300'}`}
                        style={{ height: `${height}px` }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Complete more sessions to see your trend.</p>
            )}
            {trend.length >= 2 && (
              <div className="flex justify-between mt-2">
                <span className="text-[9px] text-slate-300 font-medium">oldest</span>
                <span className="text-[9px] text-slate-300 font-medium">latest</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Skill Progress Over Time ── */}
      {skillHistory.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center text-sm shrink-0">📊</div>
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill Progress</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Your score per skill across sessions — toggle skills to compare</p>
              </div>
            </div>
            {selectedSkills !== null && (
              <button
                onClick={() => setSelectedSkills(null)}
                className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline self-start sm:self-auto"
              >
                Show all
              </button>
            )}
          </div>

          {/* Skill toggle pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {skillHistory.map(({ skill }, i) => {
              const color = SKILL_COLORS[i % SKILL_COLORS.length];
              const isActive = activeSkills.includes(skill);
              return (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    isActive
                      ? 'border-transparent text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                  style={isActive ? { backgroundColor: color.line, borderColor: color.line } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : color.line }}
                  />
                  {skill}
                </button>
              );
            })}
          </div>

          {/* Line chart */}
          <div className="h-56 sm:h-72">
            {skillChartData.datasets.length > 0
              ? <Line data={skillChartData} options={skillChartOptions} />
              : <div className="h-full flex items-center justify-center text-slate-300 text-sm font-bold">Select at least one skill above</div>
            }
          </div>

          {/* Latest score row */}
          <div className="mt-5 flex flex-wrap gap-3">
            {skillHistory
              .filter(({ skill }) => activeSkills.includes(skill))
              .map(({ skill, points }, i) => {
                const last = points[points.length - 1];
                const prev = points[points.length - 2];
                const delta = prev ? last.score - prev.score : null;
                const color = SKILL_COLORS[i % SKILL_COLORS.length];
                return (
                  <div key={skill} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color.line }} />
                    <div>
                      <p className="text-[10px] font-black text-slate-500">{skill}</p>
                      <p className="text-sm font-black leading-none" style={{ color: color.line }}>{last.score}<span className="text-[10px] text-slate-400 font-bold">/100</span></p>
                    </div>
                    {delta !== null && (
                      <span className={`text-[10px] font-black ml-1 ${
                        delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                      </span>
                    )}
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* ── Role Insights ── */}
      {roleInsights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Strength */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl shrink-0">
                {getRoleIcon(roleInsights.best.role)}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Strongest Role</p>
                <p className="text-sm font-black text-slate-800 mt-0.5 leading-tight">{roleInsights.best.role}</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Avg {roleInsights.best.avg}% · {roleInsights.best.count} session{roleInsights.best.count !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <span className="shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">💪 Strength</span>
          </div>

          {/* Recommended */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-teal-100 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                {getRoleIcon(roleInsights.recommended.role)}
              </div>
              <div>
                <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Recommended to Practice</p>
                <p className="text-sm font-black text-slate-800 mt-0.5 leading-tight">{roleInsights.recommended.role}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Avg {roleInsights.recommended.avg}% — needs improvement</p>
              </div>
            </div>
            <button
              onClick={() => setFormData(f => ({ ...f, role: roleInsights.recommended.role }))}
              className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all active:scale-95 whitespace-nowrap"
            >
              Practice →
            </button>
          </div>
        </div>
      )}

      {/* ── Recently Practiced Templates ── */}
      {recentlyUsedTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-sm shrink-0">🕐</div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recently Practiced</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Jump back into a familiar format</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {recentlyUsedTemplates.map(({ template: tpl, lastUsed, count, bestScore }) => {
              const totalQ = (tpl.easyCount || 0) + (tpl.mediumCount || 0) + (tpl.hardCount || 0);
              const daysAgo = Math.floor((Date.now() - new Date(lastUsed)) / (1000 * 60 * 60 * 24));
              const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
              const scoreCls = bestScore === null ? null : bestScore >= 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : bestScore >= 40 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-rose-50 border-rose-200 text-rose-600';
              return (
                <button
                  key={tpl._id}
                  onClick={() => applyTemplate(tpl)}
                  className="group flex-1 text-left bg-gradient-to-br from-white to-rose-50/40 border border-rose-100 hover:border-rose-300 hover:shadow-md rounded-2xl p-4 transition-all active:scale-95 shadow-sm flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:bg-rose-100 transition-colors">
                    {getRoleIcon(tpl.role)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-800 text-sm leading-tight group-hover:text-rose-700 transition-colors truncate">{tpl.name}</p>
                    <p className="text-slate-400 text-[10px] font-medium mt-0.5">{tpl.level} · {totalQ > 0 ? `${totalQ} Qs` : tpl.interviewType === 'coding-mix' ? 'Coding Mix' : 'Oral'}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-rose-400">{timeLabel}</span>
                      {count > 1 && <span className="text-[10px] font-bold text-slate-300">· {count}× practiced</span>}
                      {bestScore !== null && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full border ${scoreCls}`}>
                          🏆 {bestScore}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-rose-300 group-hover:text-rose-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Start Templates ── */}
      {templates.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-sm shrink-0">⚡</div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Start Templates</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Click a template to instantly configure your interview</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tpl) => {
              const totalQ = (tpl.easyCount || 0) + (tpl.mediumCount || 0) + (tpl.hardCount || 0);
              const tplBest = templateBestScores[tpl._id] ?? null;
              const tplScoreCls = tplBest === null ? null : tplBest >= 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : tplBest >= 40 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-rose-50 border-rose-200 text-rose-600';
              return (
                <button
                  key={tpl._id}
                  onClick={() => applyTemplate(tpl)}
                  className="group text-left bg-white border border-slate-100 hover:border-teal-300 hover:shadow-md rounded-2xl p-4 transition-all active:scale-95 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-black text-slate-800 text-sm leading-tight group-hover:text-teal-700 transition-colors">{tpl.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {tplBest !== null && (
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${tplScoreCls}`}>
                          🏆 {tplBest}%
                        </span>
                      )}
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100">
                        {tpl.interviewType === 'coding-mix' ? 'Coding' : 'Oral'}
                      </span>
                    </div>
                  </div>
                  {tpl.description && (
                    <p className="text-slate-400 text-xs mb-2 leading-snug line-clamp-2">{tpl.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{tpl.role}</span>
                    <span className="text-[10px] font-bold bg-teal-50 border border-teal-100 text-teal-600 px-2 py-0.5 rounded-full">{tpl.level}</span>
                    {totalQ > 0 && <span className="text-[10px] font-bold bg-amber-50 border border-amber-100 text-amber-600 px-2 py-0.5 rounded-full">{totalQ} Qs</span>}
                    {tpl.skills?.slice(0, 2).map(s => (
                      <span key={s} className="text-[10px] font-bold bg-purple-50 border border-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {tpl.skills?.length > 2 && (
                      <span className="text-[10px] font-bold text-slate-400">+{tpl.skills.length - 2} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Global Leaderboard ── */}
      {leaderboard.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-sm shrink-0">🏆</div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Leaderboard</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Top scores per template across all users</p>
            </div>
          </div>

          {/* Template selector tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
            {leaderboard.map((lb, i) => {
              const isActive = i === selectedLeaderboardIdx;
              const hasUserRank = lb.userRank !== null;
              return (
                <button
                  key={lb.templateId}
                  onClick={() => setSelectedLeaderboardIdx(i)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  {lb.templateName}
                  {hasUserRank && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-amber-400 text-white' : 'bg-amber-50 text-amber-600'}`}>
                      #{lb.userRank}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active leaderboard table */}
          {(() => {
            const lb = leaderboard[selectedLeaderboardIdx];
            if (!lb) return null;
            const medalEmoji = ['🥇', '🥈', '🥉'];
            return (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-50 bg-slate-50/60">
                  <div>
                    <p className="text-xs font-black text-slate-700">{lb.templateName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{lb.templateRole} · {lb.templateLevel}</p>
                  </div>
                  {lb.userRank !== null ? (
                    <div className="text-right">
                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Your Rank</p>
                      <p className="text-lg font-black text-amber-600 leading-none">#{lb.userRank} <span className="text-xs text-slate-400 font-bold">/ {lb.entries.length}</span></p>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 italic">Not yet ranked</span>
                  )}
                </div>

                {/* Ranked rows */}
                <div className="divide-y divide-slate-50">
                  {lb.entries.map((entry) => {
                    const scoreCls = entry.score >= 70 ? 'text-emerald-600' : entry.score >= 40 ? 'text-amber-500' : 'text-rose-500';
                    const barPct = entry.score;
                    return (
                      <div
                        key={entry.rank}
                        className={`relative flex items-center gap-4 px-5 py-3 transition-colors ${entry.isCurrentUser ? 'bg-amber-50/70' : 'hover:bg-slate-50/60'}`}
                      >
                        {/* Rank */}
                        <div className="w-7 shrink-0 text-center">
                          {entry.rank <= 3 ? (
                            <span className="text-lg leading-none">{medalEmoji[entry.rank - 1]}</span>
                          ) : (
                            <span className="text-xs font-black text-slate-400">#{entry.rank}</span>
                          )}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black leading-none truncate ${entry.isCurrentUser ? 'text-amber-700' : 'text-slate-700'}`}>
                            {entry.name}
                            {entry.isCurrentUser && <span className="ml-1.5 text-[9px] font-black bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-widest">You</span>}
                          </p>
                          {/* Score bar */}
                          <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden w-full max-w-[160px]">
                            <div
                              className={`h-full rounded-full transition-all ${entry.score >= 70 ? 'bg-emerald-400' : entry.score >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Score */}
                        <div className="shrink-0 text-right">
                          <p className={`text-base font-black leading-none ${scoreCls}`}>{entry.score}<span className="text-[10px] text-slate-400 font-bold">%</span></p>
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">best score</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {lb.userRank === null && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold">Complete a session using <span className="text-teal-600">{lb.templateName}</span> to appear on this leaderboard</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div id="new-interview-form" className="bg-white rounded-2xl sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 sm:px-8 sm:py-6">
          <h2 className="text-lg font-bold text-white flex items-center">
            <span className="bg-teal-500 w-1.5 h-5 rounded-full mr-3"></span>
            New Interview
          </h2>
          {activeDriveId && (() => {
            const drive = eligibleDrives.find(d => d._id === activeDriveId);
            return drive ? (
              <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                <span className="text-amber-400 text-sm">🏢</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-amber-300">Drive Mode: {drive.companyName}</p>
                  <p className="text-[11px] text-amber-400/70 font-medium">This session will count toward your drive score (min {drive.minScore}%)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDriveId(null)}
                  className="text-amber-500/60 hover:text-amber-300 text-sm leading-none transition shrink-0"
                >✕</button>
              </div>
            ) : null;
          })()}
        </div>
        <form onSubmit={onSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Row 1: core selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{isCollegeUser ? 'Subject' : 'Role'}</label>
              <select name="role" value={formData.role} onChange={e => {
                const newRole = e.target.value;
                if (activeDriveId) {
                  setActiveDriveId(null);
                  toast('Drive tag removed — role changed.', { icon: 'ℹ️' });
                }
                if (isCollegeUser) {
                  setFormData(f => ({ ...f, role: newRole }));
                } else {
                  const roleObj = publicRoles.find(r => r.name === newRole);
                  const firstLevel = roleObj?.levels?.[0] || LEVELS[0];
                  setFormData(f => ({ ...f, role: newRole, level: firstLevel }));
                }
              }} className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500">
                {(isCollegeUser ? collegeSubjectNames : dynamicRoles).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:contents">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{isCollegeUser ? 'Semester' : 'Level'}</label>
                <select name="level" value={formData.level} onChange={e => {
                  if (activeDriveId) {
                    setActiveDriveId(null);
                    toast('Drive tag removed — level changed.', { icon: 'ℹ️' });
                  }
                  onChange(e);
                }} className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500">
                  {(isCollegeUser ? SEMESTERS : dynamicLevels).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Length
                  {configuredCount && (
                    <span className="ml-1.5 text-teal-500 normal-case font-medium tracking-normal">(set by admin)</span>
                  )}
                </label>
                {configuredCount ? (
                  <div className="w-full bg-teal-50 border border-teal-200 rounded-xl sm:rounded-2xl p-3 flex items-center gap-2">
                    <span className="text-sm font-black text-teal-700">{configuredCount} Qs</span>
                    <span className="text-[10px] text-teal-500 font-semibold">
                      · {activeLevelConfig.easyCount}E / {activeLevelConfig.mediumCount}M / {activeLevelConfig.hardCount}H
                    </span>
                  </div>
                ) : (
                  <select name="count" value={formData.count} onChange={onChange} className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500">
                    {COUNTS.map((count) => <option key={count} value={count}>{count} Qs</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Type
                {(activeLevelConfig || selectedRoleObj?.hasCoding === false) && (
                  <span className="ml-1.5 text-teal-500 normal-case font-medium tracking-normal">(set by admin)</span>
                )}
              </label>
              {activeLevelConfig ? (
                activeLevelConfig.codingCount > 0 ? (
                  <div className="w-full bg-teal-50 border border-teal-200 rounded-xl sm:rounded-2xl p-3 flex items-center gap-2">
                    <span className="text-sm font-black text-teal-700">💻 Coding Mix</span>
                    <span className="text-[10px] text-teal-500 font-semibold">· {activeLevelConfig.codingCount} coding / {activeLevelConfig.oralCount} oral</span>
                  </div>
                ) : (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3 flex items-center gap-2">
                    <span className="text-sm font-black text-slate-600">🗣 Oral Only</span>
                    <span className="text-[10px] text-slate-400 font-semibold">· no coding questions</span>
                  </div>
                )
              ) : selectedRoleObj?.hasCoding === false ? (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-3 flex items-center gap-2">
                  <span className="text-sm font-black text-slate-600">🗣 Oral Only</span>
                  <span className="text-[10px] text-slate-400 font-semibold">· no coding questions for this role</span>
                </div>
              ) : (
                <select name="interviewType" value={formData.interviewType} onChange={onChange} className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500">
                  {TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              )}
            </div>
            <button type="submit" disabled={isProcessing} className={`w-full h-[48px] rounded-xl font-bold text-white flex items-center justify-center gap-2 ${isProcessing ? 'bg-slate-300' : 'bg-teal-600 hover:bg-teal-700'}`}>
              {isProcessing ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Generating...</> : <span className="text-sm">Start Interview</span>}
            </button>
          </div>

          {/* Drive selector (optional) */}
          {taggableDrives.length > 0 && (
            <div className="space-y-1.5 border-t border-slate-100 pt-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Tag a Drive <span className="text-slate-300 normal-case font-medium tracking-normal">(optional)</span>
              </label>
              <select
                value={activeDriveId || ''}
                onChange={e => {
                  const driveId = e.target.value;
                  if (!driveId) {
                    setActiveDriveId(null);
                    return;
                  }
                  const drive = taggableDrives.find(d => d._id === driveId);
                  if (!drive) return;
                  setActiveDriveId(driveId);
                  setFormData(f => ({
                    ...f,
                    role: drive.interviewRole || drive.jobRole || f.role,
                    level: drive.interviewLevel || 'Mid-Level',
                  }));
                }}
                className="w-full bg-slate-50 border-none rounded-xl sm:rounded-2xl p-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">— No drive selected —</option>
                {taggableDrives.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.companyName} — {d.jobRole}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 2: Resume + Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-5">
            {/* Resume upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Resume <span className="text-slate-300 normal-case font-medium tracking-normal">(optional · PDF or TXT)</span>
              </label>
              <label className={`flex items-center gap-3 w-full cursor-pointer rounded-xl border-2 border-dashed p-3 transition-all ${resumeFileName ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-teal-300'}`}>
                <span className="text-xl">{resumeFileName ? '📄' : '⬆️'}</span>
                <span className="text-sm font-semibold text-slate-600 truncate">
                  {resumeFileName || 'Upload your resume'}
                </span>
                {resumeFileName && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setResumeFile(null); setResumeFileName(''); }}
                    className="ml-auto text-xs text-rose-400 hover:text-rose-600 shrink-0"
                  >✕</button>
                )}
                <input type="file" accept=".pdf,.txt" onChange={onResumeChange} className="hidden" />
              </label>
              {resumeFileName && (
                <p className="text-[10px] text-teal-600 font-medium ml-1">AI will extract your skills and tailor questions to your background</p>
              )}
            </div>

            {/* Skills input */}
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                {(isCollegeUser || isCorporateUser) ? 'Topics' : 'Key Skills'} <span className="text-slate-300 normal-case font-medium tracking-normal">(optional · comma-separated)</span>
              </label>
              <input
                ref={skillsInputRef}
                type="text"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                onFocus={() => setShowSkillSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 150)}
                placeholder="e.g. React, Node.js, MongoDB, Docker"
                className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-semibold text-slate-700 placeholder-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              {/* Skill suggestions dropdown */}
              {showSkillSuggestions && (isCollegeUser ? topicSuggestions : isCorporateUser ? corporateTopicSuggestions : suggestedSkills).length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 pt-2 pb-1">{(isCollegeUser || isCorporateUser) ? `Topics in ${formData.role}` : `Suggested for ${formData.role}`}</p>
                  <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                    {(isCollegeUser ? topicSuggestions : isCorporateUser ? corporateTopicSuggestions : suggestedSkills)
                      .filter(s => !skills.split(',').map(x => x.trim().toLowerCase()).includes(s.toLowerCase()))
                      .map(s => (
                        <button
                          key={s}
                          type="button"
                          onMouseDown={() => {
                            const current = skills.split(',').map(x => x.trim()).filter(Boolean);
                            setSkills([...current, s].join(', '));
                          }}
                          className="text-[10px] font-bold bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-full hover:bg-teal-100 transition-colors"
                        >
                          + {s}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
              {skills.trim() && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {skills.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const arr = skills.split(',').map(x => x.trim()).filter(Boolean);
                        setSkills(arr.filter((_, idx) => idx !== i).join(', '));
                      }}
                      className="bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
                    >
                      {s} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* HISTORY LIST */}
      <div className="space-y-5 pb-20 sm:pb-0">

        {/* Header row */}
        <div className="flex items-center justify-between px-2 gap-4 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center">
            <span className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 text-sm sm:text-lg">📊</span>
            Interview History
            {filteredSessions.length !== sessions.length && (
              <span className="ml-3 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {filteredSessions.length} of {sessions.length}
              </span>
            )}
          </h2>
          {/* Clear filters — only shown when active */}
          {(search || filterStatus !== 'all' || filterScore !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterStatus('all'); setFilterScore('all'); }}
              className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors"
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* Search + filter bar */}
        {sessions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="text"
                placeholder={isCollegeUser ? 'Search by subject…' : 'Search by role…'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              />
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1.5">
              {[
                { label: 'All', value: 'all' },
                { label: 'Completed', value: 'completed' },
                { label: 'In Progress', value: 'in-progress' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === opt.value
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Score filter pills */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1.5">
              {[
                { label: 'Any Score', value: 'all' },
                { label: '≥ 70%', value: 'high', cls: 'text-emerald-600' },
                { label: '40–70%', value: 'mid', cls: 'text-amber-500' },
                { label: '< 40%', value: 'low', cls: 'text-rose-500' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterScore(opt.value)}
                  className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all ${
                    filterScore === opt.value
                      ? 'bg-slate-900 text-white'
                      : `${opt.cls || 'text-slate-400'} hover:text-slate-700`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {isLoading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-teal-500 rounded-full"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-[2rem] py-16 sm:py-20 text-center">
            <p className="text-slate-400 font-bold text-base sm:text-lg">No sessions yet.</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-14 text-center">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-slate-500 font-bold text-sm">No sessions match your filters.</p>
            <button
              onClick={() => { setSearch(''); setFilterStatus('all'); setFilterScore('all'); }}
              className="mt-3 text-xs font-bold text-teal-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              const sessionDrive = session.driveId
                ? (eligibleDrives.find(d => d._id === session.driveId) || historicalDrivesMap[session.driveId] || null)
                : null;
              return (
                <SessionCard key={session._id} session={session} onClick={viewSession} onDelete={handleDelete} drive={sessionDrive}/>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Progress Card Modal (college users) ── */}
      {showProgressModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowProgressModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-black text-slate-800 text-base">My Progress Report</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {user.batch || 'College Track'} · {user.orgName || 'College Portal'}
                </p>
              </div>
              <button
                onClick={() => setShowProgressModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-lg"
              >×</button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-100">
              {progressCardURL && (
                <img
                  src={progressCardURL}
                  alt="Progress Card"
                  className="w-full rounded-xl shadow-md"
                  style={{ aspectRatio: '1200/630' }}
                />
              )}
            </div>

            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Social Share Text</p>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-3 border border-slate-200 max-h-28 overflow-y-auto">
                {(() => {
                  const scored = sessions.filter(s => s.status === 'completed' && typeof s.overallScore === 'number' && s.overallScore > 0);
                  const avg = scored.length ? Math.round(scored.reduce((a, s) => a + s.overallScore, 0) / scored.length) : 0;
                  const subjectSet = new Set(scored.map(s => s.role).filter(Boolean));
                  return `I've been sharpening my technical interview skills with AI-powered mock interviews!\n\nAvg score: ${avg}%\nSubjects practiced: ${subjectSet.size}\nBatch: ${user.batch || 'College Track'}\n\nConsistent practice, real AI feedback, measurable progress.\n\n#PlacementReady #TechInterviewPrep #CareerGrowth #InterviewPrep`;
                })()}
              </p>
            </div>

            <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleCopyProgressText}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  progressCardCopied
                    ? 'bg-teal-50 border-teal-300 text-teal-600'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                </svg>
                {progressCardCopied ? '✓ Copied!' : 'Copy Share Text'}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setShowProgressModal(false)}
                className="text-sm text-slate-400 hover:text-slate-600 font-bold transition px-3 py-2"
              >
                Close
              </button>
              <button
                onClick={handleDownloadProgress}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-black px-5 py-2 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Certificate / Share Modal ── */}
      {showCertModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowCertModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-black text-slate-800 text-base">Readiness Certificate</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {user.preferredLevel} {user.preferredRole} · {certReadiness}% job readiness
                </p>
              </div>
              <button
                onClick={() => setShowCertModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-lg"
              >×</button>
            </div>

            {/* Certificate preview */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              {certDataURL && (
                <img
                  src={certDataURL}
                  alt="Readiness Certificate"
                  className="w-full rounded-xl shadow-md"
                  style={{ aspectRatio: '1200/630' }}
                />
              )}
            </div>

            {/* LinkedIn post preview */}
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">LinkedIn Post Text</p>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-3 border border-slate-200 max-h-28 overflow-y-auto">
                {buildLinkedInPost(user.name, user.preferredRole, user.preferredLevel, certReadiness)}
              </p>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleCopyLinkedIn}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  certLICopied
                    ? 'bg-teal-50 border-teal-300 text-teal-600'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                {certLICopied ? '✓ Copied!' : 'Copy LinkedIn Post'}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setShowCertModal(false)}
                className="text-sm text-slate-400 hover:text-slate-600 font-bold transition px-3 py-2"
              >
                Close
              </button>
              <button
                onClick={handleDownloadCert}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-black px-5 py-2 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
export default Dashboard
