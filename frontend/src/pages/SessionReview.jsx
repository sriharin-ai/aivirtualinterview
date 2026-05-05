import  { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSessionById, toggleShare } from '../features/sessions/sessionSlice';
import { toast } from 'react-toastify';
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

const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diff = new Date(end) - new Date(start);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
};

const formatSecs = (secs) => {
    if (!secs || secs === 0) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const sanitizeQuestionText = (text) => {
    return text.replace(/^\d+[\s\.\)]+/, '').trim();
};

const formatIdealAnswer = (text) => {
    try {
        if (!text) return "Pending evaluation.";

        let cleanText = text.trim();

        // 1. Remove Markdown code blocks if the AI added them (e.g., ```json ... ```)
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }

        // 2. Check if it's a JSON object
        if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
            const parsed = JSON.parse(cleanText);

            // Scenario A: The "Merged" Hallucination (Fixes Screenshot 266)
            // The AI put the score object inside the answer. We extract just the answer.
            if (parsed.verbalAnswer || parsed.idealAnswer || parsed.idealanswer) {
                return parsed.verbalAnswer || parsed.idealAnswer || parsed.idealanswer;
            }

            // Scenario B: Structured Explanation (Fixes Screenshot 267/268)
            const explanation = parsed.explanation || parsed.understanding || "";
            const code = parsed.code || parsed.codeExample || parsed.example || "";

            if (explanation || code) {
                return `${explanation}\n\n${code}`.trim();
            }
        }

        // Scenario C: It's just a normal string
        return text;
    } catch (e) {
        // If parsing fails, just show the raw text so nothing crashes
        return text;
    }
};

function SessionReview() {
    const { sessionId } = useParams();
    const dispatch = useDispatch();
    const { activeSession, isLoading } = useSelector(state => state.sessions);
    const { user } = useSelector(state => state.auth);
    const navigate = useNavigate();
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [shareLoading, setShareLoading] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);
    const [driveEnrollment, setDriveEnrollment] = useState(null);
    const [driveDrive, setDriveDrive] = useState(null);

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(formatIdealAnswer(text)).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
    };

    const handleToggleShare = async () => {
        setShareLoading(true);
        try {
            await dispatch(toggleShare(sessionId)).unwrap();
        } catch (err) {
            toast.error(err || 'Could not update sharing.');
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/shared/${activeSession.shareToken}`;
        navigator.clipboard.writeText(url).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2500);
        });
    };

    useEffect(() => {
        dispatch(getSessionById(sessionId));
    }, [dispatch, sessionId]);

    useEffect(() => {
        if (activeSession?.driveId) {
            const BASE = import.meta.env.VITE_API_URL;
            const _u = JSON.parse(localStorage.getItem('user') || '{}');
            const headers = { Authorization: `Bearer ${_u?.token || ''}` };
            Promise.all([
                fetch(`${BASE}/drives/${activeSession.driveId}/enrollment`, { headers }).then(r => r.json()),
                fetch(`${BASE}/drives/${activeSession.driveId}`, { headers }).then(r => r.ok ? r.json() : null),
            ])
                .then(([enrollment, drive]) => {
                    setDriveEnrollment(enrollment || null);
                    if (drive) setDriveDrive(drive);
                })
                .catch(() => {});
        }
    }, [activeSession?.driveId]);

    if (isLoading) return <div className="text-center py-20 font-bold text-slate-400 animate-pulse uppercase tracking-widest">Generating Analysis...</div>;

    if (!activeSession || activeSession.status !== 'completed') {
        return (
            <div className="max-w-xl mx-auto mt-10 sm:mt-20 p-6 sm:p-10 bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl text-center border border-slate-100 ">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-4 tracking-tighter uppercase">Report Not Ready</h2>
                <p className="text-slate-500 mb-8 font-medium text-sm sm:text-base">This session is still being processed by our AI network.</p>
                <Link to="/dashboard" className="inline-block bg-teal-600 text-white px-8 py-3 sm:px-10 sm:py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition hover:bg-teal-700 active:scale-95 text-xs sm:text-sm">Dashboard</Link>
            </div>
        );
    }

    const { overallScore, metrics, role, level, questions, startTime, endTime, skills, resumeText } = activeSession;
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

    const handleExportPDF = async () => {
        if (isPdfGenerating) return;
        setIsPdfGenerating(true);
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const PW = 210, ML = 14, MR = 14, CW = PW - ML - MR;
            const TEAL = [20, 184, 166];
            const SLATE9 = [15, 23, 42];
            const SLATE5 = [100, 116, 139];
            const SLATE2 = [226, 232, 240];

            const sessionDate = startTime
                ? new Date(startTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'N/A';
            const duration = formatDuration(startTime, endTime);
            const evaluatedQs = questions.filter(q => q.isEvaluated);

            const addFooter = (pageNum) => {
                const total = doc.internal.getNumberOfPages();
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(...SLATE5);
                doc.text(`AI Interviewer · ${role} · ${level}`, ML, 290);
                doc.text(`Page ${pageNum} / ${total}`, PW - MR, 290, { align: 'right' });
                doc.setDrawColor(...SLATE2);
                doc.line(ML, 286, PW - MR, 286);
            };

            const splitText = (text, maxWidth, size = 10) => {
                doc.setFontSize(size);
                return doc.splitTextToSize(String(text || ''), maxWidth);
            };

            // ── Page 1: Cover + Summary ──
            doc.setFillColor(...TEAL);
            doc.rect(0, 0, PW, 2, 'F');

            let y = 18;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(...SLATE9);
            doc.text('Interview Review Report', ML, y);

            y += 7;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...SLATE5);
            doc.text(`${role}  ·  ${level}  ·  ${sessionDate}  ·  Duration: ${duration}`, ML, y);

            const scoreColor = overallScore >= 70 ? [16,185,129] : overallScore >= 40 ? [245,158,11] : [239,68,68];
            doc.setFillColor(...scoreColor);
            doc.circle(PW - MR - 12, 16, 12, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(255, 255, 255);
            doc.text(`${overallScore}`, PW - MR - 12, 15, { align: 'center' });
            doc.setFontSize(7);
            doc.text('/100', PW - MR - 12, 20, { align: 'center' });

            y += 10;
            doc.setDrawColor(...SLATE2);
            doc.line(ML, y, PW - MR, y);
            y += 8;

            // Metrics table
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...TEAL);
            doc.text('PERFORMANCE METRICS', ML, y);
            y += 4;

            const easyScore  = easyQs.length   ? scoreOf(easyQs)   : null;
            const medScore   = mediumQs.length  ? scoreOf(mediumQs) : null;
            const hardScore  = hardQs.length    ? scoreOf(hardQs)   : null;
            const codeScore  = codingQs.length  ? scoreOf(codingQs) : null;
            const oralScore  = oralQs.length    ? scoreOf(oralQs)   : null;

            autoTable(doc, {
                startY: y,
                margin: { left: ML, right: MR },
                head: [['Metric', 'Score', 'Metric', 'Score']],
                body: [
                    ['Avg Technical',   `${finalMetrics.avgTechnical || 0}/100`, 'Avg Confidence',    `${finalMetrics.avgConfidence || 0}/100`],
                    ['Easy Questions',  easyScore  !== null ? `${easyScore}/100`  : '—', 'Medium Questions',  medScore  !== null ? `${medScore}/100`  : '—'],
                    ['Hard Questions',  hardScore  !== null ? `${hardScore}/100`  : '—', 'Coding Questions',  codeScore !== null ? `${codeScore}/100` : '—'],
                    ['Verbal Questions', oralScore !== null ? `${oralScore}/100` : '—', 'Questions Evaluated', `${evaluatedQs.length} / ${questions.length}`],
                ],
                headStyles: { fillColor: SLATE9, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 9, textColor: SLATE9 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: { 1: { fontStyle: 'bold', textColor: scoreColor }, 3: { fontStyle: 'bold', textColor: scoreColor } },
                theme: 'grid',
            });
            y = doc.lastAutoTable.finalY + 8;

            // Skill gap table
            if (skillGap.length > 0) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...TEAL);
                doc.text('SKILL GAP ANALYSIS', ML, y);
                y += 4;

                const tierLabel = { strong: 'Strong', 'needs-work': 'Needs Work', weak: 'Needs Focus', uncovered: 'Not Tested' };
                autoTable(doc, {
                    startY: y,
                    margin: { left: ML, right: MR },
                    head: [['Skill', 'Score', 'Questions', 'Status']],
                    body: skillGap.map(({ skill, score, count, tier }) => [
                        skill,
                        score !== null ? `${score}/100` : '—',
                        `${count}`,
                        tierLabel[tier],
                    ]),
                    headStyles: { fillColor: SLATE9, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
                    bodyStyles: { fontSize: 9, textColor: SLATE9 },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    theme: 'grid',
                });
                y = doc.lastAutoTable.finalY + 8;
            }

            // ── Page 2+: Question Breakdown ──
            doc.addPage();
            y = 18;
            doc.setFillColor(...TEAL);
            doc.rect(0, 0, PW, 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(...SLATE9);
            doc.text('Question Breakdown', ML, y);
            y += 10;

            const PAGE_BOTTOM = 278;
            let pageNum = 2;

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const combinedScore = q.isEvaluated ? Math.round((q.technicalScore + q.confidenceScore) / 2) : null;
                const diffLabel = q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : 'N/A';
                const typeLabel = q.questionType === 'coding' ? 'Coding' : 'Verbal';
                const matchedSkills = getMatchedSkills(q.questionText || '', skills || []);

                const qLines = splitText(sanitizeQuestionText(q.questionText || ''), CW - 20, 10);
                const feedbackLines = q.aiFeedback ? splitText(q.aiFeedback, CW - 6, 9) : [];
                const idealText = formatIdealAnswer(q.idealAnswer || '');
                const idealLines = idealText ? splitText(idealText, CW - 6, 9) : [];
                const submissionLines = q.transcribedText
                    ? splitText(q.transcribedText, CW - 6, 9)
                    : q.codeSubmission ? splitText(q.codeSubmission, CW - 6, 8) : [];

                const estHeight = 10 + qLines.length * 5 + 8
                    + (q.isEvaluated ? 8 : 0)
                    + (submissionLines.length > 0 ? 6 + Math.min(submissionLines.length, 10) * 4 + 4 : 0)
                    + (feedbackLines.length > 0 ? 6 + feedbackLines.length * 4 + 4 : 0)
                    + (idealLines.length > 0 ? 6 + Math.min(idealLines.length, 15) * 4 + 6 : 0);

                if (y + estHeight > PAGE_BOTTOM) {
                    addFooter(pageNum++);
                    doc.addPage();
                    doc.setFillColor(...TEAL);
                    doc.rect(0, 0, PW, 2, 'F');
                    y = 18;
                }

                // Question header bar
                const qScoreColor = combinedScore !== null
                    ? (combinedScore >= 70 ? [16,185,129] : combinedScore >= 40 ? [245,158,11] : [239,68,68])
                    : [148,163,184];
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(ML, y, CW, 8, 1.5, 1.5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(...TEAL);
                doc.text(`Q${i + 1}`, ML + 3, y + 5.5);
                doc.setTextColor(...SLATE5);
                doc.text(`${typeLabel}  ·  ${diffLabel}`, ML + 12, y + 5.5);
                if (matchedSkills.length > 0) {
                    doc.setTextColor(...TEAL);
                    doc.text(`Skills: ${matchedSkills.join(', ')}`, ML + 55, y + 5.5);
                }
                if (combinedScore !== null) {
                    doc.setFillColor(...qScoreColor);
                    doc.roundedRect(PW - MR - 18, y + 1, 18, 6, 1, 1, 'F');
                    doc.setFontSize(8);
                    doc.setTextColor(255, 255, 255);
                    doc.text(`${combinedScore}/100`, PW - MR - 9, y + 5.2, { align: 'center' });
                }
                y += 10;

                // Question text
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...SLATE9);
                doc.text(qLines, ML + 2, y);
                y += qLines.length * 5 + 3;

                // Score row
                if (q.isEvaluated) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(16, 185, 129);
                    doc.text(`Tech: ${q.technicalScore}/100`, ML + 2, y);
                    doc.setTextColor(59, 130, 246);
                    doc.text(`Confidence: ${q.confidenceScore}/100`, ML + 36, y);
                    if (q.timeSpent) {
                        doc.setTextColor(...SLATE5);
                        doc.text(`Time: ${formatSecs(q.timeSpent)}`, ML + 82, y);
                    }
                    y += 6;
                }

                // Submission
                if (submissionLines.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(...TEAL);
                    doc.text('YOUR SUBMISSION', ML + 2, y);
                    y += 4;
                    const subLines = submissionLines.slice(0, 10);
                    const subH = subLines.length * 4 + 4;
                    doc.setFillColor(248, 250, 252);
                    doc.rect(ML, y, CW, subH, 'F');
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8.5);
                    doc.setTextColor(...SLATE9);
                    doc.text(subLines, ML + 2, y + 3.5);
                    y += subH + 2;
                }

                // AI Feedback
                if (feedbackLines.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(245, 158, 11);
                    doc.text('AI FEEDBACK', ML + 2, y);
                    y += 4;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8.5);
                    doc.setTextColor(...SLATE5);
                    doc.text(feedbackLines, ML + 2, y);
                    y += feedbackLines.length * 4 + 2;
                }

                // Ideal Answer
                if (idealLines.length > 0) {
                    const visibleLines = idealLines.slice(0, 15);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(...TEAL);
                    doc.text('IDEAL ANSWER', ML + 2, y);
                    y += 4;
                    const idealH = visibleLines.length * 4 + 4;
                    doc.setFillColor(240, 253, 250);
                    doc.rect(ML, y, CW, idealH, 'F');
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8.5);
                    doc.setTextColor(...SLATE9);
                    doc.text(visibleLines, ML + 2, y + 3.5);
                    y += idealH + 2;
                    if (idealLines.length > 15) {
                        doc.setFontSize(7.5);
                        doc.setTextColor(...SLATE5);
                        doc.text(`… (${idealLines.length - 15} more lines)`, ML + 2, y);
                        y += 4;
                    }
                }

                // Separator
                doc.setDrawColor(...SLATE2);
                doc.line(ML, y + 1, PW - MR, y + 1);
                y += 6;
            }

            // Footers on every page
            const totalPages = doc.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                addFooter(p);
            }

            const filename = `interview-${role.replace(/\s+/g, '-').toLowerCase()}-${sessionDate.replace(/,?\s+/g, '-')}.pdf`;
            doc.save(filename);
            toast.success('PDF report downloaded!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate PDF.');
        } finally {
            setIsPdfGenerating(false);
        }
    };

    const radarData = {
        labels: ['Technical', 'Confidence', 'Easy Qs', 'Medium Qs', 'Hard Qs', 'Coding', 'Verbal'],
        datasets: [{
            label: 'Your Performance',
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
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#14b8a6',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
        }],
    };

    const radarOptions = {
        maintainAspectRatio: false,
        scales: {
            r: {
                beginAtZero: true,
                min: 0,
                max: 100,
                ticks: {
                    stepSize: 25,
                    color: '#cbd5e1',
                    font: { size: 10, weight: 'bold' },
                    backdropColor: 'transparent',
                    callback: (v) => `${v}`,
                },
                grid: { color: '#f1f5f9' },
                angleLines: { color: '#e2e8f0' },
                pointLabels: {
                    color: '#64748b',
                    font: { size: 11, weight: 'bold' },
                    padding: 12,
                },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${ctx.parsed.r !== null ? ctx.parsed.r + '/100' : 'N/A'}`,
                },
            },
        },
    };

    const barData = {
        labels: questions.map((_, i) => `Q${i + 1}`),
        datasets: [
            {
                label: 'Technical Score',
                data: questions.map(q => q.technicalScore || 0),
                backgroundColor: questions.map(q => (q.technicalScore || 0) >= 70 ? '#10b981' : (q.technicalScore || 0) >= 40 ? '#f59e0b' : '#f87171'),
                borderRadius: 6,
                barPercentage: 0.45,
            },
            {
                label: 'Confidence Score',
                data: questions.map(q => q.confidenceScore || 0),
                backgroundColor: questions.map(q => (q.confidenceScore || 0) >= 70 ? '#3b82f6' : (q.confidenceScore || 0) >= 40 ? '#fb923c' : '#f87171'),
                borderRadius: 6,
                barPercentage: 0.45,
            },
        ],
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-12 animate-in fade-in duration-700">

            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-6 sm:pb-10">
                <div>
                    <span className="text-teal-600 font-black uppercase tracking-[0.2em] text-[10px]">Assessment Complete</span>
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mt-2 uppercase">
                        {role} <span className="text-slate-300 font-medium lowercase block sm:inline">({level})</span>
                    </h1>
                </div>
                <div className="no-print flex items-center gap-3 flex-wrap">
                    {/* Drive Certificate */}
                    {driveEnrollment?.certificateIssued && driveDrive && (
                        <button
                            onClick={() => {
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
                                const accent = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
                                accent.addColorStop(0, '#f59e0b'); accent.addColorStop(1, '#ef4444');
                                ctx.fillStyle = accent;
                                ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, 7, [20, 20, 0, 0]); ctx.fill();
                                ctx.strokeStyle = 'rgba(245,158,11,0.3)'; ctx.lineWidth = 1.5;
                                ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, H - PAD * 2, 20); ctx.stroke();
                                ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'left';
                                ctx.fillText('AI INTERVIEWER — PLACEMENT DRIVE', PAD + 38, PAD + 54);
                                ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#475569'; ctx.textAlign = 'right';
                                ctx.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), W - PAD - 38, PAD + 54);
                                ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
                                ctx.beginPath(); ctx.moveTo(PAD + 38, PAD + 72); ctx.lineTo(W - PAD - 38, PAD + 72); ctx.stroke();
                                ctx.textAlign = 'center'; ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = '#475569';
                                ctx.fillText('THIS CERTIFIES THAT', W / 2, PAD + 114);
                                let nameFontSize = 46;
                                ctx.font = `bold ${nameFontSize}px system-ui, sans-serif`;
                                while (ctx.measureText(user?.name || 'Candidate').width > W - PAD * 2 - 100 && nameFontSize > 24) { nameFontSize -= 2; ctx.font = `bold ${nameFontSize}px system-ui, sans-serif`; }
                                ctx.fillStyle = '#f1f5f9'; ctx.fillText(user?.name || 'Candidate', W / 2, PAD + 160);
                                ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#64748b';
                                ctx.fillText('has qualified for', W / 2, PAD + 197);
                                const companyGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
                                companyGrad.addColorStop(0, '#f59e0b'); companyGrad.addColorStop(1, '#ef4444');
                                ctx.font = 'bold 52px system-ui, sans-serif'; ctx.fillStyle = companyGrad;
                                ctx.fillText(driveDrive.companyName, W / 2, PAD + 270);
                                ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillStyle = '#94a3b8';
                                ctx.fillText(driveDrive.jobRole, W / 2, PAD + 315);
                                const scoreGrad = ctx.createLinearGradient(W / 2 - 80, 0, W / 2 + 80, 0);
                                scoreGrad.addColorStop(0, '#f59e0b'); scoreGrad.addColorStop(1, '#10b981');
                                ctx.font = 'bold 88px system-ui, sans-serif'; ctx.fillStyle = scoreGrad;
                                ctx.fillText(`${driveEnrollment.bestScore}%`, W / 2, PAD + 430);
                                ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillStyle = '#94a3b8';
                                ctx.fillText('BEST SCORE', W / 2, PAD + 460);
                                ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#334155';
                                ctx.fillText('Generated by AI Interviewer · Placement Drive Certificate', W / 2, H - PAD - 6);
                                const dataURL = c.toDataURL('image/png');
                                const a = document.createElement('a'); a.href = dataURL;
                                a.download = `drive-cert-${(driveDrive.companyName || 'company').replace(/\s+/g, '-').toLowerCase()}.png`;
                                a.click();
                                toast.success('Drive certificate downloaded!');
                            }}
                            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all active:scale-95 shadow-sm shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Drive Certificate
                        </button>
                    )}
                    {/* Share toggle */}
                    <button
                        onClick={handleToggleShare}
                        disabled={shareLoading}
                        className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all active:scale-95 shadow-sm shrink-0 disabled:opacity-60 ${
                            activeSession.isShared
                                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        {shareLoading ? (
                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                            </svg>
                        )}
                        {activeSession.isShared ? 'Shared On' : 'Share'}
                    </button>

                    {/* Copy link — only visible when sharing is on */}
                    {activeSession.isShared && (
                        <button
                            onClick={handleCopyLink}
                            className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all active:scale-95 shadow-sm shrink-0 ${
                                linkCopied
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white border border-slate-200 hover:border-teal-400 text-slate-700'
                            }`}
                        >
                            {linkCopied ? (
                                <><span>✓</span> Copied!</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg> Copy Link</>
                            )}
                        </button>
                    )}

                    <button
                        onClick={handleExportPDF}
                        disabled={isPdfGenerating}
                        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl transition-all active:scale-95 shadow-sm shrink-0"
                    >
                        {isPdfGenerating ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                </svg>
                                Generating…
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* --- Summary Stats --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4 sm:pb-0 no-scrollbar snap-x">
                {[
                    { label: 'Overall Result', value: `${overallScore}%`, color: 'teal' },
                    { label: 'Avg Technical', value: `${finalMetrics.avgTechnical}%`, color: 'slate' },
                    { label: 'Avg Confidence', value: `${finalMetrics.avgConfidence}%`, color: 'slate' },
                    { label: 'Session Time', value: formatDuration(startTime, endTime), color: 'slate' }
                ].map((stat, i) => (
                    <div key={i} className={`min-w-[160px] snap-center bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-sm border-l-[8px] ${stat.color === 'teal' ? 'border-teal-500' : 'border-slate-100'}`}>
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p>
                        <p className={`text-2xl sm:text-4xl font-black mt-2 leading-none ${stat.color === 'teal' ? 'text-teal-600' : 'text-slate-800'}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* --- Skills Profile --- */}
            {skills && skills.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center text-sm shrink-0">🎯</div>
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skills Profile</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {resumeText ? 'Questions were tailored using your resume and skills' : 'Questions were tailored to these skills'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {skills.map((skill, i) => {
                            const coveredCount = questions.filter(q => q.questionText.toLowerCase().includes(skill.toLowerCase())).length;
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                        coveredCount > 0
                                            ? 'bg-teal-50 border-teal-200 text-teal-700'
                                            : 'bg-slate-50 border-slate-200 text-slate-500'
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
                            <span>📄</span> Resume was uploaded — AI personalised questions to your background
                        </p>
                    )}
                </div>
            )}

            {/* --- Skill Gap Analysis --- */}
            {skillGap.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-sm shrink-0">📉</div>
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill Gap Analysis</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">Your performance per skill — focus on the weakest ones before your next interview</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {skillGap.map(({ skill, score, count, tier }) => {
                            const tierCfg = {
                                weak:         { bar: 'bg-rose-500',   label: 'Needs focus',   badge: 'bg-rose-50 border-rose-200 text-rose-600',   icon: '🔴' },
                                'needs-work': { bar: 'bg-amber-400',  label: 'Needs work',    badge: 'bg-amber-50 border-amber-200 text-amber-600', icon: '🟡' },
                                strong:       { bar: 'bg-emerald-500',label: 'Strong',        badge: 'bg-emerald-50 border-emerald-200 text-emerald-600', icon: '🟢' },
                                uncovered:    { bar: 'bg-slate-200',  label: 'Not tested',    badge: 'bg-slate-50 border-slate-200 text-slate-500', icon: '⚪' },
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
                                        }`}>
                                            {score !== null ? `${score}` : '—'}
                                        </span>
                                    </div>
                                    <span className={`shrink-0 hidden sm:inline-flex items-center gap-1 border text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${tierCfg.badge}`}>
                                        <span>{tierCfg.icon}</span> {tierCfg.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Focus callout */}
                    {skillGap.some(s => s.tier === 'weak' || s.tier === 'needs-work') && (
                        <div className="mt-6 bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4">
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">📌 Recommended Focus Areas</p>
                            <div className="flex flex-wrap gap-2">
                                {skillGap
                                    .filter(s => s.tier === 'weak' || s.tier === 'needs-work')
                                    .map(({ skill, score, tier }) => (
                                        <div key={skill} className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                                                tier === 'weak'
                                                    ? 'bg-rose-100 border-rose-200 text-rose-700'
                                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                            }`}>
                                                {tier === 'weak' ? '🔴' : '🟡'} {skill}
                                                <span className="text-[9px] opacity-70">({score}/100)</span>
                                            </span>
                                            <button
                                                onClick={() => navigate('/dashboard', { state: { practiceSkill: skill } })}
                                                title={`Start a session focused on ${skill}`}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-wide hover:bg-teal-100 hover:border-teal-300 transition-colors"
                                            >
                                                ▶ Practice
                                            </button>
                                        </div>
                                    ))
                                }
                            </div>
                            <p className="text-[10px] text-rose-400 font-medium mt-3">
                                Practice these skills specifically in your next session for targeted improvement.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* --- Charts Row --- */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Radar — Skill Breakdown */}
                <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[3rem] shadow-sm border border-slate-50 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Skill Breakdown</h3>
                        <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">Radar</span>
                    </div>
                    <p className="text-[10px] text-slate-300 font-medium mb-5">How you performed across each dimension</p>
                    <div className="flex-1 min-h-[260px] sm:min-h-[300px] flex items-center justify-center">
                        <Radar data={radarData} options={radarOptions} />
                    </div>
                    {/* Dimension legend */}
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
                                    }`}>
                                        {val !== null ? `${val}` : '–'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bar — Per-Question */}
                <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[3rem] shadow-sm border border-slate-50 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Per-Question Performance</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                                <span className="text-[9px] font-bold text-slate-400">Technical</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm bg-blue-500" />
                                <span className="text-[9px] font-bold text-slate-400">Confidence</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-300 font-medium mb-5">Technical vs confidence score per question</p>
                    <div className="flex-1 min-h-[260px] sm:min-h-[300px]">
                        <Bar
                            data={barData}
                            options={{
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        callbacks: {
                                            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}/100`
                                        }
                                    }
                                },
                                scales: {
                                    y: { beginAtZero: true, max: 100, grid: { color: '#f8fafc' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* --- Detailed Question Review --- */}
            <div className="space-y-6 sm:space-y-10">
                <h3 className="text-xl sm:text-3xl font-black text-slate-900 px-2 flex items-center tracking-tighter uppercase">
                    <span className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-900 text-white rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-5 text-base sm:text-xl">✓</span>
                    Answer Intelligence
                </h3>
                <div className="space-y-6 sm:space-y-10">
                    {questions.map((q, index) => (
                        <div key={index} className="bg-white rounded-3xl sm:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-500">
                            <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">

                                {/* Header: Question & Scores */}
                                <div className="flex flex-col lg:flex-row justify-between items-start gap-4 sm:gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            {q.questionType === 'coding' ? (
                                                <span className="inline-flex items-center gap-1 bg-violet-50 border border-violet-100 text-violet-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">⌨️ Coding</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-100 text-sky-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">🎙️ Verbal</span>
                                            )}
                                            {(() => {
                                                const total = questions.length;
                                                const d = q.difficulty || (index / total < 0.34 ? 'easy' : index / total < 0.67 ? 'medium' : 'hard');
                                                const cfg = {
                                                    easy:   { label: 'Easy',   icon: '🟢', cls: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
                                                    medium: { label: 'Medium', icon: '🟡', cls: 'bg-amber-50 border-amber-100 text-amber-600' },
                                                    hard:   { label: 'Hard',   icon: '🔴', cls: 'bg-rose-50 border-rose-100 text-rose-600' },
                                                }[d];
                                                return (
                                                    <span className={`inline-flex items-center gap-1 border text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.cls}`}>
                                                        <span>{cfg.icon}</span> {cfg.label}
                                                    </span>
                                                );
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
                                        <div className="px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl border flex items-center gap-2 bg-emerald-50 border-emerald-100">
                                            <span className="text-[8px] sm:text-[10px] font-black uppercase text-slate-400">Tech</span>
                                            <span className="text-xs sm:text-sm font-black text-emerald-600">{q.technicalScore}%</span>
                                        </div>
                                        <div className="px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl border border-blue-50 bg-blue-50/30 flex items-center gap-2">
                                            <span className="text-[8px] sm:text-[10px] font-black uppercase text-slate-400">Conf</span>
                                            <span className="text-xs sm:text-sm font-black text-blue-600">{q.confidenceScore}%</span>
                                        </div>
                                        {formatSecs(q.timeSpent) && (
                                            <div className="px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50 flex items-center gap-2">
                                                <span className="text-base leading-none">⏱</span>
                                                <span className="text-xs sm:text-sm font-black text-slate-500">{formatSecs(q.timeSpent)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* --- User's Submission Display (Corrected) --- */}
                                <div className="space-y-3">
                                    <label className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] block ml-1">Your Submission</label>
                                    <div className="bg-slate-50 rounded-2xl sm:rounded-[2rem] border border-slate-100 overflow-hidden">

                                        {/* Display Code if available */}
                                        {q.userSubmittedCode && q.userSubmittedCode !== "undefined" && (
                                            <div className="p-4 sm:p-6 border-b border-slate-200 last:border-0">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Code</span>
                                                <pre className="text-[11px] sm:text-xs font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto">
                                                    {q.userSubmittedCode}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Display Transcript if available */}
                                        {q.userAnswerText && (
                                            <div className="p-4 sm:p-6">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Transcript</span>
                                                <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed">
                                                    "{q.userAnswerText}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Fallback if nothing was recorded */}
                                        {(!q.userSubmittedCode || q.userSubmittedCode === "undefined") && !q.userAnswerText && (
                                            <div className="p-6 text-center text-slate-400 text-xs italic">
                                                No answer recorded.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Feedback & Ideal Answer Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 pt-6 sm:pt-8 border-t border-slate-50">
                                    <div className="space-y-3">
                                        <label className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] block ml-1">AI Analytical Feedback</label>
                                        <div className="bg-slate-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] text-xs sm:text-sm italic text-slate-600 border-l-[4px] sm:border-l-[6px] border-teal-500 leading-relaxed">
                                            "{q.aiFeedback}"
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Ideal Implementation</label>
                                            <button
                                                onClick={() => handleCopy(q.idealAnswer, index)}
                                                className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all ${
                                                    copiedIndex === index
                                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                                                }`}
                                            >
                                                {copiedIndex === index ? (
                                                    <><span>✓</span> Copied!</>
                                                ) : (
                                                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy</>
                                                )}
                                            </button>
                                        </div>
                                        <pre className="bg-slate-900 text-slate-400 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] text-[11px] sm:text-[13px] overflow-x-auto whitespace-pre-wrap font-mono shadow-inner leading-relaxed">
                                            {formatIdealAnswer(q.idealAnswer)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SessionReview;