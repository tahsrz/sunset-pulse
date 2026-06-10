'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Bookmark,
  Bot,
  Calculator,
  Compass,
  Loader2,
  Lock,
  Map,
  MessageCircle,
  Network,
  Radio,
  Search,
  Users,
  Video
} from 'lucide-react';
import {
  WORLD_ENDPOINTS,
  WORLD_QUERY_LAUNCHES,
  type WorldEndpoint,
  type WorldEndpointIcon
} from '@/lib/world/endpointRegistry';

type PreviewState = {
  status: 'idle' | 'loading' | 'ready' | 'locked' | 'error';
  metric: string;
  detail: string;
  meta?: string;
};

const iconMap: Record<WorldEndpointIcon, React.ComponentType<{ size?: number; className?: string }>> = {
  search: Search,
  radio: Radio,
  archive: Archive,
  atlas: Network,
  valuation: Calculator,
  saved: Bookmark,
  leads: Users,
  messages: MessageCircle,
  jamie: Bot,
  studio: Video,
  anomaly: AlertTriangle
};

function getPayloadData(payload: any) {
  return payload?.data ?? payload;
}

function countFrom(value: any): number | null {
  if (Array.isArray(value)) return value.length;
  if (typeof value?.count === 'number') return value.count;
  if (Array.isArray(value?.listings)) return value.listings.length;
  if (Array.isArray(value?.cartridges)) return value.cartridges.length;
  if (Array.isArray(value?.nodes)) return value.nodes.length;
  if (Array.isArray(value?.domains)) return value.domains.length;
  if (Array.isArray(value?.items)) return value.items.length;
  return null;
}

function summarizePreview(endpoint: WorldEndpoint, payload: any, response: Response): PreviewState {
  if (response.status === 401) {
    return {
      status: 'locked',
      metric: 'Login required',
      detail: endpoint.fallbackDetail,
      meta: endpoint.apiPath
    };
  }

  if (!response.ok) {
    return {
      status: 'error',
      metric: endpoint.fallbackMetric,
      detail: payload?.message || payload?.error || endpoint.fallbackDetail,
      meta: endpoint.apiPath
    };
  }

  const data = getPayloadData(payload);
  const count = countFrom(data);

  switch (endpoint.id) {
    case 'property-grid':
      return {
        status: 'ready',
        metric: count === null ? 'Listings available' : `${count} listings sampled`,
        detail: 'Ready to expand into browse, search, and property detail pages.',
        meta: endpoint.apiPath
      };
    case 'idx-hot-moving':
      return {
        status: 'ready',
        metric: `${count ?? data?.count ?? 0} active listings`,
        detail: data?.sector || 'Live IDX feed connected.',
        meta: endpoint.apiPath
      };
    case 'tah-archive':
      return {
        status: 'ready',
        metric: `${count ?? 0} cartridges`,
        detail: data?.status === 'ready' ? 'TAH archive is ready for query routing.' : endpoint.fallbackDetail,
        meta: endpoint.apiPath
      };
    case 'atlas':
      return {
        status: 'ready',
        metric: count === null ? 'Manifest loaded' : `${count} atlas nodes`,
        detail: data?.published ? 'Published atlas manifest is active.' : 'Runtime atlas manifest is available.',
        meta: endpoint.apiPath
      };
    case 'valuation':
      return {
        status: 'ready',
        metric: count === null ? 'Valuation data' : `${count} confirmed valuations`,
        detail: 'Confirmed valuations can support the map and estimate workflow.',
        meta: endpoint.apiPath
      };
    case 'saved-assets':
      return {
        status: 'ready',
        metric: `${count ?? 0} saved properties`,
        detail: 'Authenticated watchlist is connected.',
        meta: endpoint.apiPath
      };
    case 'lead-command':
      return {
        status: 'ready',
        metric: `${count ?? 0} leads`,
        detail: 'Lead management is connected.',
        meta: endpoint.apiPath
      };
    case 'messages':
      return {
        status: 'ready',
        metric: `${data?.count ?? 0} unread`,
        detail: 'Message relay status is connected.',
        meta: endpoint.apiPath
      };
    case 'jamie-briefing':
      return {
        status: 'ready',
        metric: payload?.title || payload?.summary?.title || 'Summary available',
        detail: payload?.timestamp ? `Updated ${new Date(payload.timestamp).toLocaleDateString()}` : 'Jamie summary endpoint responded.',
        meta: endpoint.apiPath
      };
    default:
      return {
        status: 'ready',
        metric: count === null ? endpoint.fallbackMetric : `${count} records`,
        detail: endpoint.fallbackDetail,
        meta: endpoint.apiPath
      };
  }
}

function PortalNode({
  endpoint,
  active,
  onSelect
}: {
  endpoint: WorldEndpoint;
  active: boolean;
  onSelect: (endpoint: WorldEndpoint) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.35;
      meshRef.current.rotation.x = Math.sin(t * 0.6) * 0.12;
      const targetScale = active ? 1.26 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * (active ? 0.8 : 0.35);
      ringRef.current.rotation.x = Math.PI / 2;
    }
  });

  return (
    <group position={endpoint.position}>
      <Float speed={1.7} rotationIntensity={0.14} floatIntensity={0.32}>
        <mesh
          ref={meshRef}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(endpoint);
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = '';
          }}
        >
          <icosahedronGeometry args={[0.52, 1]} />
          <meshStandardMaterial
            color={endpoint.color}
            emissive={endpoint.color}
            emissiveIntensity={active ? 1.25 : 0.55}
            roughness={0.32}
            metalness={0.28}
          />
        </mesh>
        <mesh ref={ringRef}>
          <torusGeometry args={[0.88, active ? 0.026 : 0.014, 12, 72]} />
          <meshBasicMaterial color={endpoint.color} transparent opacity={active ? 0.86 : 0.34} />
        </mesh>
        <pointLight color={endpoint.color} intensity={active ? 2.4 : 0.92} distance={5} />
      </Float>
    </group>
  );
}

function WorldFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.58, 0]}>
        <circleGeometry args={[6.25, 96]} />
        <meshStandardMaterial color="#07141f" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}>
        <ringGeometry args={[1.1, 6.2, 96]} />
        <meshBasicMaterial color="#3fb7a3" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.52, 0]}>
        <ringGeometry args={[3.2, 3.24, 96]} />
        <meshBasicMaterial color="#f6d365" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CameraFocus() {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}

function WorldScene({
  activeEndpoint,
  onSelect,
  onContextLost
}: {
  activeEndpoint: WorldEndpoint;
  onSelect: (endpoint: WorldEndpoint) => void;
  onContextLost: (event: any) => void;
}) {
  return (
    <div className="virtual-world-canvas-frame absolute inset-0 h-full w-full">
      <Canvas
        data-testid="virtual-world-canvas"
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        camera={{ position: [0, 3.4, 8.6], fov: 48 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', onContextLost, false);
        }}
      >
      <color attach="background" args={['#06111c']} />
      <PerspectiveCamera makeDefault position={[0, 3.4, 8.6]} fov={48} />
      <CameraFocus />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.22}
        target={[0, 0, 0]}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.08}
      />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} color="#fff7dd" />
      <pointLight position={[-4, 2, 2]} intensity={1.2} color="#3fb7a3" />
      <pointLight position={[4, 2, -2]} intensity={1.1} color="#b8a7ff" />
      <Suspense fallback={null}>
        <Stars radius={28} depth={18} count={450} factor={3} saturation={0.15} fade speed={0.35} />
        <WorldFloor />
        {WORLD_ENDPOINTS.map((endpoint) => (
          <PortalNode
            key={endpoint.id}
            endpoint={endpoint}
            active={endpoint.id === activeEndpoint.id}
            onSelect={onSelect}
          />
        ))}
      </Suspense>
      </Canvas>
    </div>
  );
}

const VirtualWorldHub: React.FC = () => {
  const router = useRouter();
  const [activeId, setActiveId] = useState(WORLD_ENDPOINTS[0].id);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});
  const [isDeparting, setIsDeparting] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const requestedPreviewIds = useRef<Set<string>>(new Set());

  const handleContextLost = (event: any) => {
    event.preventDefault();
    console.warn('[WEBGL_CONTEXT_LOST] Virtual World Hub context lost.');
    setContextLost(true);
  };

  const activeEndpoint = useMemo(
    () => WORLD_ENDPOINTS.find((endpoint) => endpoint.id === activeId) || WORLD_ENDPOINTS[0],
    [activeId]
  );
  const activePreview = previews[activeEndpoint.id] || {
    status: activeEndpoint.previewUrl ? 'idle' : 'ready',
    metric: activeEndpoint.fallbackMetric,
    detail: activeEndpoint.fallbackDetail,
    meta: activeEndpoint.apiPath
  };
  const ActiveIcon = iconMap[activeEndpoint.icon];

  useEffect(() => {
    if (!activeEndpoint.previewUrl || requestedPreviewIds.current.has(activeEndpoint.id)) return;

    const controller = new AbortController();
    const requestedIds = requestedPreviewIds.current;
    let settled = false;
    requestedIds.add(activeEndpoint.id);

    setPreviews((current) => ({
      ...current,
      [activeEndpoint.id]: {
        status: 'loading',
        metric: 'Loading preview',
        detail: activeEndpoint.fallbackDetail,
        meta: activeEndpoint.apiPath
      }
    }));

    fetch(activeEndpoint.previewUrl, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        settled = true;
        setPreviews((current) => ({
          ...current,
          [activeEndpoint.id]: summarizePreview(activeEndpoint, payload, response)
        }));
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        settled = true;
        setPreviews((current) => ({
          ...current,
          [activeEndpoint.id]: {
            status: 'error',
            metric: activeEndpoint.fallbackMetric,
            detail: activeEndpoint.fallbackDetail,
            meta: activeEndpoint.apiPath
          }
        }));
      });

    return () => {
      controller.abort();
      if (!settled) requestedIds.delete(activeEndpoint.id);
    };
  }, [activeEndpoint]);

  const departTo = (route: string) => {
    setIsDeparting(true);
    window.setTimeout(() => {
      router.push(route);
    }, 420);
  };

  return (
    <section
      id="pulse-world"
      className="relative overflow-hidden bg-[#081824] py-20 text-white"
      aria-label="Sunset Pulse platform map"
    >
      <div className={`absolute inset-0 bg-grid-pattern opacity-[0.08] transition-opacity duration-500 ${isDeparting ? 'opacity-30' : ''}`} />
      <div className={`relative mx-auto max-w-7xl px-6 transition-all duration-500 ${isDeparting ? 'scale-[0.985] opacity-60' : 'scale-100 opacity-100'}`}>
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-teal-200/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-100">
              <Compass size={14} />
              Platform Map
            </div>
            <h2 className="text-3xl font-black uppercase italic md:text-5xl">
              Platform Map
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-teal-50/70 md:text-base">
              A visual map of the core product areas: property search, IDX, Atlas, TAH, valuation,
              saved properties, lead management, messages, Jamie, Studio, and market alerts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => departTo(activeEndpoint.route)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black uppercase text-slate-950 transition hover:bg-teal-100 lg:w-auto"
          >
            Open {activeEndpoint.label}
            <ArrowRight size={17} />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="relative h-[640px] overflow-hidden rounded-lg border border-white/10 bg-[#06111c] shadow-2xl shadow-black/30">
            <div className="absolute left-4 top-4 z-10 rounded-lg border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
              <p className="text-xs font-semibold text-teal-100/70">Selected Area</p>
              <p className="mt-1 text-lg font-black">{activeEndpoint.district}</p>
            </div>
            
            {contextLost ? (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-lg">
                <p className="text-teal-100 font-black uppercase tracking-widest text-xs mb-4 opacity-70">Topographic Context Lost</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-teal-400 text-slate-950 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-teal-300 transition-all shadow-xl shadow-teal-900/20"
                >
                  Re-initialize World
                </button>
              </div>
            ) : (
              <WorldScene 
                activeEndpoint={activeEndpoint} 
                onSelect={(endpoint) => setActiveId(endpoint.id)} 
                onContextLost={handleContextLost}
              />
            )}

            <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/30 p-4 backdrop-blur-md">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                {WORLD_QUERY_LAUNCHES.map((query) => (
                  <button
                    key={query.label}
                    type="button"
                    onClick={() => departTo(query.route)}
                    className="min-h-16 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-left transition hover:border-teal-200/40 hover:bg-teal-300/10"
                  >
                    <span className="block text-[11px] font-bold text-teal-100">{query.intent}</span>
                    <span className="mt-1 block text-xs leading-4 text-white/70">{query.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-white/10 bg-white/[0.075] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/20"
                    style={{ backgroundColor: activeEndpoint.glow, color: activeEndpoint.color }}
                  >
                    <ActiveIcon size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/60">{activeEndpoint.district}</p>
                    <h3 className="text-2xl font-black">{activeEndpoint.label}</h3>
                  </div>
                </div>
                {activeEndpoint.authRequired && (
                  <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/70">
                    <Lock size={12} />
                    Auth
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm leading-6 text-white/70">{activeEndpoint.description}</p>

              <div className="mt-5 rounded-lg border border-white/10 bg-black/24 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-white/50">{activePreview.meta || activeEndpoint.apiPath || 'workflow'}</p>
                  {activePreview.status === 'loading' && <Loader2 size={14} className="animate-spin text-teal-200" />}
                </div>
                <p className="mt-2 text-xl font-black text-white">{activePreview.metric}</p>
                <p className="mt-2 text-sm leading-5 text-white/60">{activePreview.detail}</p>
              </div>

              <button
                type="button"
                onClick={() => departTo(activeEndpoint.route)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black uppercase text-white transition hover:brightness-110"
                style={{ backgroundColor: activeEndpoint.color, boxShadow: `0 18px 44px ${activeEndpoint.glow}` }}
              >
                Open {activeEndpoint.label}
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WORLD_ENDPOINTS.map((endpoint) => {
                const Icon = iconMap[endpoint.icon];
                const isActive = endpoint.id === activeEndpoint.id;

                return (
                  <button
                    key={endpoint.id}
                    type="button"
                    onClick={() => setActiveId(endpoint.id)}
                    className={`flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition ${
                      isActive
                        ? 'border-white/30 bg-white/[0.15]'
                        : 'border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.075]'
                    }`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: endpoint.glow, color: endpoint.color }}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{endpoint.label}</span>
                      <span className="block truncate text-xs text-white/50">{endpoint.apiPath || endpoint.method}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VirtualWorldHub;
