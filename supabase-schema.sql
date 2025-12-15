-- Skills Hub Memory & Context System - Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LAYER 1: User Preferences
-- ============================================

-- Users table (if not using Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,  -- Use TEXT for now, can be UUID later with auth

    -- Brand Identity
    brand_name TEXT,
    brand_tagline TEXT,
    logo_url TEXT,
    brand_colors JSONB DEFAULT '{"primary": "#0066cc", "secondary": "#6c757d", "accent": "#e63946"}',

    -- Tone & Voice
    tone_settings JSONB DEFAULT '{"formality": "neutral", "personality": ["professional"], "bannedWords": [], "preferredWords": []}',

    -- Default Settings
    default_settings JSONB DEFAULT '{"preferredIndustry": "", "audienceType": "", "outputLength": "medium", "includeEmojis": false, "includeStatistics": true}',

    -- Contact Info
    contact_info JSONB DEFAULT '{"email": "", "phone": "", "website": "", "socialHandles": {}}',

    -- Boilerplate Text
    boilerplate_texts JSONB DEFAULT '{"aboutUs": "", "legalDisclaimer": "", "standardCta": "", "emailSignature": ""}',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LAYER 2: Project Workspaces
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Project context (event details, themes, audience, etc.)
    context JSONB DEFAULT '{}',

    -- Project assets (images, documents)
    assets JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LAYER 3: Generations & Learning
-- ============================================

-- Generations table (content created)
CREATE TABLE IF NOT EXISTS generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,

    skill_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    input_message TEXT NOT NULL,
    output_content TEXT NOT NULL,
    output_format TEXT DEFAULT 'html',

    source_urls TEXT[] DEFAULT '{}',

    -- User feedback on this generation
    feedback JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learned Preferences table (AI learns from user behavior)
CREATE TABLE IF NOT EXISTS learned_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,

    preference_type TEXT NOT NULL,  -- 'tone', 'length', 'structure', etc.
    preference_value TEXT NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.5,  -- 0.00 to 1.00

    source_generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, preference_type, preference_value)
);

-- ============================================
-- Indexes for better query performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_project_id ON generations(project_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learned_preferences_user_id ON learned_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_learned_preferences_confidence ON learned_preferences(confidence_score DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- Enable when using Supabase Auth
-- ============================================

-- ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE learned_preferences ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own preferences" ON user_preferences
--     FOR SELECT USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can update own preferences" ON user_preferences
--     FOR UPDATE USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can insert own preferences" ON user_preferences
--     FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learned_preferences_updated_at
    BEFORE UPDATE ON learned_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
