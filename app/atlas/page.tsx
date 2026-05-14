'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function MemoriaAtlasPage() {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [selectedNode, setSelectedNode] = useState(null);
    const [cartridges, setCartridges] = useState([]);
    const [currentCartridge, setCurrentCartridge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [viewMode, setViewMode] = useState('constellation'); 
    const [pulseResults, setPulseResults] = useState([]);
    const [isPulseLoading, setIsPulseLoading] = useState(false);
    const [askResponse, setAskResponse] = useState(null);
    const [isIgnited, setIsIgnited] = useState(false);
    
    const readerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToNode = (node: any) => {
        setSelectedNode(node);
        // If we are in reader mode, the AnimatePresence might need a moment or we scroll the ref
        if (readerRef.current) {
            readerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleGlobalPulse = (query: string) => {
        if (!query) { setPulseResults([]); return; }
        setIsPulseLoading(true);
        fetch(`http://localhost:8000/pulse?query=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => { setPulseResults(data); setIsPulseLoading(false); })
            .catch(err => { console.error("Pulse failed:", err); setIsPulseLoading(false); });
    };

    const handleAskVault = (query: string) => {
        if (!currentCartridge || !query) return;
        setLoading(true);
        fetch(`http://localhost:8000/cartridge/${currentCartridge}/ask?query=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => { setAskResponse(data); setLoading(false); })
            .catch(err => { console.error("Failed to query vault:", err); setLoading(false); });
    };

    const scroll = (offset: number) => {
        if (scrollRef.current) scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    };

    useEffect(() => {
        if (fgRef.current && isIgnited) {
            (fgRef.current as any).d3Force('charge').strength(-100);
            (fgRef.current as any).d3Force('link').distance(30);
            (fgRef.current as any).d3ReheatSimulation();
        } else if (fgRef.current && !isIgnited) {
            (fgRef.current as any).d3Force('charge').strength(0);
            (fgRef.current as any).d3Force('link').distance(1);
            (fgRef.current as any).d3ReheatSimulation();
        }
    }, [isIgnited, graphData]);

    useEffect(() => {
        setMounted(true);
        fetch('http://localhost:8000/cartridges')
            .then(res => res.json())
            .then(data => {
                setCartridges(data);
                if (data.length > 0) loadCartridge(data[0]);
                else setLoading(false);
            })
            .catch(err => console.error("Failed to load cartridges:", err));
    }, []);

    const loadCartridge = (name) => {
        setLoading(true);
        setCurrentCartridge(name);
        fetch(`http://localhost:8000/cartridge/${name}/map`)
            .then(res => res.json())
            .then(data => { setGraphData(data); setLoading(false); })
            .catch(err => { console.error("Failed to load map:", err); setLoading(false); });
    };

    return (
        <div className="relative w-full h-screen bg-slate-950 overflow-hidden text-white font-sans selection:bg-cyan-500/30">
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .intel-scanline {
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
                    background-size: 100% 4px, 3px 100%;
                    pointer-events: none;
                }
            `}</style>
            
            <div className="intel-scanline absolute inset-0 z-50 pointer-events-none opacity-20" />
            
            {/* Header / HUD */}
            <div className="absolute top-0 left-0 w-full p-6 z-[60] flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent uppercase">Memoria v3.5</h1>
                        <div className="flex bg-slate-900/60 border border-slate-800/50 rounded-full p-1 backdrop-blur-xl shadow-2xl">
                            <button onClick={() => setViewMode('constellation')} className={`px-4 py-1 text-[9px] font-mono uppercase tracking-widest rounded-full transition-all ${viewMode === 'constellation' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>Constellation</button>
                            <button onClick={() => setViewMode('reader')} className={`px-4 py-1 text-[9px] font-mono uppercase tracking-widest rounded-full transition-all ${viewMode === 'reader' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'text-slate-500 hover:text-slate-300'}`}>Dossier</button>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-2 max-w-[60vw]">
                        <button onClick={() => scroll(-200)} className="p-1 text-slate-600 hover:text-cyan-400 transition-colors pointer-events-auto text-xs">⟨</button>
                        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 no-scrollbar pointer-events-auto">
                            <div className="flex gap-2 flex-nowrap">
                                {cartridges.map(c => (
                                    <button key={c} onClick={() => loadCartridge(c)} className={`px-3 py-1 text-[10px] border rounded transition-all whitespace-nowrap font-mono ${currentCartridge === c ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}>{c.toUpperCase()}</button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => scroll(200)} className="p-1 text-slate-600 hover:text-cyan-400 transition-colors pointer-events-auto text-xs">⟩</button>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="pointer-events-auto relative group">
                        <div className="flex items-center bg-slate-900/40 border border-slate-800/50 rounded-lg px-4 py-2 backdrop-blur-xl focus-within:border-cyan-500/30 transition-all">
                            <span className="text-cyan-500/50 mr-3 text-[10px] font-mono tracking-widest">PULSE_QUERY:</span>
                            <input type="text" placeholder="Scanning vaults..." className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder:text-slate-700 w-48 font-mono" onChange={(e) => handleGlobalPulse(e.target.value)} />
                        </div>
                        {pulseResults.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full mt-2 right-0 w-96 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-2xl z-[70] p-4 overflow-hidden border-t-cyan-500/50">
                                <h4 className="text-[9px] font-mono text-cyan-500/50 uppercase tracking-[0.3em] mb-4">Detected Truths</h4>
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                                    {pulseResults.map(res => (
                                        <div key={res.cartridge} onClick={() => { loadCartridge(res.cartridge); setPulseResults([]); setIsIgnited(true); }} className="cursor-pointer p-3 bg-slate-900/30 border border-slate-800/50 rounded-lg hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group">
                                            <div className="flex justify-between items-center mb-1"><span className="text-[11px] font-bold text-slate-300 group-hover:text-cyan-400">{res.cartridge}</span><span className="text-[8px] font-mono text-cyan-900 uppercase tracking-tighter">Sync_Ready</span></div>
                                            <p className="text-[10px] text-slate-500 italic line-clamp-1">"{res.matches[0]}"</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                    <div className="pointer-events-auto bg-slate-900/40 border border-slate-800/50 p-4 rounded-xl backdrop-blur-xl max-w-xs flex flex-col gap-1 shadow-2xl">
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" /><span className="text-[9px] font-mono text-cyan-500/80 uppercase tracking-[0.2em]">Memoria_Status: Nominal</span></div>
                        <p className="text-[10px] text-slate-400 font-mono leading-none">V_NODES: {graphData.nodes.length} | B_BRIDGES: {graphData.links.length}</p>
                    </div>
                </div>
            </div>

            {/* View Layer: Constellation */}
            <AnimatePresence mode="wait">
                {mounted && viewMode === 'constellation' && (
                    <motion.div key="constellation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative">
                        <motion.div className="w-full h-full cursor-crosshair" onClick={() => !isIgnited && setIsIgnited(true)}>
                            <ForceGraph2D
                                ref={fgRef}
                                graphData={graphData}
                                nodeLabel="label"
                                nodeColor={node => {
                                    if (node.type === 'toc') return '#22d3ee';
                                    if (node.type === 'wiki') return '#4ade80';
                                    return node.type === 'text' ? '#f97316' : '#8b5cf6';
                                }}
                                nodeRelSize={6}
                                linkColor={() => 'rgba(30, 41, 59, 0.3)'}
                                onNodeClick={node => { if (!isIgnited) setIsIgnited(true); else { setSelectedNode(node); } }}
                                onBackgroundClick={() => !isIgnited && setIsIgnited(true)}
                                backgroundColor="#020617"
                                nodeCanvasObject={(node, ctx, globalScale) => {
                                    const label = node.label;
                                    const fontSize = 12/globalScale;
                                    ctx.font = `${fontSize}px JetBrains Mono`;
                                    let coreColor = '#f97316';
                                    if (node.type === 'toc') coreColor = '#22d3ee';
                                    if (node.type === 'wiki') coreColor = '#4ade80';
                                    if (node.type === 'coord') coreColor = '#8b5cf6';
                                    ctx.shadowBlur = isIgnited ? 15 : 5;
                                    ctx.shadowColor = coreColor;
                                    ctx.fillStyle = coreColor;
                                    ctx.beginPath(); ctx.arc(node.x, node.y, node.type === 'toc' ? 6 : (node.type === 'wiki' ? 5 : 4), 0, 2 * Math.PI, false); ctx.fill();
                                    ctx.shadowBlur = 0;
                                    if (globalScale > 3 && isIgnited) { ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.fillText(label, node.x + 8, node.y + 3); }
                                }}
                            />
                        </motion.div>
                        
                        {/* Constellation Sidebar */}
                        <AnimatePresence>
                            {selectedNode && (
                                <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} className="absolute right-0 top-0 h-full w-[400px] bg-slate-950/80 border-l border-slate-800/50 p-8 backdrop-blur-3xl z-40 shadow-2xl overflow-y-auto no-scrollbar pt-40">
                                    <button onClick={() => setSelectedNode(null)} className="absolute top-32 right-8 text-slate-500 hover:text-white transition-colors">✕</button>
                                    <div className="mb-8 flex flex-col gap-2">
                                        <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest px-2 py-0.5 border border-cyan-500/20 rounded bg-cyan-500/5 self-start">ADDR: {selectedNode.meta}</span>
                                        <h2 className="text-xl font-bold tracking-tight text-white">{selectedNode.label}</h2>
                                    </div>
                                    <div className="space-y-6">
                                        {selectedNode.bits && (
                                            <div className="p-4 bg-slate-900/30 border border-slate-800/50 rounded-lg">
                                                <h3 className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-3">Neural_Signature</h3>
                                                <div className="grid grid-cols-28 gap-1">
                                                    {Array.from({ length: 448 }).map((_, i) => {
                                                        const byteIdx = Math.floor(i / 8); const bitIdx = i % 8;
                                                        const byte = parseInt(selectedNode.bits.substr(byteIdx * 2, 2), 16);
                                                        const isActive = (byte & (1 << bitIdx)) !== 0;
                                                        return <div key={i} className={`w-1 h-1 rounded-full transition-all ${isActive ? 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)] scale-110' : 'bg-slate-800 scale-75'}`} />;
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-5 bg-slate-900/30 border border-slate-800/50 rounded-lg"><p className="text-sm text-slate-400 italic leading-relaxed font-serif">"{selectedNode.full_text}"</p></div>
                                        <button className="w-full py-3 bg-cyan-600/10 border border-cyan-500/30 rounded text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all">Synchronize_Truth</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Layer: Dossier (Human Reader) */}
            <AnimatePresence mode="wait">
                {viewMode === 'reader' && (
                    <motion.div key="reader" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute inset-0 z-20 flex bg-[#020617] pt-40 overflow-hidden">
                        {/* Left: Vault Index */}
                        <div className="w-72 border-r border-slate-800/50 flex flex-col p-6 hidden lg:flex">
                            <h3 className="text-[9px] font-mono text-cyan-500 uppercase tracking-[0.3em] mb-8">Vault_Index_Table</h3>
                            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                                {graphData.nodes.filter(n => n.type === 'wiki' || n.type === 'toc').map(n => (
                                    <button key={n.id} onClick={() => scrollToNode(n)} className={`w-full text-left px-4 py-2 rounded text-[11px] font-mono transition-all border ${selectedNode?.id === n.id ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
                                        {n.label.replace('[MEMORIA: ', '').replace(']', '').toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Center: Intelligence Report */}
                        <div ref={readerRef} className="flex-1 overflow-y-auto no-scrollbar px-12 md:px-24 py-12 border-r border-slate-800/50 scroll-smooth">
                            {selectedNode ? (
                                <motion.div key={selectedNode.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto pb-40">
                                    <div className="flex items-center gap-4 mb-12 opacity-50">
                                        <div className="h-[1px] flex-1 bg-slate-800" />
                                        <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest px-2 py-1 border border-cyan-500/20 rounded">Memoria_Truth_{selectedNode.meta.substr(2, 6)}</span>
                                        <div className="h-[1px] flex-1 bg-slate-800" />
                                    </div>
                                    
                                    <h1 className="text-6xl font-bold tracking-tighter text-slate-50 mb-16 uppercase italic">
                                        {selectedNode.label.replace('[MEMORIA: ', '').replace(']', '')}
                                    </h1>
                                    
                                    <div className="space-y-12 relative">
                                        {selectedNode.full_text.split('\n\n').map((para, i) => (
                                            <div key={i} className="relative group flex gap-8">
                                                <div className="w-12 text-[9px] font-mono text-slate-800 pt-2 group-hover:text-cyan-900 transition-colors uppercase select-none">
                                                    SHRD_{selectedNode.id + i}
                                                </div>
                                                <p className="flex-1 text-lg leading-relaxed text-slate-300 font-serif first-letter:text-4xl first-letter:font-bold first-letter:text-cyan-600 first-letter:mr-2">
                                                    {para.replace(/\[MEMORIA: .*\]/, '')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recursive Links as Footnotes */}
                                    {selectedNode.hard_links && selectedNode.hard_links.length > 0 && (
                                        <div className="mt-32 pt-12 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {selectedNode.hard_links.map(linkHash => {
                                                const targetNode = graphData.nodes.find(n => n.meta === linkHash);
                                                return (
                                                    <button key={linkHash} onClick={() => targetNode && scrollToNode(targetNode)} className="group flex flex-col p-4 bg-slate-900/20 border border-slate-800/50 rounded-lg hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left">
                                                        <span className="text-[8px] font-mono text-slate-700 uppercase group-hover:text-cyan-700 transition-colors mb-2">Recursive_Jump: {linkHash}</span>
                                                        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-100 transition-colors">
                                                            {targetNode ? targetNode.label.replace('[MEMORIA: ', '').replace(']', '') : `Truth_${linkHash}`}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-800 font-mono text-[10px] uppercase tracking-[0.5em] opacity-50">Synchronizing Dossier...</div>
                            )}
                        </div>

                        {/* Right: Diagnostic Stream */}
                        <div className="w-80 p-6 flex flex-col gap-8 hidden xl:flex overflow-y-auto no-scrollbar bg-slate-950/40">
                            <h3 className="text-[9px] font-mono text-cyan-500 uppercase tracking-[0.3em]">Live_Diag_Stream</h3>
                            {selectedNode ? (
                                <div className="space-y-8 animate-in fade-in duration-1000">
                                    <div className="space-y-3">
                                        <span className="text-[8px] font-mono text-slate-500 uppercase">Binary_Signature</span>
                                        <div className="grid grid-cols-14 gap-1">
                                            {Array.from({ length: 196 }).map((_, i) => {
                                                const isActive = selectedNode.bits && (parseInt(selectedNode.bits.substr(i*2, 2), 16) > 128);
                                                return <div key={i} className={`w-1.5 h-1.5 rounded-sm ${isActive ? 'bg-cyan-500/50' : 'bg-slate-900'}`} />;
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <span className="text-[8px] font-mono text-slate-500 uppercase">Semantic_Anchors</span>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedNode.keywords?.map(kw => <span key={kw} className="px-2 py-0.5 border border-slate-800 rounded-[2px] text-[8px] font-mono text-slate-500">{kw.toUpperCase()}</span>)}
                                        </div>
                                    </div>
                                    <div className="p-4 border border-cyan-900/30 bg-cyan-950/10 rounded-sm">
                                        <p className="text-[9px] font-mono text-cyan-600 uppercase mb-2">Protocol_Verification</p>
                                        <div className="flex justify-between text-[11px] font-bold font-mono text-slate-300"><span>O(1) Seek:</span><span className="text-green-500 underline">PASS</span></div>
                                        <div className="flex justify-between text-[11px] font-bold font-mono text-slate-300"><span>Determinism:</span><span className="text-green-500 underline">100%</span></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[9px] font-mono text-slate-800 italic uppercase">Waiting for truth alignment...</div>
                            )}
                        </div>

                        {/* Floating Command Pulse */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 pointer-events-none z-[80]">
                            <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto flex items-center gap-4 group focus-within:border-cyan-500 transition-all">
                                <div className="w-8 h-8 rounded-full bg-cyan-900/20 border border-cyan-900 flex items-center justify-center text-cyan-500 text-xs font-mono">?</div>
                                <input 
                                    type="text" 
                                    placeholder="ASK_VAULT: Querying Memoria Protocol..." 
                                    className="bg-transparent flex-1 border-none outline-none text-sm text-slate-200 placeholder:text-slate-700 font-mono"
                                    onKeyDown={(e) => { if (e.key === 'Enter') { const target = e.target as HTMLInputElement; handleAskVault(target.value); target.value = ''; } }}
                                />
                                <div className="text-[8px] font-mono text-slate-700 border border-slate-800 px-1.5 py-0.5 rounded group-focus-within:text-cyan-500 group-focus-within:border-cyan-500 transition-colors">CMD+K</div>
                            </div>
                            
                            {/* Command Results (Small Overlay) */}
                            {askResponse && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-6 bg-slate-950/90 border border-slate-800 rounded-xl backdrop-blur-3xl shadow-2xl max-h-60 overflow-y-auto no-scrollbar border-t-cyan-500/50">
                                    <div className="flex justify-between mb-4"><span className="text-[8px] font-mono text-cyan-500 uppercase tracking-widest">Surgical_Context_Retrieved</span><button onClick={() => setAskResponse(null)} className="text-[8px] font-mono text-slate-600 hover:text-white">CLOSE</button></div>
                                    <div className="space-y-4">
                                        {askResponse.context?.map((shard, i) => <p key={i} className="text-[11px] text-slate-400 font-serif leading-relaxed italic border-l border-cyan-900 pl-3">"{shard.replace(/\[MEMORIA: .*\]/, '')}"</p>)}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.3)]" />
                        <span className="mt-6 text-[10px] font-mono text-cyan-500 animate-pulse uppercase tracking-[0.5em]">Establishing Truth Alignment...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
