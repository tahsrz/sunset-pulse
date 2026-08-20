export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import MenuItem from '@/models/MenuItem';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { getAgentIdFromInput } from '@/lib/sites/agentConfig';
import { z } from 'zod';

const menuCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  price: z.number().finite().nonnegative(),
  description: z.string().max(2000).default(''),
  category: z.string().trim().min(1).max(80),
  isAvailable: z.boolean().default(true),
}).strict();

const menuUpdateSchema = menuCreateSchema.partial().extend({ _id: z.string().min(1) }).strict();



/**
 * GET /api/menu?agentId=...
 * Retrieves menu items for the tactical hub.
 */
export const GET = async (request: NextRequest) => {
  try {
    const access = await requireOperatorRouteAccess(request);
    if (isAuthResponse(access)) return access;
    await connectDB();
    const agentId = getAgentIdFromInput();
    
    const menuItems = await MenuItem.find({ agentId }).sort({ category: 1, name: 1 });
    return successResponse(menuItems);
  } catch (error: any) {
    return errorResponse('Failed to retrieve menu data.', 500, error.message);
  }
};

/**
 * POST /api/menu
 * Creates a new intelligence product (menu item). Admin required.
 */
export const POST = async (request: NextRequest) => {
  try {
    const access = await requireOperatorRouteAccess(request);
    if (isAuthResponse(access)) return access;

    await connectDB();
    const body = await request.json();
    
    const parsed = menuCreateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid menu item.', 400, parsed.error.flatten());

    const newItem = await MenuItem.create({
      ...parsed.data,
      agentId: getAgentIdFromInput()
    });

    return successResponse(newItem, 201);
  } catch (error: any) {
    return errorResponse('Failed to create menu item.', 500, error.message);
  }
};

/**
 * PATCH /api/menu/:id (via body or query)
 * Updates an existing item.
 */
export const PATCH = async (request: NextRequest) => {
  try {
    const access = await requireOperatorRouteAccess(request);
    if (isAuthResponse(access)) return access;

    await connectDB();
    const parsed = menuUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse('Invalid menu update.', 400, parsed.error.flatten());
    const { _id, ...updates } = parsed.data;

    const updatedItem = await MenuItem.findByIdAndUpdate(_id, updates, { new: true });
    if (!updatedItem) return notFoundResponse('Menu Item');

    return successResponse(updatedItem);
  } catch (error: any) {
    return errorResponse('Update failed.', 500, error.message);
  }
};

/**
 * DELETE /api/menu
 * Deletes an item from the grid.
 */
export const DELETE = async (request: NextRequest) => {
  try {
    const access = await requireOperatorRouteAccess(request);
    if (isAuthResponse(access)) return access;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return errorResponse('ID required for deletion.', 400);

    await connectDB();
    const deleted = await MenuItem.findByIdAndDelete(id);
    if (!deleted) return notFoundResponse('Menu Item');

    return successResponse({ message: 'Item purged from grid.' });
  } catch (error: any) {
    return errorResponse('Deletion failed.', 500, error.message);
  }
};
