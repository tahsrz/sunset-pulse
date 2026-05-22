import { useRef, useCallback, useState } from 'react';
import { Mesh3D } from '@/lib/visualization/engine/renderer';
import { generateRingModel } from '@/lib/visualization/engine/generator';
import { Vector } from '@/lib/visualization/engine/math';
import { toast } from 'react-toastify';

export interface RingData {
  x: number;
  y: number;
  z: number;
  r: number;
  id: string;
}

export interface RingMesh {
  mesh: Mesh3D;
  data: RingData;
}

export const useTrainingCourse = () => {
  const [level, setLevel] = useState(1);
  const ringMeshesRef = useRef<RingMesh[]>([]);
  const ringsPassedRef = useRef<Set<string>>(new Set());

  const initRings = useCallback((currentLevel: number = level) => {
    const ringData: RingData[] = [];
    const ringCount = 5 + currentLevel;
    const spacing = 50;
    
    // Reset passed rings for the new course
    ringsPassedRef.current.clear();

    for (let i = 0; i < ringCount; i++) {
      // Create a wavy, long hallway path that gets more complex with level
      const complexity = Math.min(currentLevel * 2, 30);
      ringData.push({
        x: Math.sin(i * 0.5 + currentLevel) * complexity, 
        y: 20 + Math.cos(i * 0.3 + currentLevel) * (complexity * 0.5), 
        z: -50 + (i * spacing), 
        r: Math.max(18 - (currentLevel * 0.5), 8), // Rings get smaller as level increases
        id: `ring-${currentLevel}-${i}`
      });
    }

    ringMeshesRef.current = ringData.map(rd => ({
      mesh: Mesh3D.loadFromRaw(generateRingModel(rd.x, rd.y, rd.z, rd.r), { r: 59, g: 130, b: 246 }), 
      data: rd
    }));

    toast.info(`Level ${currentLevel} Initialized: ${ringCount} Checkpoints`, {
      position: "top-center",
      autoClose: 2000,
      theme: "dark"
    });
  }, [level]);

  const checkProximity = useCallback((pos: Vector) => {
    let newlyPassed = false;
    
    ringMeshesRef.current.forEach(rm => {
      const isPassed = ringsPassedRef.current.has(rm.data.id);
      const distToCenter = Math.sqrt(
        Math.pow(pos.x - rm.data.x, 2) + 
        Math.pow(pos.y - rm.data.y, 2) + 
        Math.pow(pos.z - rm.data.z, 2)
      );

      if (!isPassed && distToCenter < rm.data.r) {
        ringsPassedRef.current.add(rm.data.id);
        newlyPassed = true;
        
        toast.success("Checkpoint Cleared!", { 
          position: "top-right", 
          autoClose: 800, 
          hideProgressBar: true,
          theme: "dark"
        });
      }
    });

    // Check if course is complete
    if (newlyPassed && ringsPassedRef.current.size === ringMeshesRef.current.length) {
      toast.success("COURSE COMPLETE! LEVELING UP...", {
        position: "top-center",
        autoClose: 3000,
        theme: "dark"
      });
      
      const nextLevel = level + 1;
      setLevel(nextLevel);
      initRings(nextLevel);
    }
  }, [level, initRings]);

  return {
    level,
    ringMeshesRef,
    ringsPassedRef,
    initRings,
    checkProximity
  };
};
