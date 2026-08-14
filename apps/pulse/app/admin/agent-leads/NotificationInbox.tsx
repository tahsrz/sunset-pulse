'use client';

import { Inbox } from '@novu/nextjs';
import { dark } from '@novu/nextjs/themes';
import type { NovuInboxConfig } from '@/lib/notifications/novuInbox';

export default function NotificationInbox({ config }: { config: NovuInboxConfig }) {
  const backendUrl = process.env.NEXT_PUBLIC_NOVU_BACKEND_URL?.trim();
  const socketUrl = process.env.NEXT_PUBLIC_NOVU_SOCKET_URL?.trim();

  return (
    <Inbox
      applicationIdentifier={config.applicationIdentifier}
      subscriberId={config.subscriberId}
      subscriberHash={config.subscriberHash}
      {...(backendUrl ? { backendUrl } : {})}
      {...(socketUrl ? { socketUrl } : {})}
      placement="bottom-end"
      appearance={{
        baseTheme: dark,
        variables: {
          colorBackground: '#020617',
          colorForeground: '#f8fafc',
          colorPrimary: '#67e8f9',
          colorPrimaryForeground: '#020617',
          colorSecondary: '#0f172a',
          colorSecondaryForeground: '#cbd5e1',
          colorCounter: '#67e8f9',
          colorCounterForeground: '#020617',
          colorNeutral: '#334155',
          colorRing: '#67e8f9',
          colorShadow: 'rgba(0, 0, 0, 0.45)',
          fontSize: '14px',
          borderRadius: '8px',
        },
        elements: {
          bellIcon: { color: '#a5f3fc' },
          inbox__popoverTrigger: {
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'inline-flex',
            height: '40px',
            justifyContent: 'center',
            width: '40px',
          },
          inbox__popoverContent: {
            border: '1px solid rgba(103, 232, 249, 0.2)',
          },
        },
      }}
    />
  );
}
