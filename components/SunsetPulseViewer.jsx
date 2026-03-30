'use client';
import { useEffect, useRef, useState } from 'react';
import { Vector, Matrix } from '@/utils/sunset-pulse-engine/math';
import { Renderer, Mesh3D } from '@/utils/sunset-pulse-engine/renderer';
import { generatePropertyModel } from '@/utils/sunset-pulse-engine/generator';

const SunsetPulseViewer = ({ objUrl, property }) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const rotationRef = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new Renderer(canvas);
    rendererRef.current = renderer;

    const loadMesh = async () => {
      try {
        let mesh;
        if (objUrl) {
          mesh = await Mesh3D.loadFromObj(objUrl);
        } else if (property) {
          const rawObj = generatePropertyModel(property);
          mesh = Mesh3D.loadFromRaw(rawObj);
        } else {
          mesh = Mesh3D.loadFromRaw('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4');
        }
        renderer.meshes = [mesh];
        setLoading(false);
      } catch (error) {
        console.error('Failed to load 3D model:', error);
        setLoading(false);
      }
    };

    loadMesh();

    let animationId;
    const renderLoop = () => {
      if (rendererRef.current && rendererRef.current.meshes.length > 0) {
        const cosY = Math.cos(rotationRef.current.yaw);
        const sinY = Math.sin(rotationRef.current.yaw);
        const cosP = Math.cos(rotationRef.current.pitch);
        const sinP = Math.sin(rotationRef.current.pitch);

        const rotMat = new Matrix(3, 3);
        rotMat.set(0, 0, cosY);
        rotMat.set(0, 2, sinY);
        rotMat.set(1, 1, cosP);
        rotMat.set(1, 2, sinP);
        rotMat.set(2, 0, -sinY);
        rotMat.set(2, 2, cosY);

        rendererRef.current.render(new Vector(0, 0, 0), rotMat);
        rotationRef.current.yaw += 0.01;
      }
      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      rendererRef.current = null;
    };
  }, [objUrl, property]);

  return (
    <div className='relative w-full h-[400px] bg-gradient-to-b from-gray-900 to-slate-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800'>
      {loading ? (
        <div className='absolute inset-0 flex items-center justify-center text-blue-400 font-mono text-sm animate-pulse'>
          [ INITIALIZING SUNSET PULSE V1.0.0... ]
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className='w-full h-full cursor-move'
          />
          <div className='absolute top-4 right-4 text-[10px] font-mono text-blue-500/50 tracking-widest uppercase pointer-events-none'>
            SUNSET PULSE V1.0.0 // SYSTEM ACTIVE
          </div>
          <div className='absolute bottom-4 left-4 text-[10px] font-mono text-gray-500/50 pointer-events-none'>
            {property?.name || 'GENERIC_UNIT_01'}
          </div>
        </>
      )}
    </div>
  );
};

export default SunsetPulseViewer;
