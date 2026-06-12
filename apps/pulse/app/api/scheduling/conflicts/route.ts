export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';
import fs from 'fs/promises';
import path from 'path';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

const configPath = path.resolve(process.cwd(), 'config/compatibility-rules.json');

// Helper to safely read conflicts
async function readConflicts() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    // If file doesn't exist, return empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Helper to safely write conflicts
async function writeConflicts(conflicts: any[]) {
  // Ensure the directory exists
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(conflicts, null, 2), 'utf8');
}

// GET /api/scheduling/conflicts - Fetch all compatibility rules
export const GET = async (request: NextRequest) => {
  try {
    const access = await requireOperatorRouteAccess(request);
    if (isAuthResponse(access)) return access;

    const conflicts = await readConflicts();
    return successResponse({ conflicts });
  } catch (error: any) {
    console.error('[CONFLICTS_GET_ERROR]:', error);
    return errorResponse('Failed to fetch compatibility rules.', 500, error.message);
  }
};

// POST /api/scheduling/conflicts - Manage compatibility rules (add or remove)
export const POST = async (request: NextRequest) => {
  try {
    const access = await requireOperatorRouteAccess(request);
    if (isAuthResponse(access)) return access;

    const body = await request.json();
    const { action, email1, email2 } = body;

    if (!action || !['add', 'remove'].includes(action)) {
      return errorResponse('Invalid action. Supported actions are "add" and "remove".', 400);
    }

    if (!email1 || !email2) {
      return errorResponse('Required parameters are missing (email1, email2).', 400);
    }

    const trimmedEmail1 = email1.trim().toLowerCase();
    const trimmedEmail2 = email2.trim().toLowerCase();

    if (trimmedEmail1 === trimmedEmail2) {
      return errorResponse('An employee cannot have a compatibility conflict with themselves.', 400);
    }

    let conflicts = await readConflicts();

    if (action === 'add') {
      // Check if this conflict already exists in either order
      const exists = conflicts.some(
        (c: any) =>
          (c.email1 === trimmedEmail1 && c.email2 === trimmedEmail2) ||
          (c.email1 === trimmedEmail2 && c.email2 === trimmedEmail1)
      );

      if (exists) {
        return errorResponse('This compatibility conflict already exists.', 400);
      }

      conflicts.push({
        email1: trimmedEmail1,
        email2: trimmedEmail2,
      });

      await writeConflicts(conflicts);
      return successResponse({
        message: 'Compatibility rule successfully added.',
        conflicts,
      }, 201);

    } else if (action === 'remove') {
      const initialLength = conflicts.length;
      conflicts = conflicts.filter(
        (c: any) =>
          !(
            (c.email1 === trimmedEmail1 && c.email2 === trimmedEmail2) ||
            (c.email1 === trimmedEmail2 && c.email2 === trimmedEmail1)
          )
      );

      if (conflicts.length === initialLength) {
        return errorResponse('Compatibility rule not found.', 404);
      }

      await writeConflicts(conflicts);
      return successResponse({
        message: 'Compatibility rule successfully removed.',
        conflicts,
      });
    }

    return errorResponse('Invalid request action.', 400);
  } catch (error: any) {
    console.error('[CONFLICTS_POST_ERROR]:', error);
    return errorResponse('Failed to update compatibility rules.', 500, error.message);
  }
};
