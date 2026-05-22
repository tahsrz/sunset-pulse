# Transition Plan: NextAuth to Supabase Auth

## Current Implementation (NextAuth)
- **Providers**: Google Sign-In (`GoogleProvider`).
- **Database**: MongoDB (`User` model).
- **Callbacks**:
  - `signIn`: Connects to MongoDB, checks if user exists, creates new user if not.
  - `session`: Attaches MongoDB user ID to the session object.
- **Route Protection**: Managed via `middleware.js` and server-side checks.

## Transition Steps

### 1. Infrastructure Preparation
- [ ] Install `@supabase/auth-helpers-nextjs` or `@supabase/ssr`.
- [ ] Enable Google Auth in Supabase Dashboard.
- [ ] Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env.local`.

### 2. Implementation Changes
- **Client-Side**:
  - Replace `SessionProvider` with Supabase Auth helpers (if needed, or use their context provider).
  - Update `LoginButton` and `LogoutButton` to use `supabase.auth.signInWithOAuth()` and `supabase.auth.signOut()`.
- **Server-Side**:
  - Update `middleware.js` to use Supabase's `createMiddlewareClient`.
  - Replace `getServerSession` calls with Supabase's `supabase.auth.getUser()` or `getSession()`.

### 3. Data Schema & Migration
- **Supabase Profiles**: Create a `public.profiles` table in Supabase to mirror existing MongoDB `User` model (`email`, `username`, `image`).
- **Trigger**: Implement a PostgreSQL trigger on `auth.users` to automatically create a entry in `public.profiles` on signup.
- **Data Sync**: (Optional) Migrate existing MongoDB users to Supabase if continuity is required.

### 4. Integration with RENTCAST/JAMIE
- Utilize Supabase Row Level Security (RLS) to manage access to RENTCAST/JAMIE related data.
- Store lead data directly in Supabase tables instead of MongoDB.

## Rationale
Transitioning to Supabase Auth provides better integration with the Supabase ecosystem, simplifies the stack by reducing reliance on MongoDB for core auth data, and offers built-in RLS for enhanced security.
