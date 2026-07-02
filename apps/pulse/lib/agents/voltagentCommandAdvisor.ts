import { groq } from '@ai-sdk/groq';
import { generateText, stepCountIs, tool } from 'ai';
import { z } from 'zod';
import { chooseWorkerForCommand, intelligenceWorkers } from '@/lib/command-center/workerRoster';
import type { CommandCenterRequest, CommandCenterResponse } from '@/lib/command-center/commandRouter';
import { annotateLangfuse, traceLangfuse } from '@/lib/observability/langfuseTracing';

type VoltAgentAdvisorStatus = 'ready' | 'standby' | 'error';

export type VoltAgentCommandAdvisorResult = {
  status: VoltAgentAdvisorStatus;
  framework: 'ai-sdk';
  agentId: 'sunset-command-advisor';
  model: string;
  provider: string;
  credentialEnv?: string;
  reason?: string;
  text: string;
  tools: Array<{
    name: string;
    purpose: string;
  }>;
  route: {
    workerId: string;
    workerName: string;
    routeMode: 'auto' | 'manual';
    tahFiles: string[];
  };
};

const DEFAULT_MODEL = 'groq/llama-3.1-8b-instant';

const providerCredentialEnv: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  xai: 'XAI_API_KEY'
};

const routeCommandTool = tool({
  description: 'Choose the Sunset Pulse Command Center worker that should handle a user request.',
  inputSchema: z.object({
    command: z.string().describe('The raw user command to route.'),
    selectedWorkerId: z.string().nullish().describe('A manually selected worker id, if the operator chose one.')
  }),
  execute: async ({ command, selectedWorkerId }) => {
    const manualWorker = selectedWorkerId
      ? intelligenceWorkers.find((worker) => worker.id === selectedWorkerId)
      : undefined;
    const worker = manualWorker || chooseWorkerForCommand(command);

    return {
      routeMode: manualWorker ? 'manual' : 'auto',
      workerId: worker.id,
      workerName: worker.name,
      role: worker.role,
      slot: worker.slot,
      tahFiles: worker.tahLoadout,
      status: worker.status
    };
  }
});

const listWorkerLoadoutTool = tool({
  description: 'Return the TAH files, command fit, and operating stats for a Command Center worker.',
  inputSchema: z.object({
    workerId: z.string().describe('The worker id to inspect.')
  }),
  execute: async ({ workerId }) => {
    const worker = intelligenceWorkers.find((item) => item.id === workerId);
    if (!worker) {
      return {
        found: false,
        workerId,
        tahFiles: [],
        commandFit: []
      };
    }

    return {
      found: true,
      workerId: worker.id,
      workerName: worker.name,
      role: worker.role,
      tahFiles: worker.tahLoadout,
      commandFit: worker.commandFit,
      stats: worker.stats
    };
  }
});

const summarizeCommandCenterTool = tool({
  description: 'Summarize the available Command Center worker roster for planning and routing.',
  inputSchema: z.object({}),
  execute: async () => {
    const slots = intelligenceWorkers.reduce<Record<string, number>>((accumulator, worker) => {
      accumulator[worker.slot] = (accumulator[worker.slot] || 0) + 1;
      return accumulator;
    }, {});

    return {
      workerCount: intelligenceWorkers.length,
      slots,
      tahFileCount: new Set(intelligenceWorkers.flatMap((worker) => worker.tahLoadout)).size,
      readyWorkers: intelligenceWorkers.filter((worker) => worker.status === 'Ready').length
    };
  }
});

const advisorTools = {
  route_command: routeCommandTool,
  list_worker_loadout: listWorkerLoadoutTool,
  summarize_command_center: summarizeCommandCenterTool
};

export async function runVoltagentCommandAdvisor(input: {
  request: CommandCenterRequest;
  commandResult?: CommandCenterResponse;
}): Promise<VoltAgentCommandAdvisorResult> {
  const command = input.request.command.trim();
  const route = routeForRequest(input.request, input.commandResult);
  const model = process.env.VOLTAGENT_COMMAND_MODEL || DEFAULT_MODEL;
  const provider = model.split('/')[0] || 'unknown';
  const credentialEnv = providerCredentialEnv[provider];
  const missingCredential = credentialEnv && !hasConfiguredSecret(process.env[credentialEnv]);
  const disabled = process.env.VOLTAGENT_COMMAND_ADVISOR_ENABLED === 'false';

  return traceLangfuse(
    'voltagent.command-advisor',
    {
      metadata: {
        feature: 'command-center',
        framework: 'ai-sdk',
        model,
        provider,
        routeMode: route.routeMode,
        workerId: route.workerId,
        enabled: !disabled && !missingCredential
      }
    },
    async () => {
      if (disabled) {
        return standbyResult({
          model,
          provider,
          credentialEnv,
          route,
          reason: 'VOLTAGENT_COMMAND_ADVISOR_ENABLED is false.'
        });
      }

      if (missingCredential) {
        return standbyResult({
          model,
          provider,
          credentialEnv,
          route,
          reason: `${credentialEnv} is not configured, so the VoltAgent advisor did not call a model.`
        });
      }

      try {
        const result = await generateText({
          model: resolveModel(model),
          system: [
            'You are the AI SDK advisor inside Sunset Pulse.',
            'Use the typed tools to understand worker routing and TAH loadouts.',
            'Return a concise operator-facing note with: route, why this worker fits, one risk or missing input, and one next action.',
            'Do not invent live market facts, legal advice, or private lead details.'
          ].join(' '),
          prompt: buildAdvisorPrompt(command, input.commandResult),
          tools: advisorTools,
          stopWhen: stepCountIs(4),
          maxOutputTokens: 700,
          temperature: 0.2
        });

        annotateLangfuse({
          metadata: {
            advisorStatus: 'ready',
            advisorToolCount: Object.keys(advisorTools).length
          }
        });

        return {
          status: 'ready',
          framework: 'ai-sdk',
          agentId: 'sunset-command-advisor',
          model,
          provider,
          credentialEnv,
          text: result.text || fallbackAdvisorText(route),
          tools: toolSummary(),
          route
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'VoltAgent advisor failed.';
        return {
          status: 'error',
          framework: 'ai-sdk',
          agentId: 'sunset-command-advisor',
          model,
          provider,
          credentialEnv,
          reason: message,
          text: fallbackAdvisorText(route),
          tools: toolSummary(),
          route
        };
      }
    },
    {
      asType: 'agent',
      propagate: {
        metadata: {
          feature: 'command-center',
          framework: 'ai-sdk',
          model,
          provider
        },
        tags: ['command-center', 'ai-sdk'],
        traceName: 'voltagent.command-advisor',
        version: process.env.LANGFUSE_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'local'
      }
    }
  );
}

function resolveModel(model: string) {
  if (model.startsWith('groq/')) {
    return groq(model.slice('groq/'.length));
  }

  throw new Error(`Unsupported command-advisor model provider: ${model.split('/')[0] || 'unknown'}.`);
}

function routeForRequest(
  request: CommandCenterRequest,
  commandResult?: CommandCenterResponse
): VoltAgentCommandAdvisorResult['route'] {
  if (commandResult?.worker?.id) {
    return {
      workerId: commandResult.worker.id,
      workerName: commandResult.worker.name,
      routeMode: commandResult.trace?.routeMode || (request.selectedWorkerId ? 'manual' : 'auto'),
      tahFiles: Array.isArray(commandResult.tahFiles) ? commandResult.tahFiles : []
    };
  }

  const manualWorker = request.selectedWorkerId
    ? intelligenceWorkers.find((worker) => worker.id === request.selectedWorkerId)
    : undefined;
  const worker = manualWorker || chooseWorkerForCommand(request.command) || intelligenceWorkers[0];

  return {
    workerId: worker?.id || 'unknown-worker',
    workerName: worker?.name || 'Unknown Worker',
    routeMode: manualWorker ? 'manual' : 'auto',
    tahFiles: worker?.tahLoadout || []
  };
}

function standbyResult(input: {
  model: string;
  provider: string;
  credentialEnv?: string;
  reason: string;
  route: VoltAgentCommandAdvisorResult['route'];
}): VoltAgentCommandAdvisorResult {
  return {
    status: 'standby',
    framework: 'ai-sdk',
    agentId: 'sunset-command-advisor',
    model: input.model,
    provider: input.provider,
    credentialEnv: input.credentialEnv,
    reason: input.reason,
    text: fallbackAdvisorText(input.route),
    tools: toolSummary(),
    route: input.route
  };
}

function buildAdvisorPrompt(command: string, commandResult?: CommandCenterResponse) {
  const sourceSummary = commandResult?.trace.selectedShards
    .slice(0, 4)
    .map((shard) => `${shard.source}: ${shard.concepts.slice(0, 4).join(', ')}`)
    .join('\n') || 'No source shards have been attached yet.';

  return [
    `Command: ${command}`,
    '',
    'Current Command Center result:',
    commandResult
      ? JSON.stringify({
        worker: commandResult.worker,
        intent: commandResult.intent,
        confidence: commandResult.result.confidence,
        title: commandResult.result.title,
        actions: commandResult.result.actions,
        routeMode: commandResult.trace.routeMode
      }, null, 2)
      : 'No Command Center result was provided. Route the command yourself.',
    '',
    'Source summary:',
    sourceSummary,
    '',
    'Use route_command if routing is uncertain. Use list_worker_loadout for the selected worker. Keep the answer under 120 words.'
  ].join('\n');
}

function fallbackAdvisorText(route: VoltAgentCommandAdvisorResult['route']) {
  return [
    `The command advisor is attached to ${route.workerName} in ${route.routeMode} mode.`,
    `It can inspect route fit and TAH loadout (${route.tahFiles.slice(0, 3).join(', ') || 'none'}).`,
    'Configure a supported provider key to enable model-backed advisor notes.'
  ].join(' ');
}

function toolSummary() {
  return [
    {
      name: 'route_command',
      purpose: 'Routes a command to the best Sunset Pulse worker.'
    },
    {
      name: 'list_worker_loadout',
      purpose: 'Shows the selected worker TAH files and command-fit signals.'
    },
    {
      name: 'summarize_command_center',
      purpose: 'Summarizes worker, slot, and file coverage.'
    }
  ];
}

function hasConfiguredSecret(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return ![
    'your_key_here',
    'your-api-key-here',
    'your_groq_key_here',
    'your_openrouter_keys_here',
    'placeholder',
    'changeme'
  ].includes(normalized);
}
