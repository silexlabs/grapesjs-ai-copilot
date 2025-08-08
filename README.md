# GrapesJS AI Copilot

![AI Copilot Banner](https://img.shields.io/badge/AI-Copilot-blue?style=for-the-badge)
[![License: AGPL](https://img.shields.io/badge/License-AGPL-yellow.svg)](https://opensource.org/licenses/agpl-v3)

Turn GrapesJS into a vibe coding experience. **@silexlabs/grapesjs-ai-copilot** watches your edits, understands your intent, and suggests smart actions through an embedded AI assistant — from fixing SEO to making your site more accessible, responsive, and efficient.

> This code is part of a bigger project: [about Silex v3](https://www.silex.me)

[ONLINE DEMO (requires an OpenAI API key)](https://codepen.io/lexoyo/pen/EaVvYQd)

## ✨ Features

- 🤖 **AI-Powered Suggestions**: Real-time analysis with Claude AI
- 🔍 **SEO Optimization**: Automatic detection and fixes for SEO issues
- ♿ **Accessibility Improvements**: WCAG compliance suggestions
- 📱 **Responsive Design**: Mobile-first design recommendations
- ⚡ **Performance Optimization**: Image compression and loading suggestions
- 🎨 **Smart Components**: Context-aware component suggestions
- 🚀 **Vibe Coding**: Anticipates your needs while you build

## 🚀 Quick Start

### Installation

```bash
npm install @silexlabs/grapesjs-ai-copilot
```

### Basic Usage

```html
<link href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" rel="stylesheet">
<script src="https://unpkg.com/grapesjs"></script>
<script src="https://unpkg.com/@silexlabs/grapesjs-ai-copilot"></script>

<div id="gjs"></div>
```

```javascript
const editor = grapesjs.init({
  container: '#gjs',
  height: '100vh',
  plugins: ['@silexlabs/grapesjs-ai-copilot'],
  pluginsOpts: {
    '@silexlabs/grapesjs-ai-copilot': {
      // OpenAI Configuration
      aiProvider: 'openai',
      apiKey: 'sk-proj-...', // Your OpenAI API key
      model: 'gpt-4o', // Optional

      // OR Claude Configuration
      // aiProvider: 'claude',
      // apiKey: 'sk-ant-api03-...',
      // model: 'claude-3-5-sonnet-20241022',

      updateInterval: 10000, // 10 seconds
      minChangesThreshold: 3
    }
  }
});
```

### Modern JavaScript

```javascript
import grapesjs from 'grapesjs';
import aiCopilot from '@silexlabs/grapesjs-ai-copilot';
import 'grapesjs/dist/css/grapes.min.css';

const editor = grapesjs.init({
  container: '#gjs',
  plugins: [aiCopilot],
  pluginsOpts: {
    '@silexlabs/grapesjs-ai-copilot': {
      aiProvider: 'openai', // or 'claude'
      apiKey: process.env.OPENAI_API_KEY, // or ANTHROPIC_API_KEY
      model: 'gpt-4o', // Optional
      updateInterval: 15000,
      minChangesThreshold: 2
    }
  }
});
```

## ⚙️ Configuration

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `aiProvider` | string | AI provider: 'claude' or 'openai' | `'claude'` |
| `apiKey` | string | API key for chosen provider (required) | `null` |
| `model` | string | Specific model to use | `'claude-3-5-sonnet-20241022'` or `'gpt-4o'` |
| `maxTokens` | number | Maximum tokens for AI response | `2000` |
| `updateInterval` | number | Analysis interval in milliseconds | `20000` |
| `minChangesThreshold` | number | Minimum changes before analysis | `5` |
| `iframeContainerId` | string | Container ID for the AI interface | `'ai-copilot-container'` |
| `customPrompt` | string | Custom prompt template (optional) | `null` |
| `promptUrl` | string | URL to load prompt from (optional) | `null` |

### Environment Variables

You can also set your API key via environment variables:

```bash
# For OpenAI
export OPENAI_API_KEY=sk-proj-your-key-here

# For Claude/Anthropic
export ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

## 🎨 Prompt Customization

The AI Copilot supports custom prompts to tailor the assistant's behavior to your specific needs.

### Using Custom Prompts

```javascript
const editor = grapesjs.init({
  plugins: ['@silexlabs/grapesjs-ai-copilot'],
  pluginsOpts: {
    '@silexlabs/grapesjs-ai-copilot': {
      // Option 1: Direct custom prompt
      customPrompt: `You are a specialized SEO assistant.
        Focus only on SEO improvements and suggestions.

        Current state: {{html}}
        Selected: {{selectedComponent}}

        Create an SEO audit interface with window.editor actions.`,

      // Option 2: Load prompt from URL
      promptUrl: 'https://my-site.com/prompts/seo-focused.txt',

      aiProvider: 'openai',
      apiKey: 'your-key'
    }
  }
});
```

### Prompt Template Variables

Your custom prompts can use these template variables:
- `{{html}}` - Current page HTML
- `{{css}}` - Current page CSS
- `{{componentCount}}` - Number of components
- `{{canUndo}}` - Whether undo is available
- `{{canRedo}}` - Whether redo is available
- `{{selectedComponent}}` - Currently selected element details
- `{{consoleMessages}}` - Console logs from AI interface
- `{{recentCommands}}` - Command history for pattern detection

### Built-in Specialized Prompts

The plugin includes several pre-built prompts for different use cases:

- **Default**: General-purpose assistant with pattern detection
- **SEO-focused**: Specialized in SEO audits and improvements
- **Accessibility**: WCAG compliance and accessibility fixes
- **Responsive**: Mobile-first and responsive design optimization

### Dynamic Prompt Updates

```javascript
// Get the AI Copilot instance
const copilot = editor.plugins.get('@silexlabs/grapesjs-ai-copilot').aiCopilot();

// Update prompt configuration
copilot.updatePromptConfig({
  customPrompt: 'New prompt content...'
});

// Or load from URL
copilot.updatePromptConfig({
  promptUrl: 'https://example.com/new-prompt.txt'
});

// Reload current prompt
await copilot.reloadPrompt();
```

## 🎯 AI Suggestions

The AI Copilot analyzes your website and provides suggestions in these categories:

### 🔍 SEO Optimization
- Missing meta descriptions
- Alt text for images
- Heading structure issues
- Canonical URLs

### ♿ Accessibility
- ARIA labels and descriptions
- Color contrast issues
- Keyboard navigation
- Screen reader compatibility

### 📱 Responsive Design
- Missing viewport meta tags
- Media query suggestions
- Flexible layouts
- Image responsiveness

### ⚡ Performance
- Image optimization
- Lazy loading
- CSS minification
- Unused code detection

## 🛠️ API Reference

### Plugin Instance

```javascript
// Get the AI Copilot instance
const copilot = editor.plugins.get('@silexlabs/grapesjs-ai-copilot').aiCopilot();

// Force analysis
await copilot.forceAnalysis();

// Get analysis history
const history = copilot.getAnalysisHistory();

// Access action methods
const actions = copilot.getActions();
```

### Custom Actions

You can extend the copilot with custom actions:

```javascript
const actions = copilot.getActions();

// Add custom SEO fix
actions.fixSEOIssues({
  action: 'add-meta-description',
  value: 'Your custom meta description'
});

// Add responsive component
actions.addComponent({
  componentType: 'card',
  props: { title: 'My Card', content: 'Card content' },
  position: 'bottom'
});
```

## 🎨 Interface

The AI Copilot appears as a floating panel in the GrapesJS interface, providing:

- **Real-time suggestions** based on your edits
- **One-click fixes** for common issues
- **Health score** for your website
- **Action history** and feedback

## 🔧 Development

Clone and setup:

```bash
git clone https://github.com/silexlabs/grapesjs-ai-copilot.git
cd grapesjs-ai-copilot
npm install
```

Development server:

```bash
npm start
```

Build for production:

```bash
npm run build
```

## 📝 Examples

### Basic SEO Optimization

The AI will automatically detect and suggest fixes for:

```html
<!-- Before -->
<img src="image.jpg">
<h1>Title</h1>

<!-- AI suggests -->
<img src="image.jpg" alt="Descriptive alt text">
<h1>Title</h1>
<meta name="description" content="Generated description">
```

### Accessibility Improvements

```html
<!-- Before -->
<button onclick="submit()">Click</button>

<!-- AI suggests -->
<button onclick="submit()" aria-label="Submit form">Click</button>
```

### Responsive Design

```css
/* Before */
.container { width: 800px; }

/* AI suggests */
.container {
  max-width: 800px;
  width: 100%;
  padding: 0 20px;
}
@media (max-width: 768px) {
  .container { padding: 0 10px; }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

AGPL © [silexlabs](https://github.com/silexlabs)

## 🔑 Getting API Keys

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Go to API Keys section
4. Generate a new API key
5. Add it to your configuration

### Anthropic (Claude) API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Generate an API key
4. Add it to your configuration

## 💡 Tips

- Start with a low `minChangesThreshold` for more frequent suggestions
- Use a higher `updateInterval` to reduce API usage
- The AI learns from your editing patterns over time
- Check the browser console for detailed logs and debugging

---

**Happy vibe coding! 🚀**
