-- Run this in Supabase SQL editor: Dashboard → SQL Editor → New Query

CREATE TABLE IF NOT EXISTS integrations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  provider    TEXT        NOT NULL,       -- 'jortt' | 'shopify' | 'loop' | 'triplewhale'
  access_token  TEXT      NOT NULL,
  refresh_token TEXT,
  expires_at  TIMESTAMPTZ,
  metadata    JSONB       DEFAULT '{}',   -- e.g. { shop_domain, shop_name }
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- One active integration per provider for the whole org
CREATE UNIQUE INDEX IF NOT EXISTS integrations_provider_unique
  ON integrations(provider);

-- Cached data from each provider (refreshed by cron/edge function)
CREATE TABLE IF NOT EXISTS data_cache (
  provider    TEXT        NOT NULL,
  cache_key   TEXT        NOT NULL,       -- e.g. 'jortt_expenses_2026-04'
  payload     JSONB       NOT NULL,
  fetched_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider, cache_key)
);

-- RLS: all authenticated @zapply.nl users can read
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_cache    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users read integrations"
  ON integrations FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users write integrations"
  ON integrations FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users read cache"
  ON data_cache FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users write cache"
  ON data_cache FOR ALL USING (auth.role() = 'authenticated');
