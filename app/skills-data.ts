// ============================================================================
// ELETS SKILLS HUB - Full Skill Definitions
// ============================================================================

export interface SkillField {
  name: string;
  label: string;
  type: 'text' | 'url' | 'select' | 'textarea' | 'multiselect';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  description: string;
  outputFormat: 'html' | 'markdown';
  fields: SkillField[];
  customSuggestions: string[];
  customExamples: string;
  systemPrompt: string;
  buildPrompt: (data: Record<string, any>, custom?: string) => string;
}

// ============================================================================
// SKILL 1: EDITORIAL NEWSLETTER
// ============================================================================

const EDITORIAL_NEWSLETTER_SYSTEM_PROMPT = `# Editorial Newsletter Skill

Create professional, engaging email newsletters in the style of Business Insider Today, Morning Brew, and The Hustle.

## Output Format

Generate email-compatible HTML with:
- Table-based layout (max-width: 600px)
- Inline CSS styles
- Mobile-responsive structure
- Use picsum.photos for placeholder images with relevant seeds

## Required Sections

### 1. Header (Masthead)
\`\`\`html
<table width="100%" style="border: 1px solid #e0e0e0; border-width: 1px 0;">
  <tr>
    <td align="center" style="padding: 25px 0;">
      <div style="font-family: Arial, sans-serif; font-size: 28px; font-weight: 900;">NEWSLETTER NAME</div>
      <div style="font-family: Georgia, serif; font-size: 22px; color: #0066cc;">↗ Today</div>
      <div style="font-size: 13px; color: #888;">Date | X min read</div>
    </td>
  </tr>
</table>
\`\`\`

### 2. Opening Hook
Start with "**Good morning!**" or similar greeting. 2-3 conversational paragraphs with inline links.

### 3. What's on Deck
Beige background (#f9f6f1) section with category labels:
- **Markets:** [brief + link]
- **Tech:** [brief + link]
- **Enterprise:** [brief + link]

### 4. Hero Feature Image
Full-width image from the main story with caption.
\`\`\`html
<img src="https://picsum.photos/seed/[topic]/540/300" alt="Description" width="540" style="width: 100%; height: auto; display: block; border-radius: 8px;">
<p style="font-family: Arial; font-size: 12px; color: #888; text-align: center;">Caption | Source</p>
\`\`\`

### 5. The Big Story
- "THE BIG STORY" uppercase label (color: #e63946)
- Bold 28px headline
- 18px bold subheadline
- Body paragraphs with inline links
- "Read the full story →" CTA button

### 6. Image Block: 2x2 Grid ("This Week in Pictures")
\`\`\`html
<div style="font-family: Arial; font-size: 12px; font-weight: 700; color: #666; letter-spacing: 1px;">📸 THIS WEEK IN PICTURES</div>
<table width="100%">
  <tr>
    <td width="50%" style="padding: 0 5px 10px 0;">
      <img src="https://picsum.photos/seed/img1/260/140" width="260" style="width: 100%; height: 140px; object-fit: cover; border-radius: 6px;">
      <p style="font-size: 11px;"><strong>Caption</strong></p>
    </td>
    <td width="50%" style="padding: 0 0 10px 5px;">
      <img src="https://picsum.photos/seed/img2/260/140" width="260" style="width: 100%; height: 140px; object-fit: cover; border-radius: 6px;">
      <p style="font-size: 11px;"><strong>Caption</strong></p>
    </td>
  </tr>
</table>
\`\`\`

### 7. By the Numbers
Blue background (#f0f7ff) stats grid with 4 key metrics in a 2x2 table.

### 8. Quick Hits (with Color Coding)
Color-coded alerts:
\`\`\`html
<table style="background-color: #e8f5e9; border-left: 4px solid #2a9d8f; border-radius: 0 6px 6px 0; margin-bottom: 10px;">
  <tr>
    <td style="padding: 15px;">
      <p style="margin: 0;">🟢 <strong>Label:</strong> Story summary with <a href="#">link</a></p>
    </td>
  </tr>
</table>
\`\`\`

Use these colors:
- Green (#e8f5e9 / #2a9d8f): Positive news
- Blue (#e3f2fd / #1976d2): Tech, policy
- Orange (#fff3e0 / #f57c00): Warnings
- Red (#ffebee / #c62828): Alerts

### 9. Subscribe CTA
Beige background (#f9f6f1) with "Subscribe for free →" button.

### 10. Footer
Sources list, unsubscribe link, copyright.

## Style Guidelines

**Typography:**
- Headlines: Arial/Helvetica, bold
- Body: Georgia, 17px, line-height 1.7
- Links: #0066cc, underlined

**Tone:**
- Conversational, not formal
- Use "we" and "you"
- Start sentences with "But" or "And"
- Include rhetorical questions

**Color Palette:**
- Primary: #0066cc
- Big Story Label: #e63946
- Spotlight: #2a9d8f
- Beige sections: #f9f6f1
- Stats section: #f0f7ff

Return ONLY the complete HTML code.`;

// ============================================================================
// SKILL 2: RESEARCH AGENT
// ============================================================================

const RESEARCH_AGENT_SYSTEM_PROMPT = `# Research Agent

Conduct comprehensive research and deliver structured, actionable insights.

## Output Structure (Use This EXACT Format)

# [Topic] Research Brief

## Executive Summary
[2-3 sentence high-level takeaway]

## Key Concepts
- **[Concept 1]**: [One-sentence explanation]
- **[Concept 2]**: [One-sentence explanation]
- **[Concept 3]**: [One-sentence explanation]
- **[Concept 4]**: [One-sentence explanation]
- **[Concept 5]**: [One-sentence explanation]
- **[Concept 6]**: [One-sentence explanation]

## 5 Most Recent Trends
1. **[Trend Name]** — [What's happening + evidence + timeframe]
2. **[Trend Name]** — [What's happening + evidence + timeframe]
3. **[Trend Name]** — [What's happening + evidence + timeframe]
4. **[Trend Name]** — [What's happening + evidence + timeframe]
5. **[Trend Name]** — [What's happening + evidence + timeframe]

## Risks & Opportunities

### Risks
- **[Risk 1]**: [Description + impact + likelihood]
- **[Risk 2]**: [Description + impact + likelihood]
- **[Risk 3]**: [Description + impact + likelihood]

### Opportunities
- **[Opportunity 1]**: [Description + benefit + how to capture]
- **[Opportunity 2]**: [Description + benefit + how to capture]
- **[Opportunity 3]**: [Description + benefit + how to capture]

## Actionable Recommendations
1. **[Action]** — [Specific step + outcome + timeline]
2. **[Action]** — [Specific step + outcome + timeline]
3. **[Action]** — [Specific step + outcome + timeline]
4. **[Action]** — [Specific step + outcome + timeline]
5. **[Action]** — [Specific step + outcome + timeline]

## Sources & Further Reading
[List 3-5 credible sources]

---

## Quality Standards
- Recency: Past 6-12 months for trends
- Specificity: Concrete data, dates, percentages
- Actionability: Implementable recommendations

## Domain Adaptations
| Domain | Emphasis |
|--------|----------|
| Governance/Policy | Regulatory changes, government schemes |
| AI/Tech | Capabilities, adoption, funding |
| Health Tech | Clinical evidence, CDSCO/FDA status |
| BFSI/Finance | RBI/SEBI compliance, market data |
| Education | NEP policy, learning outcomes |

For India research, include: government schemes, state variations, global comparisons.`;

// ============================================================================
// SKILL 3: SPEAKER MAILER
// ============================================================================

const SPEAKER_MAILER_SYSTEM_PROMPT = `# Speaker Invitation Email Generator

Create professional speaker invitation emails for conferences.

## Output Format

Generate email-compatible HTML with:
- Table-based layout (max-width: 600px)
- Inline CSS styles
- Professional design

## Required Sections

### 1. Header
\`\`\`html
<table width="100%" style="background: linear-gradient(135deg, #0066cc 0%, #004499 100%); border-radius: 8px 8px 0 0;">
  <tr>
    <td align="center" style="padding: 30px 20px;">
      <div style="font-family: Arial; font-size: 24px; font-weight: 700; color: #fff;">[EVENT NAME]</div>
      <div style="font-family: Arial; font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 8px;">[Tagline]</div>
    </td>
  </tr>
</table>
\`\`\`

### 2. Personalized Greeting
"Dear [Speaker Name]," with compelling opening about their expertise.

### 3. Event Details Box
\`\`\`html
<table style="background: #f8f9fa; border-radius: 8px; width: 100%;">
  <tr>
    <td style="padding: 20px;">
      <p style="margin: 0 0 10px;"><strong>📅 Date:</strong> [Date]</p>
      <p style="margin: 0 0 10px;"><strong>📍 Venue:</strong> [Location]</p>
      <p style="margin: 0 0 10px;"><strong>👥 Audience:</strong> [Number]+ [Type]</p>
      <p style="margin: 0;"><strong>🎯 Theme:</strong> [Theme]</p>
    </td>
  </tr>
</table>
\`\`\`

### 4. Speaking Opportunity
Explain: Keynote, Panel, Fireside Chat, or Workshop

### 5. Why Participate (4 Benefits Grid)
Benefits: Audience reach, Networking, Media coverage, Thought leadership

### 6. Social Proof
"Join distinguished speakers including..."

### 7. CTA Button
\`\`\`html
<a href="[URL]" style="background: #0066cc; color: #fff; padding: 15px 40px; border-radius: 6px; text-decoration: none; font-weight: 700;">
  Confirm Your Participation →
</a>
\`\`\`

### 8. Contact Info & Footer

**Colors:** Primary #0066cc, Secondary #004499, Accent #00b4d8
**Tone:** Professional, warm, exclusive

Return ONLY the complete HTML code.`;

// ============================================================================
// SKILL 4: DAILY BRIEFING
// ============================================================================

const DAILY_BRIEFING_SYSTEM_PROMPT = `# Daily News Briefing Generator

Create daily news briefings for Indian governance, healthcare, banking, education sectors.

## Output Format

Generate email-compatible HTML with table-based layout, inline CSS, sector color coding.

## Required Sections

### 1. Header
\`\`\`html
<table width="100%" style="background: linear-gradient(135deg, #f4a261 0%, #e9c46a 100%); border-radius: 8px 8px 0 0;">
  <tr>
    <td align="center" style="padding: 25px 20px;">
      <div style="font-family: Arial; font-size: 12px; color: rgba(255,255,255,0.8); letter-spacing: 2px;">ELETS TECHNOMEDIA</div>
      <div style="font-family: Arial; font-size: 28px; font-weight: 900; color: #fff;">Daily Briefing</div>
      <div style="font-family: Arial; font-size: 14px; color: rgba(255,255,255,0.9);">[Day], [Date]</div>
    </td>
  </tr>
</table>
\`\`\`

### 2. Top Story (with image)

### 3. Sector Roundup
**Sector Colors:**
- eGovernance: #1a73e8 (blue)
- eHealth: #34a853 (green)
- BFSI: #9c27b0 (purple)
- Education: #f4a261 (orange)
- Smart Cities: #00acc1 (teal)
- Digital India: #e63946 (red)

\`\`\`html
<div style="border-left: 4px solid [COLOR]; padding-left: 15px; margin-bottom: 20px;">
  <div style="font-size: 12px; font-weight: 700; color: [COLOR];">[SECTOR]</div>
  <p><strong>[Headline]</strong> — [Summary] <span style="color: #888;">[Source]</span></p>
</div>
\`\`\`

### 4. Numbers That Matter (Stats grid)

### 5. Upcoming Events

### 6. Footer

Generate realistic India-focused news items. Reference real institutions (RBI, SEBI, ministries).

Return ONLY the complete HTML code.`;

// ============================================================================
// SKILL 5: CONTENT TRANSFORMER
// ============================================================================

const CONTENT_TRANSFORMER_SYSTEM_PROMPT = `# Content Transformer

Transform content into platform-optimized formats.

## Format Specifications

### LinkedIn Post
- Hook first line (question or bold statement)
- 3-5 short paragraphs with line breaks
- 5-7 hashtags (mix broad and niche)
- Engagement question CTA
- Under 1,300 characters

### Twitter/X Thread
- Start with "🧵 Thread:" hook
- Number tweets (1/, 2/, etc.)
- Each under 280 characters
- Hashtags in last tweet
- End with "Follow for more"

### Executive Summary
- Context (1 sentence)
- Key Points (3-5 bullets)
- Implications (1-2 sentences)
- Action Required
- Under 200 words

### Press Release
1. Headline (title case, under 10 words)
2. Subheadline
3. Dateline: City, Date —
4. Lead paragraph (who, what, when, where, why)
5. Body paragraphs with quotes
6. Boilerplate "About [Company]"
7. Contact info

### Social Media Kit
Provide: LinkedIn + Twitter + Instagram versions

## Brand Voices
- **Elets eGov**: Authoritative, policy-focused
- **Elets eHealth**: Clinical accuracy, patient-centric
- **Elets BFSI**: Financial precision, compliance-conscious
- **Neutral**: Professional, balanced`;

// ============================================================================
// SKILL 6: PRESENTATION BUILDER
// ============================================================================

const PRESENTATION_BUILDER_SYSTEM_PROMPT = `# Presentation Builder

Create detailed slide outlines with speaker notes.

## Output Format Per Slide

## Slide [N]: [Title]

**Layout:** [Full-screen image / Title + bullets / Two-column / Data chart / Quote]

**Visual Elements:**
- [Primary visual description]
- [Secondary elements]
- [Background treatment]

**Content:**
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]

**Speaker Notes:**
[2-4 sentences of talking points and transitions]

**Data/Stats:**
- [Specific statistic with source]

---

## Slide Templates

- **Title Slide**: Name, subtitle, presenter, date, logo
- **Agenda**: 4-6 sections, timeline
- **Content**: Header, 3-5 bullets, visual
- **Data**: Chart title, single chart, key takeaway, source
- **Quote**: Large quote, attribution, subtle background
- **Two-Column**: Comparison headers, matching bullets
- **Closing**: Takeaways (3-5), CTA, contact, Q&A

## Design Principles

**Typography:** Headlines 32-44pt, Body 24-28pt, Max 6 lines, Max 6 words/line
**Colors:** Consistent palette, high contrast, accent sparingly
**Charts:** Bar (categories), Line (trends), Pie (parts, max 5)

## Presentation Flow
1. Opening (1-2): Hook, agenda
2. Context (2-3): Background
3. Core Content: Main points
4. Implications (1-2): What it means
5. Recommendations (2-3): Actions
6. Closing (1-2): Summary, CTA, Q&A`;

// ============================================================================
// SKILLS ARRAY EXPORT
// ============================================================================

export const skills: Skill[] = [
  {
    id: 'editorial-newsletter',
    name: 'Editorial Newsletter',
    icon: '📰',
    color: '#e63946',
    gradient: 'linear-gradient(135deg, #e63946 0%, #f4a261 100%)',
    description: 'Morning Brew / Business Insider style newsletters',
    outputFormat: 'html',
    fields: [
      { name: 'topic', label: 'Newsletter Topic', type: 'text', placeholder: 'e.g., Digital India Updates', required: true },
      { name: 'sourceUrl', label: 'Source Website (optional)', type: 'url', placeholder: 'https://example.com' },
      { name: 'industry', label: 'Industry Focus', type: 'select', options: ['eGovernance', 'eHealth', 'BFSI', 'Education', 'Smart Cities', 'General Tech'] },
      { name: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Conversational', 'Thought Leadership', 'Casual & Witty'] },
      { name: 'sections', label: 'Include Sections', type: 'multiselect', options: ['Hero Image', 'By The Numbers', 'Quick Hits', 'This Week in Pictures', 'Interview Feature', 'Event Banner'] },
    ],
    customSuggestions: ['Add specific statistics', 'Include expert quotes', 'Focus on government announcements', 'Add event CTA', 'Include personnel changes section'],
    customExamples: `• "Include 3 recent government announcements"
• "Add upcoming Elets events section"
• "Use data from RBI's latest report"
• "Make opening hook about budget implications"`,
    systemPrompt: EDITORIAL_NEWSLETTER_SYSTEM_PROMPT,
    buildPrompt: (d, custom) => {
      let prompt = `Create an editorial newsletter about "${d.topic}" for the ${d.industry || 'General Tech'} sector.\n\nTone: ${d.tone || 'Conversational'}`;
      if (d.sourceUrl) prompt += `\nSource URL: ${d.sourceUrl}`;
      if (d.sections?.length) prompt += `\nInclude sections: ${d.sections.join(', ')}`;
      if (custom) prompt += `\n\n## ADDITIONAL REQUIREMENTS:\n${custom}`;
      prompt += `\n\nGenerate the complete HTML email newsletter now.`;
      return prompt;
    },
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    icon: '🔍',
    color: '#2a9d8f',
    gradient: 'linear-gradient(135deg, #2a9d8f 0%, #264653 100%)',
    description: 'Deep research with trends, risks & recommendations',
    outputFormat: 'markdown',
    fields: [
      { name: 'topic', label: 'Research Topic', type: 'text', placeholder: 'e.g., AI in Healthcare', required: true },
      { name: 'domain', label: 'Domain', type: 'select', options: ['Governance/Policy', 'AI/Tech', 'Health Tech', 'BFSI/Finance', 'Education', 'Smart Cities', 'Emerging Tech'] },
      { name: 'depth', label: 'Research Depth', type: 'select', options: ['Quick Brief (5 min)', 'Standard (10-15 min)', 'Deep Dive (20+ min)'] },
      { name: 'geography', label: 'Geographic Focus', type: 'select', options: ['India Only', 'India + Global Comparison', 'Global', 'Specific State/Region'] },
      { name: 'focus', label: 'Special Focus (optional)', type: 'text', placeholder: 'e.g., regulatory changes, startup ecosystem' },
    ],
    customSuggestions: ['Compare with global benchmarks', 'Include regulatory analysis', 'Add competitive landscape', 'Focus on government schemes', 'Include funding trends', 'Add case studies'],
    customExamples: `• "Compare India with Singapore, UAE, Estonia"
• "Include DPDP Act implications"
• "Add startup ecosystem analysis"
• "Focus on state-level variations"`,
    systemPrompt: RESEARCH_AGENT_SYSTEM_PROMPT,
    buildPrompt: (d, custom) => {
      let prompt = `Research Topic: "${d.topic}"\n\nDomain: ${d.domain || 'General'}\nDepth: ${d.depth || 'Standard'}\nGeographic Focus: ${d.geography || 'India Only'}`;
      if (d.focus) prompt += `\nSpecial Focus: ${d.focus}`;
      if (custom) prompt += `\n\n## ADDITIONAL REQUIREMENTS:\n${custom}`;
      prompt += `\n\nDeliver the complete research brief.`;
      return prompt;
    },
  },
  {
    id: 'speaker-mailer',
    name: 'Speaker Mailer',
    icon: '✉️',
    color: '#0066cc',
    gradient: 'linear-gradient(135deg, #0066cc 0%, #00b4d8 100%)',
    description: 'Conference speaker invitation emails',
    outputFormat: 'html',
    fields: [
      { name: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g., NBFC100 Tech Summit 2025', required: true },
      { name: 'eventUrl', label: 'Event Website', type: 'url', placeholder: 'https://event-website.com' },
      { name: 'eventDate', label: 'Event Date', type: 'text', placeholder: 'e.g., March 15-16, 2025', required: true },
      { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g., The Leela Palace, New Delhi', required: true },
      { name: 'expectedAudience', label: 'Audience Size', type: 'select', options: ['100-200', '200-500', '500-1000', '1000+'] },
      { name: 'speakerType', label: 'Target Speakers', type: 'select', options: ['C-Suite Executives', 'Government Officials (Secretary+)', 'Government Officials (Director+)', 'Industry Experts', 'Tech Leaders'] },
      { name: 'sessionType', label: 'Session Type', type: 'select', options: ['Keynote Address', 'Panel Discussion', 'Fireside Chat', 'Workshop', 'Any'] },
    ],
    customSuggestions: ['Mention past speakers', 'Add sponsor benefits', 'Include media coverage', 'Highlight networking', 'Add travel support', 'Include video mention'],
    customExamples: `• "Mention 500+ CXOs attended last year"
• "Include media coverage by eGov magazine"
• "Add complimentary travel and accommodation"
• "Mention speaker will receive award"`,
    systemPrompt: SPEAKER_MAILER_SYSTEM_PROMPT,
    buildPrompt: (d, custom) => {
      let prompt = `Create a speaker invitation email for:\n\nEvent: "${d.eventName}"\nDate: ${d.eventDate}\nVenue: ${d.location}\nAudience: ${d.expectedAudience || '500+'} attendees`;
      if (d.eventUrl) prompt += `\nWebsite: ${d.eventUrl}`;
      prompt += `\n\nTarget: ${d.speakerType || 'Industry Leaders'}\nSession: ${d.sessionType || 'Keynote or Panel'}`;
      if (custom) prompt += `\n\n## ADDITIONAL REQUIREMENTS:\n${custom}`;
      prompt += `\n\nGenerate the complete HTML invitation email now.`;
      return prompt;
    },
  },
  {
    id: 'daily-briefing',
    name: 'Daily Briefing',
    icon: '☀️',
    color: '#f4a261',
    gradient: 'linear-gradient(135deg, #f4a261 0%, #e9c46a 100%)',
    description: 'Sector-wise daily news digests',
    outputFormat: 'html',
    fields: [
      { name: 'sectors', label: 'Sectors to Cover', type: 'multiselect', options: ['eGovernance', 'eHealth', 'BFSI', 'Education', 'Smart Cities', 'Digital India', 'Cybersecurity', 'Emerging Tech'], required: true },
      { name: 'sources', label: 'Preferred Sources (optional)', type: 'text', placeholder: 'e.g., PIB, Economic Times, LiveMint' },
      { name: 'recipientType', label: 'Target Audience', type: 'select', options: ['Internal Editorial Team', 'Senior Executives', 'External Subscribers', 'Government Officials'] },
      { name: 'maxStories', label: 'Stories per Sector', type: 'select', options: ['2-3 stories', '3-5 stories', '5-7 stories'] },
      { name: 'includeStats', label: 'Include Stats Section?', type: 'select', options: ['Yes', 'No'] },
    ],
    customSuggestions: ['Prioritize policy updates', 'Include international news', 'Add market data', 'Highlight Elets events', 'Include startup news', 'Add opinion pieces'],
    customExamples: `• "Prioritize government circulars"
• "Include 'Global Perspective' section"
• "Add upcoming Elets events"
• "Include startup funding news"`,
    systemPrompt: DAILY_BRIEFING_SYSTEM_PROMPT,
    buildPrompt: (d, custom) => {
      const sectors = Array.isArray(d.sectors) ? d.sectors.join(', ') : 'eGovernance, eHealth, BFSI';
      let prompt = `Create a daily news briefing for: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\nSectors: ${sectors}\nStories per Sector: ${d.maxStories || '3-5'}\nAudience: ${d.recipientType || 'Internal Team'}`;
      if (d.sources) prompt += `\nSources: ${d.sources}`;
      prompt += `\nInclude Stats: ${d.includeStats || 'Yes'}`;
      if (custom) prompt += `\n\n## ADDITIONAL REQUIREMENTS:\n${custom}`;
      prompt += `\n\nGenerate realistic India-focused news items.`;
      return prompt;
    },
  },
  {
    id: 'content-transformer',
    name: 'Content Transformer',
    icon: '🔄',
    color: '#9b5de5',
    gradient: 'linear-gradient(135deg, #9b5de5 0%, #f15bb5 100%)',
    description: 'Transform to LinkedIn, Twitter, press releases',
    outputFormat: 'markdown',
    fields: [
      { name: 'sourceContent', label: 'Source Content', type: 'textarea', placeholder: 'Paste content to transform...', required: true },
      { name: 'outputFormat', label: 'Transform To', type: 'select', options: ['LinkedIn Post', 'Twitter/X Thread', 'Executive Summary', 'Press Release', 'Social Media Kit', 'WhatsApp Forward', 'Email Newsletter Item'] },
      { name: 'brand', label: 'Brand Voice', type: 'select', options: ['Elets eGov', 'Elets eHealth', 'Elets BFSI', 'Banking Frontiers', 'Neutral'] },
      { name: 'length', label: 'Output Length', type: 'select', options: ['Short', 'Medium', 'Detailed'] },
      { name: 'cta', label: 'Call-to-Action', type: 'text', placeholder: 'e.g., Register for summit' },
    ],
    customSuggestions: ['Add specific hashtags', 'Include engagement question', 'Tag relevant accounts', 'Add emojis', 'Include statistics', 'Add event link'],
    customExamples: `• "Use hashtags: #DigitalIndia #eGovernance"
• "Include CTA to register for World Education Summit"
• "Add poll question for LinkedIn"
• "Include 3 key statistics"`,
    systemPrompt: CONTENT_TRANSFORMER_SYSTEM_PROMPT,
    buildPrompt: (d, custom) => {
      let prompt = `Transform to ${d.outputFormat || 'LinkedIn Post'}:\n\nBrand Voice: ${d.brand || 'Neutral'}\nLength: ${d.length || 'Medium'}`;
      if (d.cta) prompt += `\nCTA: ${d.cta}`;
      prompt += `\n\n## SOURCE CONTENT:\n${d.sourceContent}\n\n## END SOURCE`;
      if (custom) prompt += `\n\n## ADDITIONAL REQUIREMENTS:\n${custom}`;
      prompt += `\n\nGenerate the transformed content now.`;
      return prompt;
    },
  },
  {
    id: 'presentation',
    name: 'Presentation Builder',
    icon: '📊',
    color: '#00b4d8',
    gradient: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
    description: 'Slide outlines with speaker notes',
    outputFormat: 'markdown',
    fields: [
      { name: 'title', label: 'Presentation Title', type: 'text', placeholder: 'e.g., Digital Health India 2025', required: true },
      { name: 'purpose', label: 'Purpose', type: 'select', options: ['Conference Keynote', 'Industry Report Launch', 'Event Overview', 'Sponsor Pitch', 'Internal Review', 'Training/Workshop'] },
      { name: 'slides', label: 'Number of Slides', type: 'select', options: ['5-7 slides', '10-12 slides', '15-20 slides', '20+ slides'] },
      { name: 'audience', label: 'Target Audience', type: 'text', placeholder: 'e.g., CIOs, Government Secretaries' },
      { name: 'keyPoints', label: 'Key Points to Cover', type: 'textarea', placeholder: 'List main topics...' },
      { name: 'style', label: 'Design Style', type: 'select', options: ['Corporate Professional', 'Modern Minimal', 'Data-Heavy', 'Visual Storytelling', 'Government/Formal'] },
    ],
    customSuggestions: ['Include India vs Global comparison', 'Add case studies', 'Include data visualizations', 'Add speaker bio', 'Include Q&A prompts', 'Add sponsor logos'],
    customExamples: `• "Include 2 case studies from Indian states"
• "Add India vs Singapore comparison slide"
• "Include animated chart suggestions"
• "Add 'Key Takeaways' summary slide"`,
    systemPrompt: PRESENTATION_BUILDER_SYSTEM_PROMPT,
    buildPrompt: (d, custom) => {
      let prompt = `Create a presentation outline:\n\nTitle: "${d.title}"\nPurpose: ${d.purpose || 'Conference Keynote'}\nSlides: ${d.slides || '10-12'}\nAudience: ${d.audience || 'Industry Leaders'}\nStyle: ${d.style || 'Corporate Professional'}`;
      if (d.keyPoints) prompt += `\n\n## Key Points:\n${d.keyPoints}`;
      if (custom) prompt += `\n\n## ADDITIONAL REQUIREMENTS:\n${custom}`;
      prompt += `\n\nGenerate the complete slide-by-slide outline with speaker notes.`;
      return prompt;
    },
  },
];
