import 'server-only';

import { admitCapabilityOperation } from './admission.server';
import { buildMcpToolCallRequest, buildOpenApiRequest, gatewayPreparationSchema, type GatewayPreparation } from '@/lib/platform/contracts/protocolGateway';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

export async function prepareCapabilityInvocation(actorId: string, workspaceId: string, input: GatewayPreparation) {
  const preparation = gatewayPreparationSchema.parse(input);
  const { protocol, admission, ...request } = preparation;
  const admitted = await admitCapabilityOperation(actorId, workspaceId, admission);
  const envelope = protocol === 'mcp'
    ? buildMcpToolCallRequest({ connectionId: request.connectionId, operationId: request.operationId, inputSchemaHash: request.inputSchemaHash, tool: request.tool!, arguments: admitted.payload })
    : buildOpenApiRequest({ connectionId: request.connectionId, operationId: request.operationId, inputSchemaHash: request.inputSchemaHash, operation: request.operation!, method: request.method!, path: request.path!, arguments: admitted.payload });
  return { reservation: admitted.reservation, envelope };
}

// Intentionally unavailable until effect gates, response validation and provider
// credentials are implemented and reviewed.
export async function invokeCapability(): Promise<never> {
  throw new PlatformRunError('55000');
}
