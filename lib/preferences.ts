import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabase';
import {
  UserPreferences,
  BrandColors,
  ToneSettings,
  DefaultSettings,
  ContactInfo,
  BoilerplateTexts,
  DEFAULT_BRAND_COLORS,
  DEFAULT_TONE_SETTINGS,
  DEFAULT_SETTINGS,
} from './database.types';

const PREFERENCES_KEY = 'skills-hub-preferences';

// Default empty preferences
export function getEmptyPreferences(): Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    brand_name: null,
    brand_tagline: null,
    logo_url: null,
    brand_colors: DEFAULT_BRAND_COLORS,
    tone_settings: DEFAULT_TONE_SETTINGS,
    default_settings: DEFAULT_SETTINGS,
    contact_info: null,
    boilerplate_texts: null,
  };
}

// Load preferences from localStorage (single-user mode)
export function loadLocalPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load preferences from localStorage:', error);
  }
  return null;
}

// Save preferences to localStorage (single-user mode)
export function saveLocalPreferences(preferences: Partial<UserPreferences>): UserPreferences {
  const existing = loadLocalPreferences();
  const updated: UserPreferences = {
    id: existing?.id || 'local-preferences',
    user_id: getCurrentUserId(),
    brand_name: preferences.brand_name ?? existing?.brand_name ?? null,
    brand_tagline: preferences.brand_tagline ?? existing?.brand_tagline ?? null,
    logo_url: preferences.logo_url ?? existing?.logo_url ?? null,
    brand_colors: preferences.brand_colors ?? existing?.brand_colors ?? DEFAULT_BRAND_COLORS,
    tone_settings: preferences.tone_settings ?? existing?.tone_settings ?? DEFAULT_TONE_SETTINGS,
    default_settings: preferences.default_settings ?? existing?.default_settings ?? DEFAULT_SETTINGS,
    contact_info: preferences.contact_info ?? existing?.contact_info ?? null,
    boilerplate_texts: preferences.boilerplate_texts ?? existing?.boilerplate_texts ?? null,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
  }

  return updated;
}

// Load preferences (Supabase or localStorage)
export async function loadPreferences(): Promise<UserPreferences | null> {
  const userId = getCurrentUserId();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase error loading preferences:', error);
      }

      if (data) {
        return data as UserPreferences;
      }
    } catch (error) {
      console.error('Failed to load preferences from Supabase:', error);
    }
  }

  // Fallback to localStorage
  return loadLocalPreferences();
}

// Save preferences (Supabase or localStorage)
export async function savePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
  const userId = getCurrentUserId();

  if (isSupabaseConfigured && supabase) {
    try {
      const existing = await loadPreferences();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('user_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data as UserPreferences;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            ...getEmptyPreferences(),
            ...preferences,
          })
          .select()
          .single();

        if (error) throw error;
        return data as UserPreferences;
      }
    } catch (error) {
      console.error('Failed to save preferences to Supabase:', error);
    }
  }

  // Fallback to localStorage
  return saveLocalPreferences(preferences);
}

// Build context string from preferences for AI prompts
export function buildPreferencesContext(prefs: UserPreferences | null): string {
  if (!prefs) return '';

  const parts: string[] = [];

  // Brand Identity
  if (prefs.brand_name) {
    parts.push(`Brand: ${prefs.brand_name}${prefs.brand_tagline ? ` - "${prefs.brand_tagline}"` : ''}`);
  }

  // Brand Colors
  if (prefs.brand_colors) {
    const colors = prefs.brand_colors;
    parts.push(`Brand Colors: Primary ${colors.primary}, Secondary ${colors.secondary}, Accent ${colors.accent}`);
  }

  // Tone & Voice
  if (prefs.tone_settings) {
    const tone = prefs.tone_settings;
    const formalityMap = { formal: 'Formal', neutral: 'Professional', casual: 'Casual/Friendly' };
    parts.push(`Tone: ${formalityMap[tone.formality] || 'Professional'}${tone.personality.length > 0 ? `, ${tone.personality.join(', ')}` : ''}`);

    if (tone.bannedWords.length > 0) {
      parts.push(`Avoid words: ${tone.bannedWords.join(', ')}`);
    }
    if (tone.preferredWords.length > 0) {
      parts.push(`Prefer words: ${tone.preferredWords.join(', ')}`);
    }
  }

  // Default Settings
  if (prefs.default_settings) {
    const settings = prefs.default_settings;
    if (settings.preferredIndustry) {
      parts.push(`Industry focus: ${settings.preferredIndustry}`);
    }
    if (settings.audienceType) {
      parts.push(`Target audience: ${settings.audienceType}`);
    }
    const lengthMap = { short: 'Concise', medium: 'Standard', long: 'Detailed' };
    parts.push(`Output length: ${lengthMap[settings.outputLength]}`);
    parts.push(`Include emojis: ${settings.includeEmojis ? 'Yes' : 'No'}`);
    parts.push(`Include statistics: ${settings.includeStatistics ? 'Yes' : 'No'}`);
  }

  // Contact Info
  if (prefs.contact_info) {
    const contact = prefs.contact_info;
    if (contact.website) {
      parts.push(`Website for CTAs: ${contact.website}`);
    }
    if (contact.email) {
      parts.push(`Contact email: ${contact.email}`);
    }
  }

  // Boilerplate
  if (prefs.boilerplate_texts) {
    const boiler = prefs.boilerplate_texts;
    if (boiler.aboutUs) {
      parts.push(`About Us: ${boiler.aboutUs}`);
    }
    if (boiler.standardCta) {
      parts.push(`Standard CTA: ${boiler.standardCta}`);
    }
  }

  if (parts.length === 0) return '';

  return `
## USER BRAND & PREFERENCES
Apply these brand guidelines and preferences to all generated content:
${parts.map(p => `- ${p}`).join('\n')}

`;
}
