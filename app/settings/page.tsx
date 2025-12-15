'use client';

import { useState, useEffect } from 'react';
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
} from '../../lib/database.types';
import styles from './page.module.css';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'brand' | 'tone' | 'defaults' | 'contact' | 'boilerplate'>('brand');

  // Form state
  const [brandName, setBrandName] = useState('');
  const [brandTagline, setBrandTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColors, setBrandColors] = useState<BrandColors>(DEFAULT_BRAND_COLORS);
  const [toneSettings, setToneSettings] = useState<ToneSettings>(DEFAULT_TONE_SETTINGS);
  const [defaultSettings, setDefaultSettings] = useState<DefaultSettings>(DEFAULT_SETTINGS);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    phone: '',
    website: '',
    socialHandles: {},
  });
  const [boilerplate, setBoilerplate] = useState<BoilerplateTexts>({
    aboutUs: '',
    legalDisclaimer: '',
    standardCta: '',
    emailSignature: '',
  });

  // Banned/preferred words as comma-separated strings for easy editing
  const [bannedWordsInput, setBannedWordsInput] = useState('');
  const [preferredWordsInput, setPreferredWordsInput] = useState('');
  const [personalityInput, setPersonalityInput] = useState('');

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/preferences');
      const result = await response.json();

      if (result.success && result.data) {
        const prefs = result.data as UserPreferences;
        setBrandName(prefs.brand_name || '');
        setBrandTagline(prefs.brand_tagline || '');
        setLogoUrl(prefs.logo_url || '');
        setBrandColors(prefs.brand_colors || DEFAULT_BRAND_COLORS);
        setToneSettings(prefs.tone_settings || DEFAULT_TONE_SETTINGS);
        setDefaultSettings(prefs.default_settings || DEFAULT_SETTINGS);
        setContactInfo(prefs.contact_info || { email: '', phone: '', website: '', socialHandles: {} });
        setBoilerplate(prefs.boilerplate_texts || { aboutUs: '', legalDisclaimer: '', standardCta: '', emailSignature: '' });

        // Set string inputs
        setBannedWordsInput((prefs.tone_settings?.bannedWords || []).join(', '));
        setPreferredWordsInput((prefs.tone_settings?.preferredWords || []).join(', '));
        setPersonalityInput((prefs.tone_settings?.personality || []).join(', '));
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const preferences: Partial<UserPreferences> = {
        brand_name: brandName || null,
        brand_tagline: brandTagline || null,
        logo_url: logoUrl || null,
        brand_colors: brandColors,
        tone_settings: {
          ...toneSettings,
          personality: personalityInput.split(',').map(s => s.trim()).filter(Boolean),
          bannedWords: bannedWordsInput.split(',').map(s => s.trim()).filter(Boolean),
          preferredWords: preferredWordsInput.split(',').map(s => s.trim()).filter(Boolean),
        },
        default_settings: defaultSettings,
        contact_info: contactInfo,
        boilerplate_texts: boilerplate,
      };

      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      const result = await response.json();

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/" className={styles.backLink}>
            ← Back to Chat
          </a>
          <h1 className={styles.title}>Brand Settings</h1>
          <p className={styles.subtitle}>
            Configure your brand preferences. These will be automatically applied to all generated content.
          </p>
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'brand' ? styles.active : ''}`}
          onClick={() => setActiveTab('brand')}
        >
          Brand Identity
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'tone' ? styles.active : ''}`}
          onClick={() => setActiveTab('tone')}
        >
          Tone & Voice
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'defaults' ? styles.active : ''}`}
          onClick={() => setActiveTab('defaults')}
        >
          Default Settings
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'contact' ? styles.active : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          Contact Info
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'boilerplate' ? styles.active : ''}`}
          onClick={() => setActiveTab('boilerplate')}
        >
          Boilerplate Text
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.content}>
        {/* Brand Identity Tab */}
        {activeTab === 'brand' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Brand Identity</h2>
            <p className={styles.sectionDesc}>
              Basic information about your brand that will be used in generated content.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Brand/Company Name</label>
              <input
                type="text"
                className={styles.input}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Elets Technomedia"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tagline</label>
              <input
                type="text"
                className={styles.input}
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
                placeholder="e.g., Transforming Governance & Healthcare"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Logo URL</label>
              <input
                type="url"
                className={styles.input}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {logoUrl && (
                <div className={styles.logoPreview}>
                  <img src={logoUrl} alt="Logo preview" />
                </div>
              )}
            </div>

            <h3 className={styles.subsectionTitle}>Brand Colors</h3>
            <div className={styles.colorGrid}>
              <div className={styles.colorGroup}>
                <label className={styles.label}>Primary Color</label>
                <div className={styles.colorInput}>
                  <input
                    type="color"
                    value={brandColors.primary}
                    onChange={(e) => setBrandColors({ ...brandColors, primary: e.target.value })}
                  />
                  <input
                    type="text"
                    className={styles.colorText}
                    value={brandColors.primary}
                    onChange={(e) => setBrandColors({ ...brandColors, primary: e.target.value })}
                    placeholder="#0066cc"
                  />
                </div>
              </div>

              <div className={styles.colorGroup}>
                <label className={styles.label}>Secondary Color</label>
                <div className={styles.colorInput}>
                  <input
                    type="color"
                    value={brandColors.secondary}
                    onChange={(e) => setBrandColors({ ...brandColors, secondary: e.target.value })}
                  />
                  <input
                    type="text"
                    className={styles.colorText}
                    value={brandColors.secondary}
                    onChange={(e) => setBrandColors({ ...brandColors, secondary: e.target.value })}
                    placeholder="#6c757d"
                  />
                </div>
              </div>

              <div className={styles.colorGroup}>
                <label className={styles.label}>Accent Color</label>
                <div className={styles.colorInput}>
                  <input
                    type="color"
                    value={brandColors.accent}
                    onChange={(e) => setBrandColors({ ...brandColors, accent: e.target.value })}
                  />
                  <input
                    type="text"
                    className={styles.colorText}
                    value={brandColors.accent}
                    onChange={(e) => setBrandColors({ ...brandColors, accent: e.target.value })}
                    placeholder="#e63946"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tone & Voice Tab */}
        {activeTab === 'tone' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Tone & Voice</h2>
            <p className={styles.sectionDesc}>
              Define the personality and writing style for your generated content.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Formality Level</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="formality"
                    value="formal"
                    checked={toneSettings.formality === 'formal'}
                    onChange={(e) => setToneSettings({ ...toneSettings, formality: 'formal' })}
                  />
                  <span>Formal</span>
                  <small>Professional, corporate tone</small>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="formality"
                    value="neutral"
                    checked={toneSettings.formality === 'neutral'}
                    onChange={(e) => setToneSettings({ ...toneSettings, formality: 'neutral' })}
                  />
                  <span>Neutral</span>
                  <small>Balanced, professional but approachable</small>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="formality"
                    value="casual"
                    checked={toneSettings.formality === 'casual'}
                    onChange={(e) => setToneSettings({ ...toneSettings, formality: 'casual' })}
                  />
                  <span>Casual</span>
                  <small>Friendly, conversational style</small>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Personality Traits</label>
              <input
                type="text"
                className={styles.input}
                value={personalityInput}
                onChange={(e) => setPersonalityInput(e.target.value)}
                placeholder="e.g., professional, friendly, authoritative, innovative"
              />
              <small className={styles.hint}>Comma-separated list of personality traits</small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Words to Avoid</label>
              <input
                type="text"
                className={styles.input}
                value={bannedWordsInput}
                onChange={(e) => setBannedWordsInput(e.target.value)}
                placeholder="e.g., utilize, leverage, synergy, disrupt"
              />
              <small className={styles.hint}>Comma-separated list of words/phrases to avoid</small>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Preferred Words</label>
              <input
                type="text"
                className={styles.input}
                value={preferredWordsInput}
                onChange={(e) => setPreferredWordsInput(e.target.value)}
                placeholder="e.g., use, improve, build, create"
              />
              <small className={styles.hint}>Comma-separated list of preferred words/phrases</small>
            </div>
          </div>
        )}

        {/* Default Settings Tab */}
        {activeTab === 'defaults' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Default Settings</h2>
            <p className={styles.sectionDesc}>
              Set default preferences for content generation.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Preferred Industry/Sector</label>
              <input
                type="text"
                className={styles.input}
                value={defaultSettings.preferredIndustry}
                onChange={(e) => setDefaultSettings({ ...defaultSettings, preferredIndustry: e.target.value })}
                placeholder="e.g., Healthcare, BFSI, Government, Education"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Target Audience</label>
              <input
                type="text"
                className={styles.input}
                value={defaultSettings.audienceType}
                onChange={(e) => setDefaultSettings({ ...defaultSettings, audienceType: e.target.value })}
                placeholder="e.g., C-level executives, IT professionals, Government officials"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Preferred Output Length</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="length"
                    value="short"
                    checked={defaultSettings.outputLength === 'short'}
                    onChange={() => setDefaultSettings({ ...defaultSettings, outputLength: 'short' })}
                  />
                  <span>Short</span>
                  <small>Concise, to-the-point content</small>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="length"
                    value="medium"
                    checked={defaultSettings.outputLength === 'medium'}
                    onChange={() => setDefaultSettings({ ...defaultSettings, outputLength: 'medium' })}
                  />
                  <span>Medium</span>
                  <small>Balanced detail and brevity</small>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="length"
                    value="long"
                    checked={defaultSettings.outputLength === 'long'}
                    onChange={() => setDefaultSettings({ ...defaultSettings, outputLength: 'long' })}
                  />
                  <span>Long</span>
                  <small>Detailed, comprehensive content</small>
                </label>
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={defaultSettings.includeEmojis}
                  onChange={(e) => setDefaultSettings({ ...defaultSettings, includeEmojis: e.target.checked })}
                />
                <span>Include emojis in content</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={defaultSettings.includeStatistics}
                  onChange={(e) => setDefaultSettings({ ...defaultSettings, includeStatistics: e.target.checked })}
                />
                <span>Include statistics and data points when relevant</span>
              </label>
            </div>
          </div>
        )}

        {/* Contact Info Tab */}
        {activeTab === 'contact' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Information</h2>
            <p className={styles.sectionDesc}>
              Contact details to include in CTAs and signatures.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Phone</label>
              <input
                type="tel"
                className={styles.input}
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                placeholder="+91 120 4023456"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Website</label>
              <input
                type="url"
                className={styles.input}
                value={contactInfo.website}
                onChange={(e) => setContactInfo({ ...contactInfo, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <h3 className={styles.subsectionTitle}>Social Handles</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Twitter/X</label>
              <input
                type="text"
                className={styles.input}
                value={contactInfo.socialHandles?.twitter || ''}
                onChange={(e) => setContactInfo({
                  ...contactInfo,
                  socialHandles: { ...contactInfo.socialHandles, twitter: e.target.value }
                })}
                placeholder="@username"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>LinkedIn</label>
              <input
                type="text"
                className={styles.input}
                value={contactInfo.socialHandles?.linkedin || ''}
                onChange={(e) => setContactInfo({
                  ...contactInfo,
                  socialHandles: { ...contactInfo.socialHandles, linkedin: e.target.value }
                })}
                placeholder="company/username"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Facebook</label>
              <input
                type="text"
                className={styles.input}
                value={contactInfo.socialHandles?.facebook || ''}
                onChange={(e) => setContactInfo({
                  ...contactInfo,
                  socialHandles: { ...contactInfo.socialHandles, facebook: e.target.value }
                })}
                placeholder="pagename"
              />
            </div>
          </div>
        )}

        {/* Boilerplate Tab */}
        {activeTab === 'boilerplate' && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Boilerplate Text</h2>
            <p className={styles.sectionDesc}>
              Standard text snippets that can be included in generated content.
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>About Us</label>
              <textarea
                className={styles.textarea}
                value={boilerplate.aboutUs}
                onChange={(e) => setBoilerplate({ ...boilerplate, aboutUs: e.target.value })}
                placeholder="A brief description of your company/organization..."
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Standard Call-to-Action</label>
              <textarea
                className={styles.textarea}
                value={boilerplate.standardCta}
                onChange={(e) => setBoilerplate({ ...boilerplate, standardCta: e.target.value })}
                placeholder="e.g., Visit our website to learn more. Subscribe to our newsletter for updates."
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email Signature</label>
              <textarea
                className={styles.textarea}
                value={boilerplate.emailSignature}
                onChange={(e) => setBoilerplate({ ...boilerplate, emailSignature: e.target.value })}
                placeholder="Standard email signature text..."
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Legal Disclaimer</label>
              <textarea
                className={styles.textarea}
                value={boilerplate.legalDisclaimer}
                onChange={(e) => setBoilerplate({ ...boilerplate, legalDisclaimer: e.target.value })}
                placeholder="Any legal disclaimers or copyright notices..."
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
