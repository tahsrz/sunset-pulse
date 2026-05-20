import React from 'react';
import { FaChartLine, FaInfoCircle } from 'react-icons/fa';

interface MarketIntelligenceProps {
  rentData: any;
}

const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ rentData }) => {
  if (!rentData) return null;

  const rent = typeof rentData.rent === 'number' ? rentData.rent : null;
  const rentRangeLow = typeof rentData.rentRangeLow === 'number' ? rentData.rentRangeLow : null;
  const rentRangeHigh = typeof rentData.rentRangeHigh === 'number' ? rentData.rentRangeHigh : null;
  const rawConfidence = typeof rentData.confidenceScore === 'number' ? rentData.confidenceScore : null;
  const confidencePercent = rawConfidence === null
    ? null
    : Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence);
  const clampedConfidence = confidencePercent === null
    ? 0
    : Math.max(0, Math.min(confidencePercent, 100));

  const rentLabel = rent === null ? 'Unavailable' : `$${rent.toLocaleString()}`;
  const rangeLabel = rentRangeLow !== null && rentRangeHigh !== null
    ? `$${rentRangeLow.toLocaleString()} - $${rentRangeHigh.toLocaleString()}`
    : 'Range unavailable';

  const summary = rent !== null && rentRangeLow !== null && rentRangeHigh !== null
    ? `This estimate suggests the property may rent near ${rentLabel}/mo, with a typical range of ${rangeLabel}.`
    : 'Rental estimate data is limited for this property, so confirm pricing with a local market review.';

  return (
    <div className="bg-slate-900 border border-blue-500/20 p-8 rounded-2xl shadow-2xl mt-8 relative overflow-hidden group transition-all duration-500 hover:border-blue-500/40">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <FaChartLine size={80} className="text-blue-400" />
      </div>

      <div className="mb-8 border-l-4 border-blue-500 pl-4 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-xl font-black text-white tracking-tight">
            Rental estimate
          </h3>
          <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-1 rounded font-bold tracking-wide">
            Market data
          </span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
          {summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="bg-slate-950/80 border border-white/5 p-6 rounded-2xl">
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            Estimated rent <FaInfoCircle className="text-[8px]" />
          </div>
          <div className="text-2xl font-black text-white italic">
            {rentLabel} {rent !== null && <span className="text-[10px] text-slate-500 not-italic">/mo</span>}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-white/5 p-6 rounded-2xl">
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">
            Confidence
          </div>
          <div className="flex items-end gap-2">
            <div className="text-2xl font-black text-green-400 italic">
              {confidencePercent === null ? 'N/A' : `${clampedConfidence}%`}
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full mb-2 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-1000"
                style={{ width: `${clampedConfidence}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-white/5 p-6 rounded-2xl">
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">
            Expected range
          </div>
          <div className="text-sm font-bold text-slate-400">
            {rangeLabel}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-6 leading-relaxed font-medium">
        Estimate provided by RentCast where available. Use as directional market context, not a guaranteed rental price.
      </p>
    </div>
  );
};

export default MarketIntelligence;
