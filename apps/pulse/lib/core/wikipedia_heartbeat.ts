import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';

export type WikipediaHeartbeat = {
  crawlerId: string;
  status: string;
  updatedAt: string;
  payload: Record<string, unknown>;
};

export function isCrawlerHeartbeatValid(token: string | null) {
  const expected = process.env.PULSE_CRAWLER_HEARTBEAT_TOKEN || process.env.PULSE_HEARTBEAT_TOKEN;
  if (!expected || !token) return false;
  const actualBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function saveWikipediaHeartbeat(input: {
  crawlerId: string;
  status: string;
  payload: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from('crawler_heartbeats').upsert({
    crawler_id: input.crawlerId,
    status: input.status,
    updated_at: new Date().toISOString(),
    payload: input.payload,
  }, { onConflict: 'crawler_id' });
  if (error) throw error;
}

export async function readWikipediaHeartbeat(crawlerId = process.env.PULSE_CRAWLER_ID || 'wikipedia-en'): Promise<WikipediaHeartbeat | null> {
  const { data, error } = await supabaseAdmin
    .from('crawler_heartbeats')
    .select('crawler_id,status,updated_at,payload')
    .eq('crawler_id', crawlerId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    crawlerId: data.crawler_id,
    status: data.status,
    updatedAt: data.updated_at,
    payload: (data.payload || {}) as Record<string, unknown>,
  };
}

export async function issueWikipediaCrawlerControl(
  action: 'resume',
  crawlerId = process.env.PULSE_CRAWLER_ID || 'wikipedia-en',
) {
  const heartbeat = await readWikipediaHeartbeat(crawlerId);
  const requestedAt = new Date().toISOString();
  const payload = {
    ...(heartbeat?.payload || {}),
    control: { action, requestedAt },
  };
  const { error } = await supabaseAdmin.from('crawler_heartbeats').upsert({
    crawler_id: crawlerId,
    status: action === 'resume' ? 'resume_requested' : heartbeat?.status || 'unknown',
    updated_at: requestedAt,
    payload,
  }, { onConflict: 'crawler_id' });
  if (error) throw error;
  return { crawlerId, action, requestedAt };
}
