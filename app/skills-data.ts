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
      { name: 'industry', label: 'Industry Focus', type: 'select', options: ['eGovernance', 'eHealth', 'BFSI', 'Education', 'General Tech'] },
      { name: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Conversational', 'Thought Leadership'] },
    ],
    customSuggestions: [
      'Add specific statistics',
      'Include expert quotes',
      'Focus on recent announcements',
      'Add call-to-action for event',
      'Include infographic section',
    ],
    customExamples: `• "Include 3 recent government announcements from this week"
• "Add a section highlighting upcoming Elets events"
• "Use data from RBI's latest report"
• "Include quotes from industry leaders"
• "Make the opening hook about budget implications"`,
    systemPrompt: `Create email newsletters in Morning Brew/Business Insider style. Output email-compatible HTML with table-based layout (600px max), inline CSS.

Include: Header masthead, "Good morning!" hook, What's on Deck section (beige #f9f6f1), The Big Story (red label #e63946), By the Numbers (blue #f0f7ff), Quick Hits, Subscribe CTA, Footer.

Style: Arial headlines, Georgia body 17px, links #0066cc, conversational tone. Return ONLY HTML.`,
    buildPrompt: (d, custom) =>
      `Create newsletter about "${d.topic}" for ${d.industry || 'Tech'} sector. ${d.sourceUrl ? `Source: ${d.sourceUrl}` : ''} Tone: ${d.tone || 'Conversational'}.${custom ? `\n\nADDITIONAL REQUIREMENTS:\n${custom}` : ''}`,
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
      { name: 'domain', label: 'Domain', type: 'select', options: ['Governance/Policy', 'AI/Tech', 'Health Tech', 'BFSI/Finance', 'Education'] },
      { name: 'depth', label: 'Depth', type: 'select', options: ['Quick Brief', 'Standard', 'Deep Dive'] },
      { name: 'focus', label: 'Special Focus (optional)', type: 'text', placeholder: 'e.g., India market' },
    ],
    customSuggestions: [
      'Compare with global trends',
      'Include regulatory analysis',
      'Add competitive landscape',
      'Focus on India-specific data',
      'Include case studies',
    ],
    customExamples: `• "Compare India's progress with Singapore and UAE"
• "Include analysis of recent policy changes"
• "Add section on startup ecosystem in this space"
• "Focus on government initiatives and schemes"
• "Include expert opinions from recent conferences"`,
    systemPrompt: `Expert research analyst. Output structure:

# [Topic] Research Brief
## Executive Summary (2-3 sentences)
## Key Concepts (4-6 with explanations)
## 5 Most Recent Trends (with evidence)
## Risks & Opportunities (3 each)
## Actionable Recommendations (5 specific steps)

Use recent data, concrete examples, implementable recommendations.`,
    buildPrompt: (d, custom) =>
      `Research "${d.topic}" in ${d.domain || 'General'} domain. ${d.focus ? `Focus: ${d.focus}` : ''} Depth: ${d.depth || 'Standard'}.${custom ? `\n\nADDITIONAL REQUIREMENTS:\n${custom}` : ''}`,
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
      { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g., New Delhi, India', required: true },
      { name: 'speakerType', label: 'Target Speakers', type: 'select', options: ['C-Suite Executives', 'Government Officials', 'Industry Experts', 'Tech Leaders'] },
    ],
    customSuggestions: [
      'Mention past speakers',
      'Add sponsor benefits',
      'Include media coverage info',
      'Highlight networking opportunities',
      'Add session format options',
    ],
    customExamples: `• "Mention that 500+ CXOs attended last year"
• "Include that sessions will be recorded and published"
• "Add information about media coverage by Elets publications"
• "Mention past speakers like [specific names]"
• "Include travel and accommodation support details"`,
    systemPrompt: `Create professional speaker invitation HTML emails. Include: Header with event name, personalized greeting [Speaker Name], compelling hook, event details box, speaking opportunity description, 4 benefits of participating, social proof section, "Confirm Participation" CTA button, contact info, footer. Primary color #0066cc, professional warm tone. Return ONLY HTML.`,
    buildPrompt: (d, custom) =>
      `Speaker invitation for "${d.eventName}" on ${d.eventDate} in ${d.location}. ${d.eventUrl ? `Website: ${d.eventUrl}` : ''} Target: ${d.speakerType || 'Industry Leaders'}.${custom ? `\n\nADDITIONAL REQUIREMENTS:\n${custom}` : ''}`,
  },
  {
    id: 'daily-briefing',
    name: 'Daily Briefing',
    icon: '☀️',
    color: '#f4a261',
    gradient: 'linear-gradient(135deg, #f4a261 0%, #e9c46a 100%)',
    description: 'Daily news digests by sector',
    outputFormat: 'html',
    fields: [
      { name: 'sectors', label: 'Sectors', type: 'multiselect', options: ['eGovernance', 'eHealth', 'BFSI', 'Education', 'Smart Cities', 'Digital India'], required: true },
      { name: 'sources', label: 'Sources (optional)', type: 'text', placeholder: 'e.g., PIB, Economic Times' },
      { name: 'recipientType', label: 'Audience', type: 'select', options: ['Internal Team', 'Executives', 'Subscribers'] },
      { name: 'maxStories', label: 'Stories', type: 'select', options: ['5', '10', '15'] },
    ],
    customSuggestions: [
      'Focus on policy updates',
      'Include international news',
      'Add market data section',
      'Highlight funding news',
      'Include upcoming events',
    ],
    customExamples: `• "Prioritize government circulars and notifications"
• "Include a 'Global Perspective' section"
• "Add upcoming Elets events at the bottom"
• "Focus on digital transformation stories"
• "Include startup funding news in each sector"`,
    systemPrompt: `Create daily news briefing HTML. Include: Header with date and sectors, Top Story feature, Sector Roundup (grouped stories), Numbers That Matter (3-4 stats), Upcoming events, Footer. Use sector color coding, bullet points for scanning. Generate realistic India-focused news items.`,
    buildPrompt: (d, custom) => {
      const sectors = Array.isArray(d.sectors) ? d.sectors.join(', ') : 'eGovernance, BFSI';
      return `Daily briefing: ${sectors}. ${d.sources ? `Sources: ${d.sources}` : ''} Stories: ${d.maxStories || '10'}. Audience: ${d.recipientType || 'Team'}.${custom ? `\n\nADDITIONAL REQUIREMENTS:\n${custom}` : ''}`;
    },
  },
  {
    id: 'content-transformer',
    name: 'Content Transformer',
    icon: '🔄',
    color: '#9b5de5',
    gradient: 'linear-gradient(135deg, #9b5de5 0%, #f15bb5 100%)',
    description: 'Transform to LinkedIn, Twitter, summaries',
    outputFormat: 'markdown',
    fields: [
      { name: 'sourceContent', label: 'Source Content', type: 'textarea', placeholder: 'Paste content here...', required: true },
      { name: 'outputFormat', label: 'Transform To', type: 'select', options: ['LinkedIn Post', 'Twitter Thread', 'Executive Summary', 'Press Release', 'Social Media Kit'] },
      { name: 'brand', label: 'Brand Voice', type: 'select', options: ['Elets eGov', 'Elets eHealth', 'Elets BFSI', 'Neutral'] },
      { name: 'length', label: 'Length', type: 'select', options: ['Short', 'Medium', 'Detailed'] },
    ],
    customSuggestions: [
      'Add specific hashtags',
      'Include call-to-action',
      'Tag specific accounts',
      'Add emoji style guide',
      'Include engagement hook',
    ],
    customExamples: `• "Use hashtags: #DigitalIndia #eGovernance #GovTech"
• "Include CTA to visit our website"
• "Make it suitable for tagging government handles"
• "Add a poll question at the end"
• "Include 2-3 relevant statistics"`,
    systemPrompt: `Transform content into specified formats:
- LinkedIn: Hook first line, 3-5 paragraphs, 5-7 hashtags, engagement question
- Twitter: "🧵 Thread:" numbered tweets under 280 chars
- Executive Summary: 3-5 bullets under 200 words
- Press Release: Headline, dateline, lead, quotes, boilerplate
- Social Media Kit: LinkedIn + Twitter + Instagram versions`,
    buildPrompt: (d, custom) =>
      `Transform to ${d.outputFormat || 'LinkedIn'}:\n\n${d.sourceContent}\n\nVoice: ${d.brand || 'Neutral'}. Length: ${d.length || 'Medium'}.${custom ? `\n\nADDITIONAL REQUIREMENTS:\n${custom}` : ''}`,
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
      { name: 'title', label: 'Title', type: 'text', placeholder: 'e.g., Digital Health India 2025', required: true },
      { name: 'purpose', label: 'Purpose', type: 'select', options: ['Keynote', 'Industry Report', 'Event Overview', 'Sponsor Pitch'] },
      { name: 'slides', label: 'Slides', type: 'select', options: ['5-7', '10-12', '15-20'] },
      { name: 'keyPoints', label: 'Key Points', type: 'textarea', placeholder: 'Main topics to cover...' },
      { name: 'audience', label: 'Audience', type: 'text', placeholder: 'e.g., CIOs, Government Officials' },
    ],
    customSuggestions: [
      'Include case studies',
      'Add data visualizations',
      'Include competitor analysis',
      'Add speaker bio slide',
      'Include Q&A prompts',
    ],
    customExamples: `• "Include 2 case studies from Indian states"
• "Add a slide comparing India vs global benchmarks"
• "Include animated chart suggestions for key data"
• "Add a 'Key Takeaways' slide before the end"
• "Include suggested questions for audience engagement"`,
    systemPrompt: `Create slide outlines:

## Slide [N]: [Title]
**Visual:** [Chart type, image, layout suggestion]
**Content:** [3-5 bullets]
**Speaker Notes:** [2-3 sentences]
**Data:** [Specific stats]

Structure: Title, Agenda, Content slides (1 idea each), Takeaways, CTA/Thank You.`,
    buildPrompt: (d, custom) =>
      `Presentation: "${d.title}"\nPurpose: ${d.purpose || 'Keynote'}\nSlides: ${d.slides || '10-12'}\nAudience: ${d.audience || 'Leaders'}\n${d.keyPoints ? `Points: ${d.keyPoints}` : ''}${custom ? `\n\nADDITIONAL REQUIREMENTS:\n${custom}` : ''}`,
  },
];
