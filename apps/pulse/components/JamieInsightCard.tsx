'use client';

import React from 'react';
import { FaLightbulb, FaQuestionCircle, FaInfoCircle } from 'react-icons/fa';

interface JamieInsightCardProps {
  insight: {
    id: string;
    question: string;
    answer: string;
    category: string;
    importance: string;
  };
}

const JamieInsightCard: React.FC<JamieInsightCardProps> = ({ insight }) => {
  const importanceColor = insight.importance === 'high' ? 'text-rose-500' : 'text-blue-500';
  const importanceBg = insight.importance === 'high' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-500/10 border-blue-500/20';

  return (
    <div className="group relative bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all duration-500">
      <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl border-l border-b ${importanceBg} border-white/10`}>
        <span className={`text-[8px] font-black uppercase tracking-widest ${importanceColor}`}>
          {insight.importance} priority
        </span>
      </div>

      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <FaQuestionCircle size={14} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            {insight.category} Insight
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-4 leading-tight group-hover:text-blue-400 transition-colors">
          {insight.question}
        </h3>

        <div className="relative pl-6 border-l-2 border-blue-500/30 py-2">
          <div className="absolute -left-[9px] top-4 w-4 h-4 bg-slate-900 border-2 border-blue-500 rounded-full flex items-center justify-center">
            <FaLightbulb size={8} className="text-blue-400" />
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            {insight.answer}
          </p>
        </div>
      </div>

      <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
          Source: Jamie Insights
        </span>
        <button className="text-[8px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors flex items-center gap-2">
          Verify Details <FaInfoCircle size={10} />
        </button>
      </div>
    </div>
  );
};

export default JamieInsightCard;
