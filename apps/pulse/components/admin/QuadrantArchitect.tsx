import React from 'react';

interface QuadrantConfig {
  background: string;
  color: string;
}

interface Quadrants {
  topLeft: QuadrantConfig;
  topRight: QuadrantConfig;
  bottomLeft: QuadrantConfig;
  bottomRight: QuadrantConfig;
}

interface QuadrantArchitectProps {
  quadrants: Quadrants;
  borderRadius: string;
  mainBackground: string;
  handleUpdate: (updates: any) => void;
  handleQuadrantUpdate: (quadrant: string, field: string, value: string) => void;
}

const QuadrantArchitect: React.FC<QuadrantArchitectProps> = ({ 
  quadrants, 
  borderRadius, 
  mainBackground, 
  handleUpdate, 
  handleQuadrantUpdate 
}) => {
  return (
    <section className="bg-slate-900/50 border border-white/5 rounded-3xl p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
          Quadrant Architect <span className="text-[8px] text-slate-600 font-mono tracking-normal px-2 py-0.5 bg-white/5 rounded ml-2">CSS_VARIABLE_MAPPING</span>
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 aspect-video bg-black rounded-2xl p-4 border border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        
        {/* Top Left */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">TL_NODE</div>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Background"
              value={quadrants.topLeft.background}
              onChange={(e) => handleQuadrantUpdate('topLeft', 'background', e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-blue-400 outline-none"
            />
            <input 
              type="text" 
              placeholder="Text Color"
              value={quadrants.topLeft.color}
              onChange={(e) => handleQuadrantUpdate('topLeft', 'color', e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-blue-400 outline-none"
            />
          </div>
        </div>

        {/* Top Right */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 text-right">TR_NODE</div>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Background"
              value={quadrants.topRight.background}
              onChange={(e) => handleQuadrantUpdate('topRight', 'background', e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-blue-400 outline-none"
            />
            <input 
              type="text" 
              placeholder="Text Color"
              value={quadrants.topRight.color}
              onChange={(e) => handleQuadrantUpdate('topRight', 'color', e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-blue-400 outline-none"
            />
          </div>
        </div>

        {/* Bottom Left */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">BL_NODE</div>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Background"
              value={quadrants.bottomLeft.background}
              onChange={(e) => handleQuadrantUpdate('bottomLeft', 'background', e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-blue-400 outline-none"
            />
            <input 
              type="text" 
              placeholder="Text Color"
              value={quadrants.bottomLeft.color}
              onChange={(e) => handleQuadrantUpdate('bottomLeft', 'color', e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-blue-400 outline-none"
            />
          </div>
        </div>

        {/* Bottom Right */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex flex-col justify-between group hover:border-blue-500/30 transition-all">
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 text-right">BR_NODE</div>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Background"
              value={quadrants.bottomRight.background}
              onChange={(e) => handleQuadrantUpdate('bottomRight', 'background', e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-blue-400 outline-none"
            />
            <input 
              type="text" 
              placeholder="Text Color"
              value={quadrants.bottomRight.color}
              onChange={(e) => handleQuadrantUpdate('bottomRight', 'color', e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-blue-400 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Border Radius</label>
          <input 
            type="text" 
            value={borderRadius}
            onChange={(e) => handleUpdate({ borderRadius: e.target.value })}
            className="w-full bg-slate-950 border border-white/5 rounded-lg px-4 py-3 text-xs text-blue-100 outline-none"
          />
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Main Background</label>
          <input 
            type="text" 
            value={mainBackground}
            onChange={(e) => handleUpdate({ mainBackground: e.target.value })}
            className="w-full bg-slate-950 border border-white/5 rounded-lg px-4 py-3 text-xs text-blue-100 outline-none"
          />
        </div>
      </div>
    </section>
  );
};

export default QuadrantArchitect;
