import { supabaseAdmin } from '@/lib/supabase';
import {
  type AgentProfile,
  type AssistantProfile,
  type ComplianceProfile,
  type IntegrationProfile,
  getDefaultAgentId,
  mergeAgentProfile,
  mergeAssistantProfile,
  mergeComplianceProfile,
  mergeIntegrationProfile,
} from '@/lib/sites/agentConfig';

export type ActiveSiteProfiles = {
  agentId: string;
  agentProfile: AgentProfile;
  assistantProfile: AssistantProfile;
  complianceProfile: ComplianceProfile;
  integrationProfile: IntegrationProfile;
  branding: Record<string, any>;
};

export async function getActiveSiteProfiles(agentId = getDefaultAgentId()): Promise<ActiveSiteProfiles> {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_config')
      .select('agent_id, branding, agent_profile, assistant_profile, compliance_profile, integration_profile')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) {
      console.warn('[SITE_PROFILES_LOOKUP]', error.message);
    }

    return {
      agentId: data?.agent_id || agentId,
      branding: data?.branding || {},
      agentProfile: mergeAgentProfile(data?.agent_profile),
      assistantProfile: mergeAssistantProfile(data?.assistant_profile),
      complianceProfile: mergeComplianceProfile(data?.compliance_profile),
      integrationProfile: mergeIntegrationProfile(data?.integration_profile),
    };
  } catch (error) {
    console.warn('[SITE_PROFILES_FALLBACK]', error);
    return {
      agentId,
      branding: {},
      agentProfile: mergeAgentProfile(),
      assistantProfile: mergeAssistantProfile(),
      complianceProfile: mergeComplianceProfile(),
      integrationProfile: mergeIntegrationProfile(),
    };
  }
}

