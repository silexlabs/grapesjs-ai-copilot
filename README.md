# GrapesJS AI Copilot

![AI Copilot Banner](https://img.shields.io/badge/AI-Copilot-blue?style=for-the-badge)
[![License: AGPL](https://img.shields.io/badge/License-AGPL-yellow.svg)](https://opensource.org/licenses/agpl-v3)

Turn GrapesJS into a vibe coding experience. **@silexlabs/grapesjs-ai-copilot** watches your edits, understands your intent, and suggests smart actions through an embedded AI assistant — from fixing SEO to making your site more accessible, responsive, and efficient.

> This code is part of a bigger project: [about Silex v3](https://www.silex.me)

[ONLINE DEMO (requires an OpenAI API key)](https://codepen.io/lexoyo/pen/EaVvYQd)

## ✨ Features

- 🤖 **Interactive AI Assistant**: Chat with AI to make specific changes ("make the header red", "add responsive navigation")
- 💬 **Smart Auto-Suggestions**: AI analyzes your edits and suggests improvements automatically  
- 🔄 **Intelligent Retry System**: Automatic retry with exponential backoff when requests fail
- 🛠️ **Error Handling**: "Didn't work" button to restart failed requests with debugging context
- 📊 **Technical Metrics**: Track tokens used, retry attempts, and error counts
- ⏹️ **Request Control**: Stop button to cancel long-running AI requests
- 🐛 **Advanced Debugging**: AI analyzes console logs to fix failed code attempts
- 🎯 **Context-Aware**: Understands your recent actions and suggests complementary improvements
- 🔍 **SEO & Accessibility**: Smart suggestions for web standards compliance
- 📱 **Responsive Design**: Device-aware styling recommendations

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
| `model` | string | Specific model to use (uses provider default if null) | `null` |
| `maxTokens` | number | Maximum tokens for AI response | `2000` |
| `updateInterval` | number | Analysis interval in milliseconds | `20000` |
| `minChangesThreshold` | number | Minimum changes before analysis | `5` |
| `customPrompt` | string | Custom prompt template (optional) | `null` |
| `promptUrl` | string | URL to load prompt from (optional) | `null` |
| `containerElement` | HTMLElement | HTML element to insert the AI interface | `null` |
| `containerSelector` | string | CSS selector for container element | `null` |

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


## 🎨 Interface

The AI Copilot appears as a panel in the GrapesJS interface with:

### 💬 **Interactive Chat Interface**
- **Text input field** to ask AI for specific changes
- **Command history** with arrow key navigation (up/down)
- **Auto-execution** of user-requested changes

### 📊 **Technical Metrics Display**
- **Token usage** tracking for API costs
- **Retry attempts** when requests fail
- **Error indicators** with detailed feedback
- **Success/failure** status with visual indicators

### 🎛️ **Control Buttons**
- **"Ask AI"** - Submit custom requests
- **"Suggest"** - Get automatic improvement suggestions  
- **"Stop"** - Cancel running requests
- **"Didn't work"** - Restart with failure analysis
- **"Show/Hide code"** - View generated JavaScript

### 🔍 **Smart Context Awareness**
- Detects recent user actions
- Avoids suggesting already-completed tasks
- Provides relevant improvement suggestions

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

## 🗣️ Interactive Prompting

### Ask AI for Specific Changes

Simply type what you want in the input field:

```
"make the header red"
"add a responsive navigation menu"
"center all the text on mobile"
"add alt text to all images"
"create a hero section with a call-to-action button"
```

The AI will:
1. Generate JavaScript code using GrapesJS APIs
2. Auto-execute the code for you
3. Show technical metrics (tokens used, success status)
4. Include comprehensive debugging logs

### Error Handling & Debugging

When something doesn't work:

1. **"Didn't work" button** appears after auto-execution
2. Click it to restart with failure context
3. AI analyzes console logs and error messages
4. Suggests a completely different approach

```
User: "make all text blue"
AI: Executes code... (fails due to selector issue)
User: Clicks "Didn't work"
AI: "I see the selector failed. Let me try a different approach using component iteration instead..."
```

## 📊 Technical Metrics & Debugging

### Real-time Feedback
- 🪙 **Token usage**: Track API costs
- 🔄 **Retry attempts**: See when requests fail and retry
- ⚠️ **Error counts**: Detailed error tracking
- ✅/❌ **Status indicators**: Visual success/failure feedback

### Advanced Debugging
The AI generates comprehensive console.log statements:

```javascript
// Generated code includes debugging
console.log('=== Starting device selection ===');
editor.Devices.select('Desktop');
console.log('✅ Device selected successfully');

console.log('=== Finding components ===');
const components = editor.getWrapper().find('text');
console.log(`Found ${components.length} text components`);

components.forEach((comp, index) => {
  console.log(`Processing component ${index + 1}/${components.length}`);
  comp.addStyle({ color: 'blue' });
  console.log(`✅ Applied blue color to component ${index + 1}`);
});
```

## 📝 Usage Examples

### Basic Interactive Usage

```javascript
// User types in the AI interface:
"make the navigation responsive"

// AI automatically:
// 1. Analyzes current navigation structure
// 2. Generates responsive JavaScript code
// 3. Executes the code immediately
// 4. Shows success metrics and debugging logs
```

### Automatic Suggestions

```javascript
// After you edit components, AI suggests:
"I notice you added several images without alt text. 
Would you like me to add descriptive alt attributes?"

// Click "Apply" to accept the suggestion
```

### Error Recovery

```javascript
// If AI code fails:
User: Clicks "Didn't work" 
AI: "The previous CSS selector failed. Let me try using 
     component iteration instead of CSS selectors."

// AI tries a completely different approach
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
