import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  RadarController, RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  RadarController, RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend
);

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const formatDuration = (start, end) => {
  if (!start || !end) return 'N/A';
  const diff = new Date(end) - new Date(start);
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
};

const formatSecs = (secs) => {
  if (!secs || secs === 0) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const sanitizeQuestionText = (text) => text.replace(/^\d+[\s\.\)]+/, '').trim();

const formatIdealAnswer = (text) => {
  try {
    if (!text) return 'Pending evaluation.';
    let clean = text.trim();
    if (clean.startsWith('```')) clean = clean.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    if (clean.startsWith('{') && clean.endsWith('}')) {
      const parsed = JSON.parse(clean);
      if (parsed.verbalAnswer || parsed.idealAnswer || parsed.idealanswer)
        return parsed.verbalAnswer || parsed.idealAnswer || parsed.idealanswer;
      const exp = parsed.explanation || parsed.understanding || '';
      const code = parsed.code || parsed.codeExample || parsed.example || '';
      if (exp || code) return `${exp}\n\n${code}`.trim();
    }
    return text;
  } catch { return text; }
};

function SharedReview() {
  const { shareToken } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/sessions/shared/${shareToken}`)
      .then(r => { setSession(r.data); setLoading(false); })
      .catch(() => { setError('This report is not available or sharing has been disabled.'); setLoading(false); });
  }, [shareToken]);

  if (loading) return (
    <div className="text-center py-32 font-bold text-slate-400 animate-pulse uppercase tracking-widest">
      Loading Report...
    </div>
  );

  if (error) return (
    <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-3xl shadow-2xl text-center border border-slate-100">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter">Report Unavailable</h2>
      <p className="text-slate-500 mb-8 font-medium">{error}</p>
      <Link to="/" className="inline-block bg-teal-600 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow text-xs hover:bg-teal-700 transition-all">
        Try AI Interviewer →
      </Link>
    </div>
  );

  const { overallScore, metrics, role, level, questions, startTime, endTime, interviewType, skills, resumeText } = session;
  const finalMetrics = metrics || {};

  const getMatchedSkills = (questionText, skillsList) => {
    if (!skillsList || skillsList.length === 0) return [];
    const lower = questionText.toLowerCase();
    return skillsList.filter(s => lower.includes(s.toLowerCase()));
  };

  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const scoreOf = (qs) => avg(qs.map(q => Math.round((q.technicalScore + q.confidenceScore) / 2)));

  const skillGap = (skills && skills.length > 0)
    ? skills.map(skill => {
        const matched = questions.filter(q =>
          q.isEvaluated && q.questionText.toLowerCase().includes(skill.toLowerCase())
        );
        if (matched.length === 0) return { skill, score: null, count: 0, tier: 'uncovered' };
        const score = avg(matched.map(q => Math.round((q.technicalScore + q.confidenceScore) / 2)));
        const tier = score >= 70 ? 'strong' : score >= 40 ? 'needs-work' : 'weak';
        return { skill, score, count: matched.length, tier };
      }).sort((a, b) => {
        const order = { weak: 0, 'needs-work': 1, uncovered: 2, strong: 3 };
        return order[a.tier] - order[b.tier];
      })
    : [];

  const easyQs   = questions.filter(q => q.difficulty === 'easy');
  const mediumQs = questions.filter(q => q.difficulty === 'medium');
  const hardQs   = questions.filter(q => q.difficulty === 'hard');
  const codingQs = questions.filter(q => q.questionType === 'coding');
  const oralQs   = questions.filter(q => q.questionType === 'oral');

  const radarData = {
    labels: ['Technical', 'Confidence', 'Easy Qs', 'Medium Qs', 'Hard Qs', 'Coding', 'Verbal'],
    datasets: [{
      label: 'Performance',
      data: [
        finalMetrics.avgTechnical || 0,
        finalMetrics.avgConfidence || 0,
        easyQs.length   ? scoreOf(easyQs)   : null,
        mediumQs.length ? scoreOf(mediumQs) : null,
        hardQs.length   ? scoreOf(hardQs)   : null,
        codingQs.length ? scoreOf(codingQs) : null,
        oralQs.length   ? scoreOf(oralQs)   : null,
      ],
      backgroundColor: 'rgba(20, 184, 166, 0.15)',
      borderColor: '#14b8a6',
      borderWidth: 2,
      pointBackgroundColor: '#14b8a6',
      pointBorderColor: '#fff',
      pointRadius: 4,
      fill: true,
    }],
  };

  const radarOptions = {
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true, min: 0, max: 100,
        ticks: { stepSize: 25, color: '#cbd5e1', font: { size: 10 }, backdropColor: 'transparent' },
        grid: { color: '#f1f5f9' },
        angleLines: { color: '#e2e8f0' },
        pointLabels: { color: '#64748b', font: { size: 11, weight: 'bold' }, padding: 12 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.r !== null ? ctx.parsed.r + '/100' : 'N/A'}` } },
    },
  };

  const barData = {
    labels: questions.map((_, i) => `Q${i + 1}`),
    datasets: [
      {
        label: 'Technical Score',
        data: questions.map(q => q.technicalScore || 0),
        backgroundColor: questions.map(q => (q.technicalScore || 0) >= 70 ? '#10b981' : (q.technicalScore || 0) >= 40 ? '#f59e0b' : '#f87171'),
        borderRadius: 6, barPercentage: 0.45,
      },
      {
        label: 'Confidence Score',
        data: questions.map(q => q.confidenceScore || 0),
        backgroundColor: questions.map(q => (q.confidenceScore || 0) >= 70 ? '#3b82f6' : (q.confidenceScore || 0) >= 40 ? '#fb923c' : '#f87171'),
        borderRadius: 6, barPercentage: 0.45,
      },
    ],
  };

  const scoreColor = overallScore >= 70 ? 'text-emerald-600' : overallScore >= 40 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-in fade-in duration-700">

      {/* Shared banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap shadow-lg shadow-teal-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white text-sm shrink-0">📋</div>
          <div>
            <p className="text-[10px] font-black text-teal-100 uppercase tracking-widest">Shared Interview Report</p>
            <p className="text-sm font-black text-white">Viewing a read-only result shared by a candidate</p>
          </div>
        </div>
        <Link
          to="/register"
          className="shrink-0 bg-white text-teal-700 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-teal-50 transition-all active:scale-95"
        >
          Try AI Interviewer →
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-8">
        <div>
          <span className="text-teal-600 font-black uppercase tracking-[0.2em] text-[10px]">Assessment Complete</span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mt-2 uppercase">
            {role} <span className="text-slate-300 font-medium lowercase block sm:inline">({level})</span>
          </h1>
        </div>
        <div className={`text-6xl font-black leading-none ${scoreColor}`}>
          {overallScore}<span className="text-2xl font-bold text-slate-300">%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Result',  value: `${overallScore}%`,            color: 'teal'  },
          { label: 'Avg Technical',   value: `${finalMetrics.avgTechnical}%`, color: 'slate' },
          { label: 'Avg Confidence',  value: `${finalMetrics.avgConfidence}%`, color: 'slate' },
          { label: 'Session Time',    value: formatDuration(startTime, endTime), color: 'slate' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-3xl shadow-sm border-l-[8px] ${stat.color === 'teal' ? 'border-teal-500' : 'border-slate-100'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p>
            <p className={`text-3xl font-black mt-2 leading-none ${stat.color === 'teal' ? 'text-teal-600' : 'text-slate-800'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Skills Profile */}
      {skills && skills.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center text-sm shrink-0">🎯</div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skills Profile</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {resumeText ? 'Questions were tailored using their resume and skills' : 'Questions were tailored to these skills'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => {
              const coveredCount = questions.filter(q => q.questionText.toLowerCase().includes(skill.toLowerCase())).length;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                    coveredCount > 0 ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                  title={coveredCount > 0 ? `Tested in ${coveredCount} question${coveredCount > 1 ? 's' : ''}` : 'Not directly matched in question text'}
                >
                  {coveredCount > 0 && <span className="text-teal-500 text-[10px]">✓</span>}
                  {skill}
                  {coveredCount > 0 && (
                    <span className="bg-teal-100 text-teal-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">{coveredCount}</span>
                  )}
                </div>
              );
            })}
          </div>
          {resumeText && (
            <p className="text-[10px] text-slate-300 font-medium mt-3 flex items-center gap-1.5">
              <span>📄</span> Resume was uploaded — AI personalised questions to the candidate's background
            </p>
          )}
        </div>
      )}

      {/* Skill Gap Analysis */}
      {skillGap.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-sm shrink-0">📉</div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill Gap Analysis</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Performance per skill — weakest areas highlighted for improvement</p>
            </div>
          </div>

          <div className="space-y-3">
            {skillGap.map(({ skill, score, count, tier }) => {
              const tierCfg = {
                weak:         { bar: 'bg-rose-500',    label: 'Needs focus', badge: 'bg-rose-50 border-rose-200 text-rose-600',     icon: '🔴' },
                'needs-work': { bar: 'bg-amber-400',   label: 'Needs work',  badge: 'bg-amber-50 border-amber-200 text-amber-600',  icon: '🟡' },
                strong:       { bar: 'bg-emerald-500', label: 'Strong',      badge: 'bg-emerald-50 border-emerald-200 text-emerald-600', icon: '🟢' },
                uncovered:    { bar: 'bg-slate-200',   label: 'Not tested',  badge: 'bg-slate-50 border-slate-200 text-slate-500',  icon: '⚪' },
              }[tier];
              return (
                <div key={skill} className="flex items-center gap-4">
                  <div className="w-28 sm:w-36 shrink-0">
                    <span className="text-xs font-bold text-slate-700 truncate block">{skill}</span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {count > 0 ? `${count} question${count > 1 ? 's' : ''}` : 'no questions matched'}
                    </span>
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${tierCfg.bar}`}
                      style={{ width: score !== null ? `${score}%` : '0%' }}
                    />
                  </div>
                  <div className="w-10 text-right shrink-0">
                    <span className={`text-xs font-black ${
                      tier === 'weak' ? 'text-rose-500' :
                      tier === 'needs-work' ? 'text-amber-500' :
                      tier === 'strong' ? 'text-emerald-600' : 'text-slate-300'
                    }`}>{score !== null ? `${score}` : '—'}</span>
                  </div>
                  <span className={`shrink-0 hidden sm:inline-flex items-center gap-1 border text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${tierCfg.badge}`}>
                    <span>{tierCfg.icon}</span> {tierCfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {skillGap.some(s => s.tier === 'weak' || s.tier === 'needs-work') && (
            <div className="mt-6 bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4">
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">📌 Recommended Focus Areas</p>
              <div className="flex flex-wrap gap-2">
                {skillGap
                  .filter(s => s.tier === 'weak' || s.tier === 'needs-work')
                  .map(({ skill, score, tier }) => (
                    <span key={skill} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                      tier === 'weak' ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      {tier === 'weak' ? '🔴' : '🟡'} {skill}
                      <span className="text-[9px] opacity-70">({score}/100)</span>
                    </span>
                  ))
                }
              </div>
              <p className="text-[10px] text-rose-400 font-medium mt-3">
                Practice these skills specifically in the next session for targeted improvement.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-50 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Skill Breakdown</h3>
            <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">Radar</span>
          </div>
          <p className="text-[10px] text-slate-300 font-medium mb-5">Performance across each dimension</p>
          <div className="flex-1 min-h-[260px] flex items-center justify-center">
            <Radar data={radarData} options={radarOptions} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {radarData.labels.map((label, i) => {
              const val = radarData.datasets[0].data[i];
              return (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                    <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                  </div>
                  <span className={`text-[10px] font-black ${
                    val === null ? 'text-slate-300' :
                    val >= 70 ? 'text-emerald-600' :
                    val >= 40 ? 'text-amber-500' : 'text-rose-500'
                  }`}>{val !== null ? `${val}` : '–'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-50 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Per-Question Performance</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500"/><span className="text-[9px] font-bold text-slate-400">Technical</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-blue-500"/><span className="text-[9px] font-bold text-slate-400">Confidence</span></div>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 font-medium mb-5">Technical vs confidence score per question</p>
          <div className="flex-1 min-h-[260px]">
            <Bar data={barData} options={{
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}/100` } } },
              scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-slate-900 px-2 flex items-center tracking-tighter uppercase">
          <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center mr-4 text-lg">✓</span>
          Answer Intelligence
        </h3>
        {questions.map((q, index) => (
          <div key={index} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {q.questionType === 'coding'
                      ? <span className="inline-flex items-center gap-1 bg-violet-50 border border-violet-100 text-violet-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">⌨️ Coding</span>
                      : <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-100 text-sky-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">🎙️ Verbal</span>
                    }
                    {(() => {
                      const d = q.difficulty || (index / questions.length < 0.34 ? 'easy' : index / questions.length < 0.67 ? 'medium' : 'hard');
                      const cfg = {
                        easy:   { label: 'Easy',   icon: '🟢', cls: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
                        medium: { label: 'Medium', icon: '🟡', cls: 'bg-amber-50 border-amber-100 text-amber-600' },
                        hard:   { label: 'Hard',   icon: '🔴', cls: 'bg-rose-50 border-rose-100 text-rose-600' },
                      }[d];
                      return <span className={`inline-flex items-center gap-1 border text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.cls}`}><span>{cfg.icon}</span>{cfg.label}</span>;
                    })()}
                  </div>
                  <h4 className="text-lg sm:text-2xl font-bold text-slate-800 leading-snug">
                    <span className="text-teal-500 mr-2 font-black italic">Q{index + 1}.</span> {sanitizeQuestionText(q.questionText)}
                  </h4>
                  {(() => {
                    const matched = getMatchedSkills(q.questionText, skills);
                    if (!matched.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {matched.map((s, si) => (
                          <span key={si} className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                            🎯 {s}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  <div className="px-4 py-2 rounded-2xl border bg-emerald-50 border-emerald-100 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Tech</span>
                    <span className="text-sm font-black text-emerald-600">{q.technicalScore}%</span>
                  </div>
                  <div className="px-4 py-2 rounded-2xl border border-blue-50 bg-blue-50/30 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Conf</span>
                    <span className="text-sm font-black text-blue-600">{q.confidenceScore}%</span>
                  </div>
                  {formatSecs(q.timeSpent) && (
                    <div className="px-4 py-2 rounded-2xl border border-slate-100 bg-slate-50 flex items-center gap-2">
                      <span className="text-base leading-none">⏱</span>
                      <span className="text-sm font-black text-slate-500">{formatSecs(q.timeSpent)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] block ml-1">AI Analytical Feedback</label>
                  <div className="bg-slate-50/50 p-5 rounded-2xl text-sm italic text-slate-600 border-l-[6px] border-teal-500 leading-relaxed">
                    "{q.aiFeedback}"
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] block ml-1">Ideal Implementation</label>
                  <pre className="bg-slate-900 text-slate-400 p-5 rounded-2xl text-[13px] overflow-x-auto whitespace-pre-wrap font-mono shadow-inner leading-relaxed">
                    {formatIdealAnswer(q.idealAnswer)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Want to test yourself?</p>
        <h3 className="text-2xl font-black text-white mb-4">Practice with AI Interviewer</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">Get real AI-scored technical interview practice across 18+ roles. See exactly where you stand.</p>
        <Link to="/register" className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-black uppercase tracking-widest text-xs px-8 py-3.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-teal-900/40">
          Start Free →
        </Link>
      </div>

    </div>
  );
}

export default SharedReview;
