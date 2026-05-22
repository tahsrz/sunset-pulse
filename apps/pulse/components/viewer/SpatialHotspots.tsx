'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { FaHeartbeat, FaDollarSign, FaBed, FaCalendarAlt, FaChartLine, FaShieldAlt, FaGem, FaBroadcastTower, FaEye, FaBolt } from 'react-icons/fa';

interface HotspotProps {
  position: [number, number, number];
  label: string;
  icon: React.ReactNode;
  value: string | number;
  color?: string;
  trend?: 'UP' | 'DOWN' | 'STABLE';
  status?: string;
}

const HotspotLabel: React.FC<HotspotProps> = ({ position, label, icon, value, color = '#3b82f6', trend, status }) => {
  return (
    <Html position={position} center distanceFactor={15}>
      <div className="group pointer-events-auto flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl text-white shadow-2xl transition-all duration-300 hover:border-blue-500/50 hover:bg-black/80 whitespace-nowrap min-w-[120px]">
        <div className="relative">
          <div className="w-2 h-2 rounded-full animate-ping absolute inset-0 opacity-50" style={{ backgroundColor: color }} />
          <div className="w-2 h-2 rounded-full relative z-10 shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ backgroundColor: color }} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 opacity-80">{icon}</span>
            <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/90 group-hover:text-blue-400 transition-colors">
              {value}
            </span>
            {trend && (
              <span className={`text-[8px] font-bold ${trend === 'UP' ? 'text-green-500' : trend === 'DOWN' ? 'text-red-500' : 'text-slate-500'}`}>
                {trend === 'UP' ? 'UP' : trend === 'DOWN' ? 'DOWN' : '-'}
              </span>
            )}
          </div>
          {status && (
            <div className="text-[6px] font-mono text-blue-500/60 uppercase tracking-widest mt-0.5">{status}</div>
          )}
        </div>
      </div>
    </Html>
  );
};

interface SpatialHotspotsProps {
  property: any;
  isNeuralMode?: boolean;
}

const SpatialHotspots: React.FC<SpatialHotspotsProps> = ({ property, isNeuralMode = false }) => {
  const [reconData, setReconData] = useState<any>(null);

  useEffect(() => {
    if (isNeuralMode && property?._id) {
      fetch(`/api/properties/${property._id}/recon`)
        .then(res => res.json())
        .then(data => setReconData(data.data || data))
        .catch(err => console.error('Failed to fetch hotspots recon:', err));
    }
  }, [isNeuralMode, property?._id]);

  const hotspots = useMemo(() => {
    if (!property) return [];
    
    const yieldValue = reconData?.financial?.yield?.percentage || '---';
    const grade = reconData?.financial?.investment_grade || 'U';
    const pulseScore = reconData?.neighborhood?.pulseScore || '---';
    const neuralStatus = reconData?.neighborhood?.neural_status || 'UPDATING';
    const momentum = reconData?.financial?.market || { percentage: 0, trend: 'STABLE' };
    const visits = reconData?.engagement?.visits_48h || 0;
    const velocity = reconData?.engagement?.velocity || 'STABLE';

    return [
      {
        id: 'yield',
        position: [6, 8, 6] as [number, number, number],
        label: 'Est. Yield',
        icon: <FaDollarSign size={8} />,
        value: `${yieldValue}% ARR`,
        color: '#3b82f6'
      },
      {
        id: 'grade',
        position: [0, 15, 0] as [number, number, number],
        label: 'Investment Grade',
        icon: <FaGem size={8} />,
        value: `CLASS ${grade}`,
        color: grade.includes('A') ? '#22c55e' : '#a855f7'
      },
      {
        id: 'pulse',
        position: [8, 4, -8] as [number, number, number],
        label: 'Area Score',
        icon: <FaHeartbeat size={8} />,
        value: `${pulseScore}/100 SCORE`,
        color: '#ef4444',
        status: neuralStatus
      },
      {
        id: 'market',
        position: [-8, 6, 8] as [number, number, number],
        label: 'Market Momentum',
        icon: <FaChartLine size={8} />,
        value: `${momentum.percentage > 0 ? '+' : ''}${momentum.percentage}% AREA`,
        color: '#f59e0b',
        trend: momentum.trend
      },
      {
        id: 'engagement',
        position: [10, 12, 0] as [number, number, number],
        label: 'Visit Density',
        icon: <FaEye size={8} />,
        value: `${visits} VISITS / 48H`,
        color: '#38bdf8',
        status: `${velocity}_VELOCITY`
      },
      {
        id: 'recon',
        position: [0, 20, 5] as [number, number, number],
        label: 'Data Review',
        icon: <FaBroadcastTower size={8} />,
        value: 'DATA LINK ACTIVE',
        color: '#10b981',
        status: reconData?.neighborhood?.vibe_alignment ? `${reconData.neighborhood.vibe_alignment}_VIBE` : ''
      }
    ];
  }, [property, reconData]);

  if (!isNeuralMode) return null;

  return (
    <group>
      {/* Area score radius visualization */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <ringGeometry args={[15, 15.2, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <ringGeometry args={[10, 10.1, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} />
      </mesh>

      {hotspots.map(h => (
        <HotspotLabel 
          key={h.id}
          position={h.position}
          label={h.label}
          icon={h.icon}
          value={h.value}
          color={h.color}
          trend={h.trend as any}
          status={h.status}
        />
      ))}
    </group>
  );
};

export default SpatialHotspots;
