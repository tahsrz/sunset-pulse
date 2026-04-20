-- Create Jamie Interactions table for cross-device persistence
CREATE TABLE IF NOT EXISTS jamie_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For tracking specific sessions if needed
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE jamie_interactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own Jamie interactions" 
  ON jamie_interactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Jamie interactions" 
  ON jamie_interactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Jamie interactions" 
  ON jamie_interactions FOR DELETE 
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_jamie_interactions_user_id ON jamie_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_jamie_interactions_timestamp ON jamie_interactions(timestamp);
