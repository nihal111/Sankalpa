#!/bin/bash

# Supabase Cloud Sync Setup Script
# This script sets up the cloud sync schema using Supabase CLI

set -e

# Load credentials from .env.cloud-sync if it exists
if [ -f ".env.cloud-sync" ]; then
  export $(cat .env.cloud-sync | grep -v '^#' | xargs)
fi

SUPABASE_URL="${SUPABASE_URL}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SERVICE_ROLE_KEY not set"
  echo ""
  echo "Setup instructions:"
  echo "1. Copy .env.cloud-sync.example to .env.cloud-sync"
  echo "2. Fill in your Supabase credentials"
  echo "3. Run: npm run setup:supabase"
  echo ""
  echo "Or pass as environment variables:"
  echo "  SUPABASE_URL='https://xxxxx.supabase.co' SERVICE_ROLE_KEY='your_key' npm run setup:supabase"
  exit 1
fi

# Extract project ID from URL
PROJECT_ID=$(echo "$SUPABASE_URL" | sed 's/https:\/\/\(.*\)\.supabase\.co/\1/')

echo "Setting up Supabase project: $PROJECT_ID"

# Link to Supabase project
echo "Linking to Supabase project..."
npx supabase link --project-ref "$PROJECT_ID" --yes || true

# Push migrations to cloud
echo "Pushing schema to cloud..."
npx supabase db push --linked --yes 2>&1 | grep -v "^$"

echo ""
echo "✓ Schema setup complete!"
echo "Tables created: lists, tasks, sync_metadata"







