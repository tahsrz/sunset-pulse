import { useState, useEffect, useCallback } from 'react';

export const useStudio = () => {
  const [step, setStep] = useState(1);
  const [availableClips, setAvailableClips] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [renderQueue, setRenderQueue] = useState<any[]>([]);
  const [extractedEntity, setExtractedEntity] = useState<any>(null);
  const [targetScene, setTargetScene] = useState<string>('');
  const [tacticalText, setTacticalText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('Jamie');
  const [clonedVoices, setClonedVoices] = useState<{id: string, name: string, sampleUrl?: string}[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cloned_voices');
    if (saved) setClonedVoices(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (clonedVoices.length > 0) {
      localStorage.setItem('cloned_voices', JSON.stringify(clonedVoices));
    }
  }, [clonedVoices]);

  const [selectedLead, setSelectedLead] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const [transform, setTransform] = useState({ 
    x: 0, y: 0, scale: 1, 
    maskRadius: 80, maskFeather: 20, 
    brightness: 110, contrast: 120 
  });

  const [compositing, setCompositing] = useState({
    blendMode: 'normal',
    vibePreset: 'none',
    motionPath: 'none',
    opacity: 100
  });

  const [audioConfig, setAudioConfig] = useState({
    backgroundTrack: '/audio/intro.mp3',
    backgroundVolume: 30,
    subjectVolume: 100,
    isMuted: false
  });

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.data) setLeads(data.data);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/render/queue');
      const data = await res.json();
      if (data.data) setRenderQueue(data.data);
    } catch (err) {
      console.error("Failed to fetch queue:", err);
    }
  }, []);

  const handleHarvest = useCallback(async () => {
    setIsHarvesting(true);
    try {
      const res = await fetch('/api/admin/harvest', { method: 'POST' });
      const data = await res.json();
      if (data.discovered) setAvailableClips(data.discovered);
    } catch (err) {
      console.error("Harvest Failed:", err);
    }
    setIsHarvesting(false);
  }, []);

  useEffect(() => {
    handleHarvest();
    fetchLeads();
    fetchQueue();
  }, [handleHarvest, fetchLeads, fetchQueue]);

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Are you sure you want to purge this asset?')) return;
    try {
      const res = await fetch(`/api/admin/library?id=${id}`, { method: 'DELETE' });
      if (res.ok) setAvailableClips(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      console.error("Purge Failed:", err);
    }
  };

  return {
    step, setStep,
    availableClips, setAvailableClips,
    leads, renderQueue,
    extractedEntity, setExtractedEntity,
    targetScene, setTargetScene,
    tacticalText, setTacticalText,
    selectedVoice, setSelectedVoice,
    clonedVoices, setClonedVoices,
    selectedLead, setSelectedLead,
    isProcessing, setIsProcessing,
    isHarvesting, isAcquiring, setIsAcquiring,
    isRendering, setIsRendering,
    transform, setTransform,
    compositing, setCompositing,
    audioConfig, setAudioConfig,
    fetchQueue, handleHarvest, handleDeleteAsset
  };
};
