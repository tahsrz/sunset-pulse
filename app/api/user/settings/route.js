import connectDB from '@/lib/core/database';
import User from '@/models/User';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit } from '@/lib/core/rateLimit';

export const PATCH = async (request) => {
  try {
    await connectDB();
    const supabase = createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return new Response('User authentication required', { status: 401 });
    }

    const { id: userId } = authUser;
    
    // Rate Limiting: 10 requests per minute
    const { isLimited } = await checkRateLimit(userId, 10);
    if (isLimited) {
      return new Response('Too many requests. Please try again in a minute.', { status: 429 });
    }

    const body = await request.json();
    const { isAdvancedMode, customKeybind, isLefthandMode } = body;

    // Server-side Validation
    if (typeof customKeybind !== 'undefined') {
      if (typeof customKeybind !== 'string' || customKeybind.length !== 1 || !/[a-zA-Z0-9]/.test(customKeybind)) {
        return new Response('Invalid keybind format', { status: 400 });
      }
    }

    // 1. Sync to MongoDB (Legacy Support)
    const mongoUser = await User.findOne({ email: authUser.email });
    if (mongoUser) {
      if (typeof isAdvancedMode === 'boolean') mongoUser.isAdvancedMode = isAdvancedMode;
      if (typeof isLefthandMode === 'boolean') mongoUser.isLefthandMode = isLefthandMode;
      if (customKeybind) mongoUser.customKeybind = customKeybind.toUpperCase();
      await mongoUser.save();
    }

    // 2. Sync to Supabase Profiles (Modern Core)
    const updates = {};
    if (typeof isAdvancedMode === 'boolean') updates.is_advanced_mode = isAdvancedMode;
    if (typeof isLefthandMode === 'boolean') updates.is_lefthand_mode = isLefthandMode;
    if (customKeybind) updates.custom_keybind = customKeybind.toUpperCase();

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (profileError) {
      console.error('[SETTINGS_SYNC] Supabase Profile Update Failed:', profileError.message);
    }

    // 3. Update Auth Metadata (for immediate client access via user_metadata)
    await supabase.auth.updateUser({
      data: { 
        isAdvancedMode: typeof isAdvancedMode === 'boolean' ? isAdvancedMode : authUser.user_metadata?.isAdvancedMode,
        isLefthandMode: typeof isLefthandMode === 'boolean' ? isLefthandMode : authUser.user_metadata?.isLefthandMode,
        customKeybind: customKeybind ? customKeybind.toUpperCase() : authUser.user_metadata?.customKeybind
      }
    });

    return new Response(JSON.stringify({
      isAdvancedMode: isAdvancedMode,
      isLefthandMode: isLefthandMode,
      customKeybind: customKeybind ? customKeybind.toUpperCase() : undefined
    }), {
      status: 200,
    });
  } catch (error) {
    console.error('[SETTINGS_SYNC] Critical Failure:', error);
    return new Response('Something went wrong', { status: 500 });
  }
};
