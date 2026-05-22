-- 1. Create Collections Table (Pulse Folders)
-- Many-to-many relationship between users and properties
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users or your internal user ID
    property_id TEXT NOT NULL, -- MongoDB Property ID
    name TEXT DEFAULT 'My Pulse Folder',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, property_id)
);
-- 2. Create Property Comments (Spatial Feedback)
CREATE TABLE IF NOT EXISTS public.property_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    user_name TEXT,
    content TEXT NOT NULL,
    position_x NUMERIC,
    position_y NUMERIC,
    position_z NUMERIC,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);
-- Enable Realtime for these tables
-- alter publication supabase_realtime add table public.collections;
-- alter publication supabase_realtime add table public.property_comments;;
