import { errorResponse } from '@/lib/core/apiResponse';

export type VerifoneMode = 'mock' | 'live';

export const getVerifoneConfig = () => {
  const enabled = process.env.VERIFONE_ENABLED === 'true';
  const mode: VerifoneMode = process.env.VERIFONE_MODE === 'live' ? 'live' : 'mock';
  return { enabled, mode };
};

export const requireVerifoneEnabled = () => {
  const config = getVerifoneConfig();
  if (!config.enabled) {
    return errorResponse('Verifone is disabled. Set VERIFONE_ENABLED=true to enable.', 503);
  }
  return null;
};

export const requireVerifoneMode = (expectedMode: VerifoneMode) => {
  const config = getVerifoneConfig();
  if (config.mode !== expectedMode) {
    return errorResponse(`Verifone is in ${config.mode} mode; ${expectedMode} mode endpoint is disabled.`, 404);
  }
  return null;
};
