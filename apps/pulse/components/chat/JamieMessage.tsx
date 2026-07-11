'use client';

import React from 'react';
import Link from 'next/link';
import { FaCogs, FaLightbulb, FaLayerGroup } from 'react-icons/fa';
import { renderGlossaryText } from '@/components/glossary/GlossaryText';
import { sanitizeJamieReply } from '@/lib/ai/jamieResponse';
import { useTheme } from '@/context/ThemeProvider';

interface JamieMessageProps {
  message: {
    id: string;
    role: string;
    content: string;
    toolResults?: any[];
    tensorzero?: {
      status?: string;
      turnId?: string;
      variantName?: string;
      score?: number;
      metrics?: Record<string, number | boolean>;
    };
  };
  isDevMode: boolean;
}

const cleanContent = (content: string) => {
  if (!content || typeof content !== 'string') return '';
  return sanitizeJamieReply(content)
    .replace(/\[\[([A-Z]+):(\{.*?\}|\[.*?\])\]\]/g, '')
    .trim();
};

const formatPrice = (price?: number | null) => {
  if (!price) return 'Price not listed';
  return `$${price.toLocaleString()}`;
};

const JamiePropertyResultCards = ({ toolResults }: { toolResults?: any[] }) => {
  const { branding } = useTheme();
  const siteName = branding.siteName || 'Sunset Pulse';
  const searchResult = toolResults?.find((result) => result?.name === 'search_properties')?.output;
  const properties = Array.isArray(searchResult?.properties) ? searchResult.properties : [];
  if (!properties.length) return null;

  return (
    <div className="grid w-full max-w-[92%] gap-2 sm:max-w-[86%]">
      {properties.slice(0, 3).map((property: any) => {
        const location = [property.city, property.state].filter(Boolean).join(', ');
        return (
          <Link
            key={property.id}
            href={property.href || `/properties/${encodeURIComponent(property.id)}`}
            className="group rounded-xl border border-blue-400/20 bg-slate-950/80 p-3 text-left shadow-lg transition-all hover:border-blue-400/60 hover:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-white">{property.name}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/70">
                  {location || property.source || siteName}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
                {property.source || 'Grid'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-300">
              <span>{formatPrice(property.price)}</span>
              {property.beds ? <span>{property.beds} bed</span> : null}
              {property.baths ? <span>{property.baths} bath</span> : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
};

const JamieMessage: React.FC<JamieMessageProps> = ({ message, isDevMode }) => {
  const isUser = message.role === 'user';
  const content = message.content || '';
  const cleaned = cleanContent(content);

  const displayContent = cleaned || (isDevMode ? '[METADATA_ONLY_NODE]' : '');

  if (!displayContent && !isDevMode) return null;

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in slide-in-from-${isUser ? 'right' : 'left'}-5 duration-300 gap-2 mb-4`}>
      {/* User Message or Jamie's Response */}
      <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm shadow-xl transition-all duration-500 hover:scale-[1.01] relative ${
        isUser 
          ? 'bg-blue-600 text-white rounded-tr-none border border-white/10' 
          : 'bg-slate-800 text-white border border-white/10 rounded-tl-none'
      }`}>
        {!isUser && (
          <div className="absolute -top-2 -left-2 bg-blue-500 rounded-full p-1 border border-slate-900 shadow-lg">
            <FaLightbulb size={8} className="text-white" />
          </div>
        )}
        <p className="leading-relaxed font-medium whitespace-pre-wrap">{renderGlossaryText(displayContent)}</p>
      </div>
      {!isUser && <JamiePropertyResultCards toolResults={message.toolResults} />}

      {!isUser && isDevMode && message.tensorzero && (
        <div className="ml-2 flex max-w-[86%] flex-wrap items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-950/20 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
          <span className="flex items-center gap-1 text-cyan-200">
            <FaCogs size={9} /> TensorZero
          </span>
          <span>{message.tensorzero.status || 'ready'}</span>
          <span className="font-mono normal-case tracking-normal text-cyan-100/80">
            {message.tensorzero.variantName || 'jamie_chat'}
          </span>
          {typeof message.tensorzero.score === 'number' && (
            <span>{Math.round(message.tensorzero.score)} score</span>
          )}
        </div>
      )}
      
      {!isUser && isDevMode && content.includes('[[') && (
        <div className="ml-2 flex flex-col gap-1.5 w-full max-w-[80%]">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500 tracking-widest px-1">
            <FaLayerGroup size={8} /> Internal Process Chain
          </div>
          <div className="flex flex-wrap gap-2">
            {content.match(/\[\[([A-Z]+):/g)?.map((match, i) => {
              const tag = match.replace('[[', '').replace(':', '');
              return (
                <div key={i} className="px-2 py-1 bg-slate-900/50 border border-blue-500/20 rounded-lg flex items-center gap-2 group hover:border-blue-500/50 transition-colors">
                  <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                  <span className="font-mono text-[8px] text-blue-300/80">{tag}_PROCESSED</span>
                </div>
              );
            })}
          </div>
          
          <div className="mt-1 p-3 bg-slate-950/80 rounded-xl border border-blue-500/30 font-mono text-[9px] text-blue-300/80 overflow-x-auto">
            <div className="flex items-center gap-2 mb-1 text-blue-400 font-black uppercase tracking-widest">
              <FaCogs /> [RAW_PAYLOAD]
            </div>
            <pre className="whitespace-pre-wrap">{content.match(/\[\[(.*?)\]\]/g)?.join('\n')}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default JamieMessage;
