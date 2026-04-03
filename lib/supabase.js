import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * JAMIE_WORKFLOW_INJECTION: Calls the Edge Function to generate a tactical sprint.
 * 
 */
export const generateJamieSprint = async (goal, durationHours, metadata = {}) => {
  const { data, error } = await supabase.functions.invoke('generate-sprint', {
    body: { goal, duration_hours: durationHours, metadata }
  });
  if (error) throw error;
  return data;
};

/**
 * JAMIE_WORKFLOW_INITIALIZATION: Calls the Postgres RPC to spread tasks across tables.
 */
export const initializeWorkflow = async (name, goal, sprintData, metadata = {}) => {
  const { data, error } = await supabase.rpc('initialize_workflow', {
    p_name: name,
    p_business_goal: goal,
    p_sprint_data: sprintData,
    p_metadata: metadata
  });
  if (error) throw error;
  return data;
};

/**
 * JAMIE_REALTIME_SUBSCRIPTION: Listens for task updates in a specific sprint.
 */
export const subscribeToSprintTasks = (sprintId, callback) => {
  return supabase
    .channel(`public:tasks:sprint_id=eq.${sprintId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'tasks',
      filter: `sprint_id=eq.${sprintId}`
    }, callback)
    .subscribe();
};

/**
 * JAMIE_STORAGE: Link a workflow report to the storage bucket.
 */
export const uploadWorkflowAsset = async (workflowId, assetName, file) => {
  const { data, error } = await supabase.storage
    .from('reports')
    .upload(`${workflowId}/${assetName}`, file);
  if (error) throw error;
  return data;
};

/**
 * ASYNC_COLLECTIONS: Toggle a property in a user's Pulse Folder.
 */
export const toggleCollection = async (userId, propertyId) => {
  const { data: existing } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .single();

  if (existing) {
    return supabase.from('collections').delete().eq('id', existing.id);
  } else {
    return supabase.from('collections').insert({ user_id: userId, property_id: propertyId });
  }
};

/**
 * ASYNC_FEEDBACK: Add a spatial comment to a property. Explorer
 */
export const addPropertyComment = async (comment) => {
  const { data, error } = await supabase
    .from('property_comments')
    .insert(comment)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * ASYNC_FEEDBACK Listen for new comments on a property.
 */
export const subscribeToPropertyComments = (propertyId, callback) => {
  return supabase
    .channel(`public:property_comments:property_id=eq.${propertyId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'property_comments',
      filter: `property_id=eq.${propertyId}`
    }, callback)
    .subscribe();
};

/**
 * THE_PAST: Log an intelligence event to the persistent audit stream.
 */
export const logEvent = async ({ type, description, actorId, actorName, targetId, metadata = {}, severity = 'INFO' }) => {
  const { data, error } = await supabase.rpc('log_intelligence_event', {
    p_type: type,
    p_description: description,
    p_actor_id: actorId,
    p_actor_name: actorName,
    p_target_id: targetId,
    p_metadata: metadata,
    p_severity: severity
  });
  if (error) console.error('[THE_PAST] Logging failed:', error);
  return data;
};

/**
 * THE_PAST_STREAM: Subscribe to the global intelligence event stream.
 */
export const subscribeToEvents = (callback) => {
  return supabase
    .channel('public:intelligence_events')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'intelligence_events' }, callback)
    .subscribe();
};

/**
 * Placeholder logic for RENTCAST/JAMIE integration

 * \
 */
export const integrateSupabase = async (data) => {
  // Logic to sync RENTCAST/JAMIE data to Supabase
  console.log('Syncing data to Supabase:', data);
  return { success: true };
};
