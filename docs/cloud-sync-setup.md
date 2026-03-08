# Cloud Sync Setup Guide

## Prerequisites

- Supabase account (free tier available at https://supabase.com)
- Supabase CLI installed (`npm install -g supabase` or use `npx`)
- Authenticated with Supabase CLI (`npx supabase login`)

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in with GitHub
2. Create a new organization (free tier, $0/month)
3. Create a new project:
   - **Name**: `Sankalpa`
   - **Password**: Generate a strong password
   - **Region**: Choose closest to you (AWS regions)
   - **Enable Data API**: ✓ (checkbox)
   - **Enable automatic RLS**: Leave unchecked
4. Click **Create project** and wait for it to initialize

## Step 2: Get Your Credentials

From the project overview page:
1. Copy **Project URL** (format: `https://xxxxx.supabase.co`)
2. Go to **Project Settings** → **API**
3. Copy **Service Role Key** (the secret key, not the anon key)

## Step 3: Authenticate Supabase CLI

Run once to authenticate:
```bash
npx supabase login
```

This opens a browser to authenticate. You only need to do this once.

## Step 4: Configure Cloud Sync

1. Copy the example config:
   ```bash
   cp .env.cloud-sync.example .env.cloud-sync
   ```

2. Edit `.env.cloud-sync` and add your credentials:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Important**: `.env.cloud-sync` is gitignored and will never be committed

## Step 5: Run Setup Script

```bash
npm run setup:supabase
```

This will:
- Link your local project to Supabase
- Create all necessary tables: `lists`, `tasks`, `sync_metadata`
- Create indexes for performance

## Verification

Check that tables were created in Supabase dashboard:
1. Go to your Supabase project
2. Click **Table Editor**
3. You should see: `folders`, `lists`, `tasks`, `settings`, `snapshots`

## In-App Configuration

You can also configure cloud sync from within the app:

1. Open **Settings** (`Cmd+,`)
2. Navigate to **Cloud Sync**
3. Enter your Supabase URL and Service Role Key
4. Click **Save & Connect**

Credentials are stored in the app's settings database. See [Cloud Sync feature docs](features/cloud-sync.md) for usage details.

## What Gets Created

### Tables
- **folders**: Folder data for list grouping
  - `id`, `name`, `sort_key`, `is_expanded`, `created_at`, `updated_at`
- **lists**: List/folder data with hierarchy support
  - `id`, `name`, `sort_key`, `folder_id`, `notes`, `created_at`, `updated_at`
- **tasks**: Task data with timestamps and soft deletes
  - `id`, `list_id`, `title`, `completed`, `due_date`, `duration`, `notes`, `sort_key`, `parent_id`, `created_at`, `updated_at`, `deleted_at`
- **settings**: Key-value app preferences
  - `key`, `value`
- **snapshots**: GFS backup snapshots (auto-created on each sync)
  - `id`, `tier` (daily/weekly/monthly), `created_at`, `data` (JSON blob)

### Indexes
- `idx_tasks_list_id` - Fast lookups by list
- `idx_tasks_parent_id` - Fast lookups by parent task
- `idx_lists_parent_id` - Fast lookups by parent folder

## Troubleshooting

### "Access token not provided"
Run: `npx supabase login`

### "relation already exists"
This is normal if running setup multiple times. The script uses `CREATE TABLE IF NOT EXISTS`.

### "permission denied for schema public"
Make sure you're using the **Service Role Key**, not the Anon Key.

## Files

- `.env.cloud-sync.example` - Template for credentials (commit this)
- `.env.cloud-sync` - Your actual credentials (gitignored, never commit)
- `supabase/migrations/` - Database migrations
- `scripts/supabase-setup.sh` - Setup script
- `scripts/sync-to-cloud.ts` - Manual sync to cloud
- `scripts/restore-from-cloud.ts` - Manual restore from cloud
- `scripts/nuke-supabase.ts` - Delete all cloud data
