# Elets Skills Hub

AI-powered content generation hub for Elets Technomedia. Generate newsletters, research briefs, speaker mailers, and more with Claude AI.

![Skills Hub](https://img.shields.io/badge/Powered%20by-Claude%20AI-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

## Features

- 📰 **Editorial Newsletter** - Morning Brew / Business Insider style newsletters
- 🔍 **Research Agent** - Deep research with trends, risks & recommendations
- ✉️ **Speaker Mailer** - Conference speaker invitation emails
- ☀️ **Daily Briefing** - Daily news digests by sector
- 🔄 **Content Transformer** - Transform to LinkedIn, Twitter, summaries
- 📊 **Presentation Builder** - Slide outlines with speaker notes

### Key Capabilities

- **Custom Instructions** - Add specific requirements for each generation
- **Live Preview** - See HTML outputs rendered in real-time
- **Download & Copy** - Export generated content instantly
- **Secure API** - Server-side API calls (no exposed keys)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd elets-skills-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/elets-skills-hub&env=ANTHROPIC_API_KEY&envDescription=Your%20Anthropic%20API%20key%20for%20Claude%20AI)

### Option 2: Manual Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/elets-skills-hub.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables:
     - `ANTHROPIC_API_KEY` = your API key

3. **Deploy**
   - Click "Deploy"
   - Your app will be live at `https://your-project.vercel.app`

### Option 3: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variable
vercel env add ANTHROPIC_API_KEY

# Deploy to production
vercel --prod
```

## Project Structure

```
elets-skills-hub/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts      # API endpoint for Claude
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Main page component
│   ├── page.module.css       # Page styles
│   └── skills-data.ts        # Skills configuration
├── public/                   # Static assets
├── .env.example              # Environment template
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `ANTHROPIC_MODEL` | No | Model to use (default: `claude-sonnet-4-20250514`) |

### Adding New Skills

Edit `app/skills-data.ts` to add new skills:

```typescript
{
  id: 'new-skill',
  name: 'New Skill Name',
  icon: '🆕',
  color: '#ff6b6b',
  gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
  description: 'Description of what this skill does',
  outputFormat: 'html' | 'markdown',
  fields: [
    { name: 'field1', label: 'Field Label', type: 'text', required: true },
    // ... more fields
  ],
  customSuggestions: ['Suggestion 1', 'Suggestion 2'],
  customExamples: '• Example instruction 1\n• Example instruction 2',
  systemPrompt: 'Your system prompt here...',
  buildPrompt: (data, custom) => `Your user prompt with ${data.field1}`,
}
```

## Usage Guide

### For Team Members

1. **Select a Skill** - Click on any skill card
2. **Fill Parameters** - Enter required information
3. **Add Custom Instructions** (Optional) - Click "+ Add" for specific requirements
4. **Generate** - Click "Generate Content ✨"
5. **Review & Export** - Preview, copy, or download the output

### Custom Instructions Examples

**Newsletter:**
- "Include 3 recent government announcements"
- "Add upcoming Elets events section"
- "Use data from RBI's latest report"

**Research:**
- "Compare India vs Singapore progress"
- "Include startup ecosystem analysis"
- "Focus on regulatory changes"

**Speaker Mailer:**
- "Mention 500+ CXOs attended last year"
- "Include travel support details"
- "Add media coverage information"

## API Reference

### POST /api/generate

Generate content using Claude AI.

**Request:**
```json
{
  "systemPrompt": "System instructions for Claude",
  "userPrompt": "User message/request"
}
```

**Response:**
```json
{
  "content": "Generated content...",
  "usage": {
    "input_tokens": 100,
    "output_tokens": 500
  }
}
```

## Troubleshooting

### Common Issues

**"ANTHROPIC_API_KEY is not configured"**
- Ensure you've added the API key to your `.env.local` file
- On Vercel, add it in Project Settings → Environment Variables

**"Rate limit exceeded"**
- Wait a few minutes before trying again
- Consider upgrading your Anthropic plan for higher limits

**"Invalid API key"**
- Verify your API key at [console.anthropic.com](https://console.anthropic.com)
- Ensure there are no extra spaces in the key

### Getting Help

- Check [Anthropic Documentation](https://docs.anthropic.com)
- Review [Next.js Documentation](https://nextjs.org/docs)
- Contact your team lead for API key issues

## License

Private - Elets Technomedia

---

Built with ❤️ for Elets Technomedia using Claude AI
