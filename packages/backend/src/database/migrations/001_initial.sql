-- 001_initial.sql
-- Initial database schema for URL Shortener

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  api_key VARCHAR(64) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Links table
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  custom_alias VARCHAR(20) UNIQUE,
  title VARCHAR(255),
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  password VARCHAR(255),
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Click events table
CREATE TABLE IF NOT EXISTS click_events (
  id UUID PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  browser VARCHAR(50),
  browser_version VARCHAR(20),
  os VARCHAR(50),
  os_version VARCHAR(20),
  device_type VARCHAR(20),
  device_model VARCHAR(100),
  is_mobile BOOLEAN,
  is_tablet BOOLEAN,
  is_desktop BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_click_events_link_id ON click_events(link_id);
CREATE INDEX IF NOT EXISTS idx_click_events_created_at ON click_events(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Composite indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_click_events_link_created ON click_events(link_id, created_at);
CREATE INDEX IF NOT EXISTS idx_click_events_country ON click_events(link_id, country);
CREATE INDEX IF NOT EXISTS idx_click_events_browser ON click_events(link_id, browser);
CREATE INDEX IF NOT EXISTS idx_click_events_device ON click_events(link_id, device_type);
CREATE INDEX IF NOT EXISTS idx_click_events_referer ON click_events(link_id, referer);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to users table
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply updated_at trigger to links table
DROP TRIGGER IF EXISTS trigger_links_updated_at ON links;
CREATE TRIGGER trigger_links_updated_at
  BEFORE UPDATE ON links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
