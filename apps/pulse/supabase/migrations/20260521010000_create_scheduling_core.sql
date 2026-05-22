-- Scheduling core foundation
-- Brings the first Cal scheduling tables into the Pulse Supabase database while
-- keeping legacy Cal integer ids for staged imports and rollback-friendly joins.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.scheduling_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    legacy_cal_user_id INTEGER UNIQUE,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    time_zone TEXT DEFAULT 'America/Chicago',
    week_start TEXT DEFAULT 'Sunday',
    locale TEXT,
    time_format INTEGER DEFAULT 12,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_team_id INTEGER UNIQUE,
    owner_id UUID REFERENCES public.scheduling_users(id) ON DELETE SET NULL,
    parent_team_id UUID REFERENCES public.scheduling_teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT,
    logo_url TEXT,
    bio TEXT,
    is_private BOOLEAN DEFAULT false,
    is_organization BOOLEAN DEFAULT false,
    time_zone TEXT DEFAULT 'America/Chicago',
    week_start TEXT DEFAULT 'Sunday',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (parent_team_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_teams_global_slug_unique_idx
ON public.scheduling_teams (lower(slug))
WHERE parent_team_id IS NULL AND slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.scheduling_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_membership_id INTEGER UNIQUE,
    team_id UUID NOT NULL REFERENCES public.scheduling_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'ADMIN', 'OWNER')),
    accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.scheduling_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_credential_id INTEGER UNIQUE,
    user_id UUID REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.scheduling_teams(id) ON DELETE CASCADE,
    app_id TEXT,
    type TEXT NOT NULL,
    key JSONB NOT NULL DEFAULT '{}'::jsonb,
    encrypted_key TEXT,
    invalid BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (user_id IS NOT NULL OR team_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.scheduling_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_schedule_id INTEGER UNIQUE,
    user_id UUID NOT NULL REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    time_zone TEXT DEFAULT 'America/Chicago',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_event_type_id INTEGER UNIQUE,
    owner_id UUID REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.scheduling_teams(id) ON DELETE CASCADE,
    parent_event_type_id UUID REFERENCES public.scheduling_event_types(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.scheduling_schedules(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    locations JSONB DEFAULT '[]'::jsonb,
    length_minutes INTEGER NOT NULL CHECK (length_minutes > 0),
    offset_start_minutes INTEGER DEFAULT 0,
    hidden BOOLEAN DEFAULT false,
    event_name TEXT,
    booking_fields JSONB DEFAULT '[]'::jsonb,
    recurring_event JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    period_type TEXT DEFAULT 'unlimited' CHECK (period_type IN ('unlimited', 'rolling', 'rolling_window', 'range')),
    period_start_at TIMESTAMPTZ,
    period_end_at TIMESTAMPTZ,
    period_days INTEGER,
    time_zone TEXT,
    requires_confirmation BOOLEAN DEFAULT false,
    requires_booker_email_verification BOOLEAN DEFAULT false,
    disable_guests BOOLEAN DEFAULT false,
    minimum_booking_notice_minutes INTEGER DEFAULT 120,
    before_event_buffer_minutes INTEGER DEFAULT 0,
    after_event_buffer_minutes INTEGER DEFAULT 0,
    slot_interval_minutes INTEGER,
    scheduling_type TEXT CHECK (scheduling_type IN ('roundRobin', 'collective', 'managed')),
    seats_per_time_slot INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (owner_id IS NOT NULL OR team_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_event_types_owner_slug_unique_idx
ON public.scheduling_event_types (owner_id, lower(slug))
WHERE owner_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_event_types_team_slug_unique_idx
ON public.scheduling_event_types (team_id, lower(slug))
WHERE team_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.scheduling_hosts (
    user_id UUID NOT NULL REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    event_type_id UUID NOT NULL REFERENCES public.scheduling_event_types(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.scheduling_schedules(id) ON DELETE SET NULL,
    membership_id UUID REFERENCES public.scheduling_memberships(id) ON DELETE CASCADE,
    is_fixed BOOLEAN DEFAULT false,
    priority INTEGER,
    weight INTEGER,
    location JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, event_type_id)
);

CREATE TABLE IF NOT EXISTS public.scheduling_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_availability_id INTEGER UNIQUE,
    user_id UUID REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES public.scheduling_event_types(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.scheduling_schedules(id) ON DELETE CASCADE,
    days INTEGER[] NOT NULL DEFAULT '{}',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    date DATE,
    CHECK (user_id IS NOT NULL OR event_type_id IS NOT NULL OR schedule_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.scheduling_destination_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_destination_calendar_id INTEGER UNIQUE,
    user_id UUID REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    event_type_id UUID UNIQUE REFERENCES public.scheduling_event_types(id) ON DELETE CASCADE,
    credential_id UUID REFERENCES public.scheduling_credentials(id) ON DELETE SET NULL,
    integration TEXT NOT NULL,
    external_id TEXT NOT NULL,
    primary_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_booking_id INTEGER UNIQUE,
    uid TEXT UNIQUE NOT NULL,
    idempotency_key TEXT UNIQUE,
    user_id UUID REFERENCES public.scheduling_users(id) ON DELETE SET NULL,
    event_type_id UUID REFERENCES public.scheduling_event_types(id) ON DELETE SET NULL,
    destination_calendar_id UUID REFERENCES public.scheduling_destination_calendars(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    responses JSONB DEFAULT '{}'::jsonb,
    custom_inputs JSONB DEFAULT '{}'::jsonb,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('cancelled', 'accepted', 'rejected', 'pending', 'awaiting_host')),
    paid BOOLEAN DEFAULT false,
    cancellation_reason TEXT,
    rejection_reason TEXT,
    rescheduled BOOLEAN,
    from_reschedule TEXT,
    recurring_event_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    creation_source TEXT CHECK (creation_source IN ('api_v1', 'api_v2', 'webapp')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS public.scheduling_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_attendee_id INTEGER UNIQUE,
    booking_id UUID REFERENCES public.scheduling_bookings(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    time_zone TEXT NOT NULL,
    phone_number TEXT,
    locale TEXT DEFAULT 'en',
    no_show BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_booking_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_booking_reference_id INTEGER UNIQUE,
    booking_id UUID REFERENCES public.scheduling_bookings(id) ON DELETE CASCADE,
    credential_id UUID REFERENCES public.scheduling_credentials(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    uid TEXT NOT NULL,
    meeting_id TEXT,
    meeting_password TEXT,
    meeting_url TEXT,
    external_calendar_id TEXT,
    deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_selected_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_selected_calendar_id UUID UNIQUE,
    user_id UUID NOT NULL REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    credential_id UUID REFERENCES public.scheduling_credentials(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES public.scheduling_event_types(id) ON DELETE CASCADE,
    integration TEXT NOT NULL,
    external_id TEXT NOT NULL,
    channel_id TEXT,
    channel_resource_id TEXT,
    channel_resource_uri TEXT,
    channel_expiration TIMESTAMPTZ,
    sync_token TEXT,
    synced_at TIMESTAMPTZ,
    sync_error_at TIMESTAMPTZ,
    sync_error_count INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, integration, external_id, event_type_id)
);

CREATE TABLE IF NOT EXISTS public.scheduling_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_cal_webhook_id TEXT UNIQUE,
    user_id UUID REFERENCES public.scheduling_users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.scheduling_teams(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES public.scheduling_event_types(id) ON DELETE CASCADE,
    subscriber_url TEXT NOT NULL,
    payload_template TEXT,
    active BOOLEAN DEFAULT true,
    event_triggers TEXT[] NOT NULL DEFAULT '{}',
    app_id TEXT,
    secret TEXT,
    platform BOOLEAN DEFAULT false,
    version TEXT DEFAULT '2021-10-20',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CHECK (user_id IS NOT NULL OR team_id IS NOT NULL OR event_type_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS scheduling_webhooks_user_url_unique_idx
ON public.scheduling_webhooks (user_id, subscriber_url)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS scheduling_memberships_team_id_idx ON public.scheduling_memberships(team_id);
CREATE INDEX IF NOT EXISTS scheduling_memberships_user_id_idx ON public.scheduling_memberships(user_id);
CREATE INDEX IF NOT EXISTS scheduling_credentials_user_id_idx ON public.scheduling_credentials(user_id);
CREATE INDEX IF NOT EXISTS scheduling_credentials_team_id_idx ON public.scheduling_credentials(team_id);
CREATE INDEX IF NOT EXISTS scheduling_schedules_user_id_idx ON public.scheduling_schedules(user_id);
CREATE INDEX IF NOT EXISTS scheduling_event_types_owner_id_idx ON public.scheduling_event_types(owner_id);
CREATE INDEX IF NOT EXISTS scheduling_event_types_team_id_idx ON public.scheduling_event_types(team_id);
CREATE INDEX IF NOT EXISTS scheduling_hosts_event_type_id_idx ON public.scheduling_hosts(event_type_id);
CREATE INDEX IF NOT EXISTS scheduling_availability_schedule_id_idx ON public.scheduling_availability(schedule_id);
CREATE INDEX IF NOT EXISTS scheduling_bookings_user_id_idx ON public.scheduling_bookings(user_id);
CREATE INDEX IF NOT EXISTS scheduling_bookings_event_type_id_idx ON public.scheduling_bookings(event_type_id);
CREATE INDEX IF NOT EXISTS scheduling_bookings_time_status_idx ON public.scheduling_bookings(start_time, end_time, status);
CREATE INDEX IF NOT EXISTS scheduling_attendees_booking_id_idx ON public.scheduling_attendees(booking_id);
CREATE INDEX IF NOT EXISTS scheduling_attendees_email_idx ON public.scheduling_attendees(email);
CREATE INDEX IF NOT EXISTS scheduling_booking_references_booking_id_idx ON public.scheduling_booking_references(booking_id);
CREATE INDEX IF NOT EXISTS scheduling_selected_calendars_user_id_idx ON public.scheduling_selected_calendars(user_id);

CREATE OR REPLACE FUNCTION public.is_scheduling_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('realtor', 'operator', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_scheduling_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.scheduling_users
        WHERE id = target_user_id
        AND auth_user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_scheduling_team_member(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.scheduling_memberships membership
        JOIN public.scheduling_users scheduling_user ON scheduling_user.id = membership.user_id
        WHERE membership.team_id = target_team_id
        AND membership.accepted = true
        AND scheduling_user.auth_user_id = auth.uid()
    );
$$;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'scheduling_users',
        'scheduling_teams',
        'scheduling_memberships',
        'scheduling_credentials',
        'scheduling_schedules',
        'scheduling_event_types',
        'scheduling_hosts',
        'scheduling_availability',
        'scheduling_destination_calendars',
        'scheduling_bookings',
        'scheduling_attendees',
        'scheduling_booking_references',
        'scheduling_selected_calendars',
        'scheduling_webhooks'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Service role can manage %s" ON public.%I', table_name, table_name);
        EXECUTE format(
            'CREATE POLICY "Service role can manage %s" ON public.%I TO service_role USING (true) WITH CHECK (true)',
            table_name,
            table_name
        );
    END LOOP;
END $$;

DROP POLICY IF EXISTS "Scheduling users can read themselves" ON public.scheduling_users;
CREATE POLICY "Scheduling users can read themselves"
ON public.scheduling_users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid() OR public.is_scheduling_admin());

DROP POLICY IF EXISTS "Scheduling users can update themselves" ON public.scheduling_users;
CREATE POLICY "Scheduling users can update themselves"
ON public.scheduling_users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid() OR public.is_scheduling_admin())
WITH CHECK (auth_user_id = auth.uid() OR public.is_scheduling_admin());

DROP POLICY IF EXISTS "Team members can read scheduling teams" ON public.scheduling_teams;
CREATE POLICY "Team members can read scheduling teams"
ON public.scheduling_teams
FOR SELECT
TO authenticated
USING (public.is_scheduling_team_member(id) OR public.is_scheduling_admin());

DROP POLICY IF EXISTS "Team members can read scheduling memberships" ON public.scheduling_memberships;
CREATE POLICY "Team members can read scheduling memberships"
ON public.scheduling_memberships
FOR SELECT
TO authenticated
USING (public.is_scheduling_team_member(team_id) OR public.is_scheduling_admin());

DROP POLICY IF EXISTS "Users can read owned scheduling records" ON public.scheduling_credentials;
CREATE POLICY "Users can read owned scheduling records"
ON public.scheduling_credentials
FOR SELECT
TO authenticated
USING (
    public.is_scheduling_user(user_id)
    OR public.is_scheduling_team_member(team_id)
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Users can manage owned schedules" ON public.scheduling_schedules;
CREATE POLICY "Users can manage owned schedules"
ON public.scheduling_schedules
FOR ALL
TO authenticated
USING (public.is_scheduling_user(user_id) OR public.is_scheduling_admin())
WITH CHECK (public.is_scheduling_user(user_id) OR public.is_scheduling_admin());

DROP POLICY IF EXISTS "Public can read visible event types" ON public.scheduling_event_types;
CREATE POLICY "Public can read visible event types"
ON public.scheduling_event_types
FOR SELECT
USING (
    hidden = false
    OR public.is_scheduling_user(owner_id)
    OR public.is_scheduling_team_member(team_id)
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Owners can manage event types" ON public.scheduling_event_types;
CREATE POLICY "Owners can manage event types"
ON public.scheduling_event_types
FOR ALL
TO authenticated
USING (
    public.is_scheduling_user(owner_id)
    OR public.is_scheduling_team_member(team_id)
    OR public.is_scheduling_admin()
)
WITH CHECK (
    public.is_scheduling_user(owner_id)
    OR public.is_scheduling_team_member(team_id)
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Users can read hosts for readable event types" ON public.scheduling_hosts;
CREATE POLICY "Users can read hosts for readable event types"
ON public.scheduling_hosts
FOR SELECT
TO authenticated
USING (
    public.is_scheduling_user(user_id)
    OR EXISTS (
        SELECT 1
        FROM public.scheduling_event_types event_type
        WHERE event_type.id = event_type_id
        AND (
            public.is_scheduling_user(event_type.owner_id)
            OR public.is_scheduling_team_member(event_type.team_id)
        )
    )
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Users can manage own availability" ON public.scheduling_availability;
CREATE POLICY "Users can manage own availability"
ON public.scheduling_availability
FOR ALL
TO authenticated
USING (
    public.is_scheduling_user(user_id)
    OR EXISTS (
        SELECT 1 FROM public.scheduling_schedules schedule
        WHERE schedule.id = schedule_id
        AND public.is_scheduling_user(schedule.user_id)
    )
    OR public.is_scheduling_admin()
)
WITH CHECK (
    public.is_scheduling_user(user_id)
    OR EXISTS (
        SELECT 1 FROM public.scheduling_schedules schedule
        WHERE schedule.id = schedule_id
        AND public.is_scheduling_user(schedule.user_id)
    )
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Users can read owned bookings" ON public.scheduling_bookings;
CREATE POLICY "Users can read owned bookings"
ON public.scheduling_bookings
FOR SELECT
TO authenticated
USING (
    public.is_scheduling_user(user_id)
    OR EXISTS (
        SELECT 1
        FROM public.scheduling_attendees attendee
        WHERE attendee.booking_id = id
        AND attendee.email = (
            SELECT auth_user.email
            FROM auth.users auth_user
            WHERE auth_user.id = auth.uid()
        )
    )
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Users can manage owned bookings" ON public.scheduling_bookings;
CREATE POLICY "Users can manage owned bookings"
ON public.scheduling_bookings
FOR ALL
TO authenticated
USING (public.is_scheduling_user(user_id) OR public.is_scheduling_admin())
WITH CHECK (public.is_scheduling_user(user_id) OR public.is_scheduling_admin());

DROP POLICY IF EXISTS "Users can read booking attendees" ON public.scheduling_attendees;
CREATE POLICY "Users can read booking attendees"
ON public.scheduling_attendees
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.scheduling_bookings booking
        WHERE booking.id = booking_id
        AND public.is_scheduling_user(booking.user_id)
    )
    OR email = (
        SELECT auth_user.email
        FROM auth.users auth_user
        WHERE auth_user.id = auth.uid()
    )
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Users can read booking references" ON public.scheduling_booking_references;
CREATE POLICY "Users can read booking references"
ON public.scheduling_booking_references
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.scheduling_bookings booking
        WHERE booking.id = booking_id
        AND public.is_scheduling_user(booking.user_id)
    )
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Users can manage selected calendars" ON public.scheduling_selected_calendars;
CREATE POLICY "Users can manage selected calendars"
ON public.scheduling_selected_calendars
FOR ALL
TO authenticated
USING (public.is_scheduling_user(user_id) OR public.is_scheduling_admin())
WITH CHECK (public.is_scheduling_user(user_id) OR public.is_scheduling_admin());

DROP POLICY IF EXISTS "Users can manage destination calendars" ON public.scheduling_destination_calendars;
CREATE POLICY "Users can manage destination calendars"
ON public.scheduling_destination_calendars
FOR ALL
TO authenticated
USING (
    public.is_scheduling_user(user_id)
    OR EXISTS (
        SELECT 1 FROM public.scheduling_event_types event_type
        WHERE event_type.id = event_type_id
        AND public.is_scheduling_user(event_type.owner_id)
    )
    OR public.is_scheduling_admin()
)
WITH CHECK (
    public.is_scheduling_user(user_id)
    OR EXISTS (
        SELECT 1 FROM public.scheduling_event_types event_type
        WHERE event_type.id = event_type_id
        AND public.is_scheduling_user(event_type.owner_id)
    )
    OR public.is_scheduling_admin()
);

DROP POLICY IF EXISTS "Users can manage scheduling webhooks" ON public.scheduling_webhooks;
CREATE POLICY "Users can manage scheduling webhooks"
ON public.scheduling_webhooks
FOR ALL
TO authenticated
USING (
    public.is_scheduling_user(user_id)
    OR public.is_scheduling_team_member(team_id)
    OR EXISTS (
        SELECT 1 FROM public.scheduling_event_types event_type
        WHERE event_type.id = event_type_id
        AND (
            public.is_scheduling_user(event_type.owner_id)
            OR public.is_scheduling_team_member(event_type.team_id)
        )
    )
    OR public.is_scheduling_admin()
)
WITH CHECK (
    public.is_scheduling_user(user_id)
    OR public.is_scheduling_team_member(team_id)
    OR EXISTS (
        SELECT 1 FROM public.scheduling_event_types event_type
        WHERE event_type.id = event_type_id
        AND (
            public.is_scheduling_user(event_type.owner_id)
            OR public.is_scheduling_team_member(event_type.team_id)
        )
    )
    OR public.is_scheduling_admin()
);

DROP TRIGGER IF EXISTS set_scheduling_users_updated_at ON public.scheduling_users;
CREATE TRIGGER set_scheduling_users_updated_at
BEFORE UPDATE ON public.scheduling_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_teams_updated_at ON public.scheduling_teams;
CREATE TRIGGER set_scheduling_teams_updated_at
BEFORE UPDATE ON public.scheduling_teams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_memberships_updated_at ON public.scheduling_memberships;
CREATE TRIGGER set_scheduling_memberships_updated_at
BEFORE UPDATE ON public.scheduling_memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_credentials_updated_at ON public.scheduling_credentials;
CREATE TRIGGER set_scheduling_credentials_updated_at
BEFORE UPDATE ON public.scheduling_credentials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_schedules_updated_at ON public.scheduling_schedules;
CREATE TRIGGER set_scheduling_schedules_updated_at
BEFORE UPDATE ON public.scheduling_schedules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_event_types_updated_at ON public.scheduling_event_types;
CREATE TRIGGER set_scheduling_event_types_updated_at
BEFORE UPDATE ON public.scheduling_event_types
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_destination_calendars_updated_at ON public.scheduling_destination_calendars;
CREATE TRIGGER set_scheduling_destination_calendars_updated_at
BEFORE UPDATE ON public.scheduling_destination_calendars
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_bookings_updated_at ON public.scheduling_bookings;
CREATE TRIGGER set_scheduling_bookings_updated_at
BEFORE UPDATE ON public.scheduling_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_attendees_updated_at ON public.scheduling_attendees;
CREATE TRIGGER set_scheduling_attendees_updated_at
BEFORE UPDATE ON public.scheduling_attendees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_selected_calendars_updated_at ON public.scheduling_selected_calendars;
CREATE TRIGGER set_scheduling_selected_calendars_updated_at
BEFORE UPDATE ON public.scheduling_selected_calendars
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_scheduling_webhooks_updated_at ON public.scheduling_webhooks;
CREATE TRIGGER set_scheduling_webhooks_updated_at
BEFORE UPDATE ON public.scheduling_webhooks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
