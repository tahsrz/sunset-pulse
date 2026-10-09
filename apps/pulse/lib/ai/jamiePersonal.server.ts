import 'server-only';

import { groq } from '@ai-sdk/groq';
import { generateText, stepCountIs } from 'ai';
import { sanitizeJamieReply } from '@/lib/ai/jamieResponse';
import { resolveJamieGroqModel } from '@/lib/ai/modelDefaults';
import { createJamiePersonalTools } from '@/lib/ai/jamieWorkspaceTools';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { jamiePersonalProposalSchema, jamiePersonalResponseSchema } from './jamiePersonalContract';

const PERSONAL_SYSTEM_PROMPT = `You are Jamie in the signed-in person's private realtor workspace.
Use tools for current agenda, seller attention, and business facts. Treat all values as private, manually recorded data. Received totals are before taxes; expected income is not received income.
You may prepare planner, financial, and goal drafts with the preparation tools. Preparation does not save anything. Never claim to have scheduled, contacted, sent, recorded, or saved something.
Ask for missing facts rather than inventing dates, recurrence, amounts, deductions, or client details. Do not repeat private amounts or client names unless the user asks in this private workspace.
Use only the supplied personal tools. Keep answers concise and offer one useful next step.`;

type Input = {
  actorId: string;
  workspaceId: string;
  timeZone: string;
  messages: Array<{ role: string; content: string }>;
  signal?: AbortSignal;
};

export async function runPersonalJamie(input: Input) {
  if (!process.env.GROQ_API_KEY) return unavailable('Personal Jamie is unavailable because its model provider is not configured. You can still use Today, Planner, and Business directly.');
  const access = await requirePersonalRealtorWorkspace(input.actorId);
  if (access.workspaceId !== input.workspaceId || access.preferences.time_zone !== input.timeZone) {
    return unavailable('Your personal workspace changed. Reload it and try again.');
  }
  const messages = input.messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-24)
    .map((message) => ({ role: message.role as 'user' | 'assistant', content: message.content.slice(0, 12_000) }));
  if (!messages.length) return unavailable('Send a message to start a private Jamie conversation.');

  try {
    const result = await generateText({
      model: groq(resolveJamieGroqModel(process.env.JAMIE_GROQ_MODEL)),
      system: `${PERSONAL_SYSTEM_PROMPT}\nSaved personal timezone: ${input.timeZone}. This is used only for date interpretation; ask for a date when it is missing.`,
      messages,
      tools: createJamiePersonalTools(input.actorId),
      stopWhen: stepCountIs(3),
      maxOutputTokens: 1200,
      abortSignal: AbortSignal.any([input.signal || new AbortController().signal, AbortSignal.timeout(20_000)]),
    });
    const proposals = collectProposals(result.steps);
    const called = new Set(result.steps.flatMap((step: any) => (step.toolResults || []).map((toolResult: any) => toolResult.toolName)));
    const availability = {
      agenda: called.has('read_personal_agenda'),
      business: called.has('read_personal_business_summary'),
      seller: called.has('read_personal_seller_attention'),
    };
    const raw = result.text || 'I could not prepare a response from the available personal workspace data. You can open Today, Planner, or Business directly.';
    const content = sanitizeJamieReply(raw).slice(0, 8_000);
    return jamiePersonalResponseSchema.parse({
      role: 'assistant', content,
      personal: { context: 'personal_realtor', proposals, availability,
        links: { today: '/today', planner: '/planner', business: '/business', inbox: '/admin/agent-leads' } },
    });
  } catch (error) {
    const timedOut = input.signal?.aborted || (error instanceof Error && /timeout|abort/i.test(error.message));
    return unavailable(timedOut
      ? 'Personal Jamie ran out of time before finishing. Your data was not changed; try a smaller question or use the workspace links.'
      : 'Personal Jamie could not reach its model or private workspace tools. Your data was not changed; you can continue in Today, Planner, or Business.');
  }
}

function collectProposals(steps: any[]) {
  const candidates = (steps || []).flatMap((step) => step.toolResults || [])
    .filter((toolResult: any) => ['prepare_personal_planner_item', 'prepare_personal_financial_record', 'prepare_personal_goal'].includes(toolResult.toolName))
    .map((toolResult: any) => toolResult.output)
    .slice(0, 3);
  return candidates.flatMap((candidate: unknown) => {
    const parsed = jamiePersonalProposalSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
}

function unavailable(content: string) {
  return {
    role: 'assistant' as const, content,
    personal: { context: 'personal_realtor' as const, proposals: [], availability: { agenda: false, business: false, seller: false },
      links: { today: '/today' as const, planner: '/planner' as const, business: '/business' as const, inbox: '/admin/agent-leads' as const } },
  };
}
