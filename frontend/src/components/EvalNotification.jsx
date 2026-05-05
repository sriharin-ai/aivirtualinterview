import { useEffect, useState } from 'react';

const EvalNotification = ({ question, questionIndex, onNavigate, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 50);
    const hide = setTimeout(() => handleDismiss(), 7000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 350);
  };

  const techScore = question?.technicalScore ?? 0;
  const confScore = question?.confidenceScore ?? 0;
  const avg = Math.round((techScore + confScore) / 2);

  const color =
    avg >= 70 ? { bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 border-emerald-200', label: 'Strong' } :
    avg >= 40 ? { bar: 'bg-amber-400',   text: 'text-amber-600',   badge: 'bg-amber-50 border-amber-200',   label: 'Needs Work' } :
                { bar: 'bg-rose-500',    text: 'text-rose-600',    badge: 'bg-rose-50 border-rose-200',     label: 'Insufficient' };

  return (
    <div
      className={`fixed bottom-24 right-4 z-[100] w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300 overflow-hidden transition-all duration-350 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {/* Auto-dismiss progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${color.bar} transition-none`}
          style={{ animation: 'shrink-bar 7s linear forwards' }}
        />
      </div>

      <div className="px-4 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">AI Evaluation Ready</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">Question {questionIndex + 1} scored</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-300 hover:text-slate-600 transition-colors text-lg leading-none mt-0.5 shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Technical</p>
            <p className={`text-lg font-black leading-none ${color.text}`}>{techScore}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
            <p className={`text-lg font-black leading-none ${color.text}`}>{confScore}</p>
          </div>
          <div className={`border rounded-xl p-2.5 text-center ${color.badge}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Overall</p>
            <p className={`text-lg font-black leading-none ${color.text}`}>{avg}</p>
          </div>
        </div>

        {/* Feedback snippet */}
        {question?.aiFeedback && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
            {question.aiFeedback}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={() => { onNavigate(questionIndex); handleDismiss(); }}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl transition-all active:scale-95"
        >
          View Full Feedback →
        </button>
      </div>

      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default EvalNotification;
