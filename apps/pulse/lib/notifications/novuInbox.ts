import 'server-only';

import { createHmac } from 'node:crypto';

export type NovuInboxConfig = {
  applicationIdentifier: string;
  subscriberId: string;
  subscriberHash: string;
};

export function getNovuInboxConfig(agentId: string): NovuInboxConfig | null {
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER?.trim();
  const secretKey = (process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY)?.trim();
  const normalizedAgentId = agentId.trim();

  if (!applicationIdentifier || !secretKey || !normalizedAgentId) return null;

  const subscriberId = `sunset-agent:${normalizedAgentId}`;
  return {
    applicationIdentifier,
    subscriberId,
    subscriberHash: createHmac('sha256', secretKey).update(subscriberId).digest('hex'),
  };
}
