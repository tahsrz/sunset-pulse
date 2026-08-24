import { supabaseAdmin } from '@/lib/supabase';

type OutboxJob = {
  id: string;
  domain_id: string;
  operation: 'upsert' | 'remove' | 'rebuild';
  target_revision: number;
};

type DomainRow = {
  id: string;
  hostname: string;
  environment: string;
  revision: number;
  deleted_at: string | null;
  site_config: { id: string; agent_id: string; subdomain: string | null } | null;
};

const MANIFEST_KEY = 'domain-manifest';

export async function runDomainManifestWorker(limit = 10) {
  const worker = `vercel:${process.env.VERCEL_REGION || 'unknown'}:${crypto.randomUUID()}`;
  const { data: jobs, error: claimError } = await supabaseAdmin.rpc('claim_domain_manifest_outbox', {
    p_worker: worker,
    p_limit: Math.max(1, Math.min(limit, 25)),
    p_lease_seconds: 120,
  });
  if (claimError) throw new Error(`Domain manifest claim failed: ${claimError.message}`);

  const results: Array<{ id: string; status: 'succeeded' | 'failed'; error?: string }> = [];
  for (const job of (jobs || []) as OutboxJob[]) {
    try {
      const version = await publishJob(job);
      const { data: completed, error } = await supabaseAdmin.rpc('complete_domain_manifest_outbox', {
        p_outbox_id: job.id,
        p_worker: worker,
        p_edge_config_version: version,
      });
      if (error) throw new Error(`Completion failed: ${error.message}`);
      if (!completed) throw new Error('Completion lease was no longer owned by this worker.');
      results.push({ id: job.id, status: 'succeeded' });
    } catch (error) {
      await markRetryable(job.id, worker, error instanceof Error ? error.message : 'Unknown projection failure.');
      results.push({ id: job.id, status: 'failed', error: error instanceof Error ? error.message : 'Unknown projection failure.' });
    }
  }
  return { claimed: (jobs || []).length, results };
}

async function publishJob(job: OutboxJob) {
  const id = requiredEnv('PULSE_DOMAIN_PROJECTION_ID');
  const readToken = requiredEnv('PULSE_DOMAIN_PROJECTION_TOKEN');
  const writeToken = requiredEnv('VERCEL_API_TOKEN');
  const domain = await loadDomain(job.domain_id);
  const manifest = await readManifest(id, readToken);

  if (job.operation === 'remove' || !domain || domain.deleted_at) {
    if (domain) delete manifest[domain.hostname];
  } else {
    if (domain.revision !== job.target_revision) throw new Error('Domain revision changed before publication.');
    manifest[domain.hostname] = {
      tenantId: domain.site_config?.id,
      agentId: domain.site_config?.agent_id,
      environment: domain.environment,
      revision: domain.revision,
    };
  }

  const response = await fetch(`https://api.vercel.com/v1/edge-config/${id}/items`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${writeToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ operation: 'upsert', key: MANIFEST_KEY, value: manifest }] }),
  });
  if (!response.ok) throw new Error(`Edge Config write failed (${response.status}).`);
  const current = await response.json().catch(() => ({}));
  return typeof current.digest === 'string' ? current.digest : new Date().toISOString();
}

async function loadDomain(domainId: string): Promise<DomainRow | null> {
  const { data, error } = await supabaseAdmin.from('tenant_domains').select(`
    id, hostname, environment, revision, deleted_at,
    site_config (id, agent_id, subdomain)
  `).eq('id', domainId).maybeSingle();
  if (error) throw new Error(`Domain lookup failed: ${error.message}`);
  return data as DomainRow | null;
}

async function readManifest(id: string, token: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://edge-config.vercel.com/${id}/item/${MANIFEST_KEY}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (response.status === 404) return {};
  if (!response.ok) throw new Error(`Edge Config read failed (${response.status}).`);
  const value = await response.json();
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function markRetryable(id: string, worker: string, message: string) {
  await supabaseAdmin.from('domain_manifest_outbox').update({
    state: 'retryable', lease_owner: null, lease_expires_at: null,
    next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
    last_error: message, last_error_code: 'PROJECTION_FAILED', updated_at: new Date().toISOString(),
  }).eq('id', id).eq('state', 'processing').eq('lease_owner', worker);
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
