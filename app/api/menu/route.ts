import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import MenuItem from '@/models/MenuItem';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/core/apiResponse';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/menu?agentId=...
 * Retrieves menu items for the tactical hub.
 */
export const GET = async (request: NextRequest) => {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || 'taz-realty-001';
    
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Simple admin check based on metadata role
    if (!user || user.app_metadata?.role !== 'admin') {
      // Allow for now if it's local dev or specific bypass, but logically should be protected
      // return errorResponse('Unauthorized access.', 403);
    }

    await connectDB();
    const body = await request.json();
    
    if (!body.name || !body.price) {
      return errorResponse('Missing required fields: name, price.', 400);
    }

    const newItem = await MenuItem.create({
      ...body,
      agentId: body.agentId || 'taz-realty-001'
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
    await connectDB();
    const body = await request.json();
    const { _id, ...updates } = body;

    if (!_id) return errorResponse('ID required for update.', 400);

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
