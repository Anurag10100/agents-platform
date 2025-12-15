// Database types for the Memory & Context System
// These types correspond to the Supabase schema

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background?: string;
  text?: string;
}

export interface ToneSettings {
  formality: 'formal' | 'neutral' | 'casual'; // Formal ↔ Casual
  personality: string[]; // e.g., ['friendly', 'professional', 'authoritative']
  bannedWords: string[]; // Words to avoid
  preferredWords: string[]; // Words to prefer
}

export interface BoilerplateTexts {
  aboutUs: string;
  legalDisclaimer: string;
  standardCta: string;
  emailSignature: string;
}

export interface DefaultSettings {
  preferredIndustry: string;
  audienceType: string;
  outputLength: 'short' | 'medium' | 'long';
  includeEmojis: boolean;
  includeStatistics: boolean;
}

export interface ContactInfo {
  email: string;
  phone: string;
  website: string;
  socialHandles: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
}

export interface UserPreferences {
  id: string;
  user_id: string;
  // Brand Identity
  brand_name: string | null;
  brand_tagline: string | null;
  logo_url: string | null;
  brand_colors: BrandColors | null;
  // Tone & Voice
  tone_settings: ToneSettings | null;
  // Default Settings
  default_settings: DefaultSettings | null;
  // Contact Info
  contact_info: ContactInfo | null;
  // Boilerplate
  boilerplate_texts: BoilerplateTexts | null;
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ProjectContext {
  name: string;
  description: string;
  dates?: { start: string; end: string };
  venue?: string;
  targetAudience?: string;
  themes?: string[];
  speakers?: Array<{ name: string; title: string; company: string }>;
  sponsors?: string[];
  customFields?: Record<string, string>;
}

export interface ProjectAsset {
  id: string;
  name: string;
  type: 'image' | 'document' | 'logo';
  url: string;
  uploadedAt: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  context: ProjectContext | null;
  assets: ProjectAsset[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GenerationFeedback {
  rating?: number; // 1-5
  tweaks?: string[]; // What user changed
  regenerated?: boolean;
  comments?: string;
}

export interface Generation {
  id: string;
  project_id: string | null;
  user_id: string;
  skill_id: string;
  skill_name: string;
  input_message: string;
  output_content: string;
  output_format: 'html' | 'markdown' | 'text';
  source_urls: string[];
  feedback: GenerationFeedback | null;
  created_at: string;
}

export interface LearnedPreference {
  id: string;
  user_id: string;
  preference_type: 'tone' | 'length' | 'structure' | 'complexity' | 'emoji' | 'cta_style' | 'data_density';
  preference_value: string;
  confidence_score: number; // 0.0 to 1.0
  source_generation_id: string | null;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface PreferencesResponse {
  success: boolean;
  data?: UserPreferences;
  error?: string;
}

export interface ProjectsResponse {
  success: boolean;
  data?: Project[];
  error?: string;
}

// Default values
export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: '#0066cc',
  secondary: '#6c757d',
  accent: '#e63946',
  background: '#ffffff',
  text: '#212529',
};

export const DEFAULT_TONE_SETTINGS: ToneSettings = {
  formality: 'neutral',
  personality: ['professional'],
  bannedWords: [],
  preferredWords: [],
};

export const DEFAULT_SETTINGS: DefaultSettings = {
  preferredIndustry: '',
  audienceType: '',
  outputLength: 'medium',
  includeEmojis: false,
  includeStatistics: true,
};
