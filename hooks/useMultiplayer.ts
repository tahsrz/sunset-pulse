import { useEffect, useState, useRef } from 'react';
import Pusher from 'pusher-js';

export const useMultiplayer = (user: string, initialPos: any) => {
  const [peers, setPeers] = useState<any>({});
  const [leadId, setLeadId] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!key) {
      console.warn('⚠️ [MULTIPLAYER] Pusher key missing. Synchronous ghosting disabled.');
      return;
    }

    const pusher = new Pusher(key, {
      cluster: 'mt1',
      authEndpoint: '/api/pusher/auth',
    });

    const channel = pusher.subscribe('presence-house-tour');
    channelRef.current = channel;

    // Listen for peer movement (Ghost Spatial Search) WIP
    channel.bind('client-move', (data: any) => {
      if (data.user !== user) {
        setPeers((prev: any) => ({ ...prev, [data.user]: { pos: data.pos, rot: data.rot, isLead: data.isLead } }));
        if (data.isLead) {
          setLeadId(data.user);
        }
      }
    });

    // Listen for lead announcements
    channel.bind('client-lead-announce', (data: any) => {
      if (data.user !== user) {
        setLeadId(data.user);
      }
    });

    return () => {
      pusher.unsubscribe('presence-house-tour');
      channelRef.current = null;
    };
  }, [user]);

  const sendUpdate = (pos: any, rot: any, isLead: boolean) => {
    if (channelRef.current) {
      try {
        channelRef.current.trigger('client-move', { user, pos, rot, isLead });
      } catch (e) {
        // Ignored for now without permissions
      }
    }
  };

  const announceLead = () => {
    if (channelRef.current) {
      try {
        channelRef.current.trigger('client-lead-announce', { user });
        setLeadId(user);
      } catch (e) {
        console.error('Lead announcement failed', e);
      }
    }
  };

  return { 
    peers, 
    sendUpdate, 
    announceLead, 
    leadId, 
    isMeLead: leadId === user,
    presentationMode,
    setPresentationMode
  };
};
