import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';

export const useMultiplayer = (user: string, initialPos: any) => {
  const [peers, setPeers] = useState<any>({});

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

    // Broadcast movement
    const sendUpdate = (pos: any) => {
      channel.trigger('client-move', { user, pos });
    };

    // Listen for peer movement
    channel.bind('client-move', (data: any) => {
      if (data.user !== user) {
        setPeers((prev: any) => ({ ...prev, [data.user]: data.pos }));
      }
    });

    return () => pusher.unsubscribe('presence-house-tour');
  }, [user]);

  return { peers };
};
