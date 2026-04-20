import React from 'react';
import { FaSync, FaDatabase, FaHeart, FaCommentDots, FaEye, FaPaperPlane, FaCompass, FaMapMarkerAlt } from 'react-icons/fa';
import { Vector, Matrix } from '@/lib/visualization/engine/math';

interface ViewerHUDProps {
  loading: boolean;
  branding: any;
  isNavigationMode: boolean;
  handleNavigationToggle: () => void;
  fps: number;
  level?: number;
  isDevMode: boolean;
  isDataOverlayActive: boolean;
  setDataOverlayActive: (active: boolean) => void;
  isPOIOverlayActive?: boolean;
  setPOIOverlayActive?: (active: boolean) => void;
  projectedHotspots: any[];
  projectedPOIs?: any[];
  comments: any[];
  renderer: any;
  navigationState: any;
  property: any;
  isInCollection: boolean;
  handleToggleCollection: () => void;
  isCommentMode: boolean;
  setCommentMode: (active: boolean) => void;
  presentationMode: boolean;
  setPresentationMode: (active: boolean) => void;
  pendingCommentPos: any;
  setPendingCommentPos: (pos: any) => void;
  newComment: string;
  setNewComment: (comment: string) => void;
  handleDropComment: () => void;
}

const POI_COLORS: Record<string, string> = {
  'School': '#f59e0b',
  'Hospital': '#ef4444',
  'Park': '#10b981',
  'Default': '#3b82f6'
};

const ViewerHUD: React.FC<ViewerHUDProps> = ({
  loading,
  branding,
  isNavigationMode,
  handleNavigationToggle,
  fps,
  level,
  isDevMode,
  isDataOverlayActive,
  setDataOverlayActive,
  isPOIOverlayActive,
  setPOIOverlayActive,
  projectedHotspots,
  projectedPOIs = [],
  comments,
  renderer,
  navigationState,
  property,
  isInCollection,
  handleToggleCollection,
  isCommentMode,
  setCommentMode,
  presentationMode,
  setPresentationMode,
  pendingCommentPos,
  setPendingCommentPos,
  newComment,
  setNewComment,
  handleDropComment,
}) => {
  if (loading) {
    return (
      <div className='absolute inset-0 flex flex-col items-center justify-center font-mono text-sm bg-slate-950 z-20' style={{ color: branding.primaryColor }}>
        <FaSync className='animate-spin mb-4' size={40} />
        <div className='tracking-[0.5em] animate-pulse uppercase'>[ INITIALIZING_VIRTUAL_VIEWER... ]</div>
      </div>
    );
  }

  return (
    <div className='absolute inset-0 pointer-events-none z-20 p-6'>
      <div className='flex justify-between items-start'>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleNavigationToggle();
          }}
          className='pointer-events-auto bg-black/60 backdrop-blur-2xl border border-white/10 px-6 py-2.5 rounded-full flex items-center gap-3'
        >
          {isNavigationMode ? <FaCompass className='text-orange-500' size={18} /> : <FaSync className='text-blue-500' size={16} />}
          <span className='text-[10px] font-black uppercase tracking-[0.3em] text-white'>{isNavigationMode ? 'Navigation Active' : 'Viewer Ready'}</span>
        </button>

        <div className='text-right font-mono'>
          {isDevMode && <div className='text-[9px] text-blue-400'>FPS: {fps}</div>}
          {level && <div className='text-xs font-black text-blue-500 mb-1'>LVL_{level.toString().padStart(2, '0')}</div>}
          <div className='text-[10px] font-black uppercase opacity-80' style={{ color: branding.primaryColor }}>{isNavigationMode ? 'SYS_NAV' : 'SYS_VIEW'}</div>
        </div>
      </div>

      {/* Insight Labels */}
      {isDataOverlayActive && projectedHotspots.map(h => {
        const scale = Math.max(0.4, Math.min(1, 200 / h.z));
        const opacity = Math.max(0, Math.min(1, (1000 - h.z) / 800));
        
        return (
          <div 
            key={h.key}
            className='absolute pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl text-white shadow-2xl flex items-center gap-3 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group/hotspot hover:border-blue-500/50 hover:bg-black/80'
            style={{ 
              left: h.x, 
              top: h.y, 
              opacity: h.z > 0 ? opacity : 0,
              transform: `translate(-50%, -50%) scale(${scale})`,
              zIndex: Math.floor(1000 - h.z)
            }}
          >
            <div className='relative'>
              <div className='w-2 h-2 rounded-full animate-ping absolute inset-0 opacity-50' style={{ backgroundColor: branding.primaryColor }} />
              <div className='w-2 h-2 rounded-full relative z-10 shadow-[0_0_10px_rgba(59,130,246,0.8)]' style={{ backgroundColor: branding.primaryColor }} />
            </div>
            <div className='flex flex-col'>
              <span className='text-[10px] font-black uppercase tracking-[0.2em] text-white/90 group-hover/hotspot:text-blue-400 transition-colors'>{h.label}</span>
              <div className='flex items-center gap-2 mt-0.5'>
                <div className='h-[1px] w-8 bg-gradient-to-r from-blue-500 to-transparent opacity-40' />
                <span className='text-[7px] font-mono text-white/30 uppercase'>Insight_Locked</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* POI Labels */}
      {isPOIOverlayActive && projectedPOIs.map(p => {
        const scale = Math.max(0.3, Math.min(0.8, 150 / p.z));
        const opacity = Math.max(0, Math.min(0.8, (1200 - p.z) / 1000));
        const poiColor = POI_COLORS[p.category] || POI_COLORS.Default;
        
        return (
          <div 
            key={p.id}
            className='absolute pointer-events-auto bg-black/40 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-lg text-white shadow-xl flex items-center gap-2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500'
            style={{ 
              left: p.x, 
              top: p.y, 
              opacity: p.z > 0 ? opacity : 0,
              transform: `translate(-50%, -50%) scale(${scale})`,
              zIndex: Math.floor(800 - p.z)
            }}
          >
            <div className='w-1.5 h-1.5 rounded-full' style={{ backgroundColor: poiColor }} />
            <div className='flex flex-col'>
              <span className='text-[8px] font-bold uppercase tracking-wider text-white/80'>{p.label}</span>
              <span className='text-[6px] font-mono text-white/40 uppercase'>{p.category}</span>
            </div>
          </div>
        );
      })}

      {/* Comment Pins */}
      {comments.map(c => {
        const state = navigationState.current;
        const screenPos = renderer?.projectPoint(
          new Vector(c.position_x, c.position_y, c.position_z), 
          state.pos, 
          Matrix.fromEuler(state.rot.yaw, state.rot.pitch), 
          new Vector(0,0,0)
        );
        if (!screenPos || screenPos.z <= 0) return null;
        return (
          <div 
            key={c.id}
            className='absolute pointer-events-auto group/pin'
            style={{ left: screenPos.x, top: screenPos.y }}
          >
            <div className='w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform'>
              <FaCommentDots size={8} className='text-white' />
            </div>
            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/pin:block bg-black/90 backdrop-blur-md border border-white/10 p-3 rounded-xl min-w-[150px] shadow-2xl z-50'>
              <div className='text-[8px] font-black uppercase text-orange-400 mb-1'>{c.user_name}</div>
              <p className='text-[10px] text-white leading-tight'>{c.content}</p>
            </div>
          </div>
        );
      })}
      
      <div className='absolute bottom-6 inset-x-6 flex justify-between items-end'>
        <div className='p-5 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10'>
          <div className='flex justify-between items-start mb-2'>
            <div>
              <div className='text-[9px] text-blue-400 uppercase mb-1'>Property Selected</div>
              <div className='text-sm font-black text-white'>{property?.name || 'GENERIC_UNIT_01'}</div>
            </div>
            <button 
              onClick={handleToggleCollection}
              className={`pointer-events-auto p-2 rounded-full transition-all ${isInCollection ? 'text-red-500 scale-110' : 'text-white/20 hover:text-white'}`}
            >
              <FaHeart size={18} />
            </button>
          </div>
          
          <div className='flex gap-2 mt-4 pointer-events-auto'>
            <button onClick={() => setDataOverlayActive(!isDataOverlayActive)} className={`p-2 rounded-lg border transition-all ${isDataOverlayActive ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`} title="Data Overlay"><FaDatabase size={14} /></button>
            <button onClick={() => setPOIOverlayActive?.(!isPOIOverlayActive)} className={`p-2 rounded-lg border transition-all ${isPOIOverlayActive ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`} title="POI Overlay"><FaMapMarkerAlt size={14} /></button>
            <button onClick={() => setCommentMode(!isCommentMode)} className={`p-2 rounded-lg border transition-all ${isCommentMode ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`} title="3D Comment"><FaCommentDots size={14} /></button>
            <button onClick={() => setPresentationMode(!presentationMode)} className={`p-2 rounded-lg border transition-all ${presentationMode ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`} title="Presentation Mode"><FaEye size={14} /></button>
          </div>
        </div>

        {/* Spatial Comment Input */}
        {isCommentMode && (
          <div className='pointer-events-auto bg-black/80 backdrop-blur-xl border border-orange-500/30 p-4 rounded-2xl w-[250px] shadow-2xl animate-in slide-in-from-bottom-4 duration-300'>
            <div className='text-[8px] font-black uppercase text-orange-400 mb-3 tracking-widest'>Add 3D Feedback</div>
            {!pendingCommentPos ? (
              <div className='text-[10px] text-white/60 italic leading-tight'>Click anywhere in the 3D grid to set a pin position.</div>
            ) : (
              <div className='space-y-3'>
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="What are we looking at?" className='w-full bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 resize-none h-20' />
                <div className='flex gap-2'>
                  <button onClick={() => setPendingCommentPos(null)} className='flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black uppercase text-white/40 transition-all'>Reset Pin</button>
                  <button onClick={handleDropComment} className='flex-1 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-[8px] font-black uppercase text-white transition-all flex items-center justify-center gap-2'><FaPaperPlane size={8} /> Send</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewerHUD;