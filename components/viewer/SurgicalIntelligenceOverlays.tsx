'use client';

import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { FaShieldAlt, FaDatabase, FaInfoCircle } from 'react-icons/fa';

interface GroundTruthResult {
  source: string;
  data: string;
  confidence: number;
}

interface SurgicalIntelligenceOverlaysProps {
  property: any;
  isNeuralMode?: boolean;
}

const SurgicalIntelligenceOverlays: React.FC<SurgicalIntelligenceOverlaysProps> = ({ 
  property, 
  isNeuralMode = false 
}) => {
  const [intel, setIntel] = useState<GroundTruthResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isNeuralMode && property?.location?.city) {
      const fetchIntel = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/intelligence/ground-truth?query=${encodeURIComponent(property.location.city)}`);
          if (res.ok) {
            const data = await res.json();
            setIntel(data.data || []);
          }
        } catch (err) {
          console.error('Failed to fetch ground truth:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchIntel();
    }
  }, [isNeuralMode, property?.location?.city]);

  if (!isNeuralMode || intel.length === 0) return null;

  return (
    <group>
      {intel.map((item, index) => (
        <Html 
          key={index}
          position={[
            Math.cos(index * 2) * 12, 
            18 + index * 4, 
            Math.sin(index * 2) * 12
          ]}
          center
          distanceFactor={20}
        >
          <div className="flex flex-col gap-1.5 pointer-events-none select-none">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-blue-500/30 px-3 py-1.5 rounded-lg shadow-2xl">
              <div className="text-blue-400">
                {item.source.includes('COURT') ? <FaShieldAlt size={10} /> : 
                 item.source.includes('VAULT') ? <FaDatabase size={10} /> : 
                 <FaInfoCircle size={10} />}
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-blue-500/60">
                  {item.source}_DATA_STREAM
                </span>
                <span className="text-[9px] font-medium text-white/90 max-w-[200px] leading-relaxed">
                  {item.data}
                </span>
              </div>
            </div>
            {/* Connection Line */}
            <div className="w-px h-8 bg-gradient-to-b from-blue-500/50 to-transparent self-center" />
          </div>
        </Html>
      ))}
    </group>
  );
};

export default SurgicalIntelligenceOverlays;
