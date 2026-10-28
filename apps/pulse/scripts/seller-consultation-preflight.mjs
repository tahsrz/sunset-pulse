import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

async function readRows(env, table, params, fetcher) {
  try {
    const url = new URL(`/rest/v1/${table}`, env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL);
    url.search = new URLSearchParams(params).toString();
    const response = await fetcher(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows.every(row => row && typeof row === 'object') ? rows.slice(0, 20) : null;
  } catch { return null; }
}

export async function inspectLocalScheduler(databaseUrl) {
  if (!databaseUrl) return { state: 'not_configured' };
  let url;
  try { url = new URL(databaseUrl); } catch { return { state: 'invalid_configuration' }; }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return { state: 'skipped_nonlocal_database' };
  let prisma;
  try {
    const { PrismaClient } = await import('../lib/generated/prisma/index.js');
    url.searchParams.set('connect_timeout', '5');
    prisma = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });
    const rows = await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return tx.eventType.findMany({ where: { OR: [{ slug: { contains: 'consult', mode: 'insensitive' } }, { title: { contains: 'consult', mode: 'insensitive' } }] }, select: { slug: true, length: true }, take: 20 });
    }, { maxWait: 2000, timeout: 5000 });
    return { state: 'inspected', consultationEventTypes: rows.map(row => ({ slug: row.slug, durationMinutes: row.length })) };
  } catch (error) {
    const reason = ['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'].includes(error?.code) ? 'client_not_generated'
      : error?.code === 'P1001' ? 'connection_unavailable'
      : error?.code === 'P1000' ? 'authentication_failed'
      : error?.code === 'P2021' ? 'schema_missing' : 'query_unavailable';
    return { state: 'unavailable', reason };
  }
  finally { await prisma?.$disconnect().catch(() => {}); }
}

/** Reads public scheduling configuration only. It never seeds or reserves. */
export async function inspectSellerConsultationConfiguration({ env, fetcher = fetch, includeLocalDb = false, localInspector = inspectLocalScheduler }) {
  const site = env.KELLER_WESTLAKE_AGENT_SITE?.trim().toLowerCase();
  const agentId = env.NEXT_PUBLIC_DEFAULT_AGENT_ID || env.DEFAULT_AGENT_ID || 'taz-realty-001';
  const report = {
    reservationAuthority: 'not_verified',
    selection: site ? 'configured_site' : env.NEXT_PUBLIC_DEFAULT_AGENT_ID || env.DEFAULT_AGENT_ID ? 'configured_agent' : 'fallback_agent',
    sellerSiteConfigured: Boolean(site),
    siteProfile: { state: 'not_inspected' },
    schedulingOwner: { state: 'not_inspected' },
    ownedConsultationEventTypes: { state: 'not_inspected' },
    localScheduler: { state: includeLocalDb ? 'not_inspected' : 'skipped' },
  };
  if ((site && !/^[a-z0-9-]{1,80}$/.test(site)) || !/^[a-z0-9_-]{1,120}$/i.test(agentId)) {
    report.siteProfile = { state: 'invalid_configuration' };
    return report;
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY && (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL)) {
    const params = { select: 'agent_id,status,agent_profile,integration_profile', limit: '2' };
    if (site) params.or = `(subdomain.eq.${site},agent_id.eq.${site},agent_id.eq.${site}-site)`;
    else params.agent_id = `eq.${agentId}`;
    const profiles = await readRows(env, 'site_config', params, fetcher);
    report.siteProfile = { state: profiles === null ? 'unavailable' : profiles.length === 0 ? 'not_found' : profiles.length > 1 ? 'ambiguous' : 'inspected' };
    if (profiles?.length === 1) {
      const profile = profiles[0];
      const calendarUrl = profile.integration_profile?.calendarUrl;
      report.siteProfile = { state: 'inspected', active: profile.status === 'active', calendarLinkPresent: typeof calendarUrl === 'string' && Boolean(calendarUrl.trim()) };
      const email = profile.agent_profile?.email;
      if (typeof email === 'string' && email.length <= 180) {
        const owners = await readRows(env, 'scheduling_users', { select: 'id,time_zone', email: `eq.${email}`, limit: '2' }, fetcher);
        report.schedulingOwner = { state: owners === null ? 'unavailable' : owners.length === 1 ? 'inspected' : owners.length === 0 ? 'not_found' : 'ambiguous' };
        const ownerId = owners?.length === 1 ? owners[0].id : null;
        if (typeof ownerId === 'string' && /^[0-9a-f-]{36}$/i.test(ownerId)) {
          const events = await readRows(env, 'scheduling_event_types', { select: 'slug,length_minutes,schedule_id,time_zone', owner_id: `eq.${ownerId}`, slug: 'ilike.*consult*', limit: '20' }, fetcher);
          report.ownedConsultationEventTypes = events === null ? { state: 'unavailable' } : {
            state: 'inspected', eventTypes: events.map(event => ({ slug: event.slug, durationMinutes: event.length_minutes, schedulePresent: Boolean(event.schedule_id), timeZone: event.time_zone || null })),
          };
        }
      }
    }
  } else report.siteProfile = { state: 'missing_read_credentials' };
  if (includeLocalDb) report.localScheduler = await localInspector(env.DATABASE_URL);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--env-file');
  const file = fileIndex >= 0 ? args[fileIndex + 1] : null;
  if (fileIndex >= 0 && (!file || file.startsWith('--'))) throw new Error('Provide an environment file path after --env-file.');
  const env = { ...process.env, ...(file ? dotenv.parse(fs.readFileSync(file)) : {}) };
  console.log(JSON.stringify(await inspectSellerConsultationConfiguration({ env, includeLocalDb: args.includes('--include-local-db') }), null, 2));
}
