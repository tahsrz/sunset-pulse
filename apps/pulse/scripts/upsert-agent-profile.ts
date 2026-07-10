import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  defaultAgentProfile,
  defaultAssistantProfile,
  defaultComplianceProfile,
  defaultIntegrationProfile,
  getDefaultAgentId,
  mergeAgentProfile,
  mergeAssistantProfile,
  mergeComplianceProfile,
  mergeIntegrationProfile,
  normalizeAgentId,
} from '@/lib/sites/agentConfig';

type CliArgs = Record<string, string | boolean>;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const agentId = normalizeAgentId(stringArg(args, 'agent-id') || stringArg(args, 'agentId')) || getDefaultAgentId();
  const siteName = stringArg(args, 'site-name') || stringArg(args, 'siteName') || 'Sunset Pulse';
  const assistantName = stringArg(args, 'assistant') || stringArg(args, 'assistant-name') || defaultAssistantProfile.displayName;
  const agentName = stringArg(args, 'name') || defaultAgentProfile.displayName;
  const brokerage = stringArg(args, 'brokerage') || defaultAgentProfile.brokerageName;
  const email = stringArg(args, 'email') || defaultAgentProfile.email;
  const phone = stringArg(args, 'phone') || defaultAgentProfile.phone;
  const markets = csvArg(args, 'markets') || defaultAgentProfile.markets;
  const hotListMlsIds = csvArg(args, 'hot-list') || csvArg(args, 'hotListMlsIds') || defaultIntegrationProfile.hotListMlsIds;
  const primaryColor = stringArg(args, 'primary-color') || stringArg(args, 'primaryColor') || '#3b82f6';
  const subdomain = normalizeAgentId(stringArg(args, 'subdomain'));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const agentProfile = mergeAgentProfile({
    displayName: agentName,
    brokerageName: brokerage,
    email,
    phone,
    markets,
  });

  const assistantProfile = mergeAssistantProfile({
    displayName: assistantName,
    placeholder: `Ask ${assistantName}...`,
    toolActionLabel: `${assistantName} action`,
  });

  const complianceProfile = mergeComplianceProfile({
    jurisdiction: stringArg(args, 'jurisdiction') || defaultComplianceProfile.jurisdiction,
  });

  const integrationProfile = mergeIntegrationProfile({
    leadEmail: stringArg(args, 'lead-email') || stringArg(args, 'leadEmail') || email || defaultIntegrationProfile.leadEmail,
    crmTag: stringArg(args, 'crm-tag') || stringArg(args, 'crmTag') || agentId,
    hotListMlsIds,
  });

  const payload = {
    agent_id: agentId,
    owner_name: agentName,
    subdomain,
    status: stringArg(args, 'status') || 'active',
    subscription_tier: stringArg(args, 'tier') || 'site',
    branding: {
      siteName,
      primaryColor,
      fontFamily: stringArg(args, 'font') || 'Inter',
      borderRadius: '12px',
    },
    hero: {
      title: stringArg(args, 'hero-title') || `${agentName}'s local home search`,
      subtitle: stringArg(args, 'hero-subtitle') || `Listings, tours, and market context powered by ${assistantName}.`,
    },
    agent_profile: agentProfile,
    assistant_profile: assistantProfile,
    compliance_profile: complianceProfile,
    integration_profile: integrationProfile,
    last_modified_by: 'agent-profile-upsert-script',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('site_config')
    .upsert(payload, { onConflict: 'agent_id' })
    .select('agent_id, owner_name, branding, agent_profile, assistant_profile, integration_profile')
    .single();

  if (error) {
    throw new Error(`Failed to upsert agent profile: ${error.message}`);
  }

  console.log(JSON.stringify({ ok: true, profile: data }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function parseArgs(values: string[]): CliArgs {
  return values.reduce<CliArgs>((acc, arg) => {
    if (!arg.startsWith('--')) return acc;
    const [rawKey, ...rest] = arg.slice(2).split('=');
    const key = rawKey.trim();
    acc[key] = rest.length ? rest.join('=').trim() : true;
    return acc;
  }, {});
}

function stringArg(args: CliArgs, key: string) {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function csvArg(args: CliArgs, key: string) {
  const value = stringArg(args, key);
  if (!value) return undefined;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}
