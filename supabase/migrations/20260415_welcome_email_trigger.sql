-- Enable the net extension to allow HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS "net";

-- Trigger function to invoke the welcome-email edge function
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Construct the payload from new user metadata and email
  payload := jsonb_build_object(
    'email', new.email,
    'full_name', COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'user_name', 'Operative'),
    'role', COALESCE(new.raw_user_meta_data->>'role', 'consumer')
  );

  -- Perform an asynchronous POST request to the welcome-email edge function
  -- Note: Replace the URL with your actual project URL if deploying to a remote instance
  -- For local development, this trigger won't reach the edge function unless a tunnel is used.
  PERFORM net.http_post(
    url := 'https://xlyfhiafactxahhvikyv.supabase.co/functions/v1/welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := payload
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the auth.users table
-- This runs after the initial profile creation trigger to ensure stability
CREATE OR REPLACE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_welcome_email();
