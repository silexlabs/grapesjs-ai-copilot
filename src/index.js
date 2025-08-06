import AICopilot from './ai-copilot';
import en from './locale/en';

export default (editor, opts = {}) => {
  const options = { ...{
    i18n: {},
    // AI Copilot options
    apiKey: null, // Must be provided by user
    aiProvider: 'claude', // 'claude' or 'openai'
    model: null, // Will use provider defaults if not specified
    maxTokens: 2000, // Maximum tokens for AI response
    updateInterval: 20000, // 20 seconds - more conservative
    minChangesThreshold: 5, // Minimum changes before analysis - increased
    // Prompt configuration
    customPrompt: null, // Custom prompt string
    promptUrl: null, // URL to load prompt from
    // UI container configuration
    containerElement: null, // HTML element to insert the iframe into
    containerSelector: null, // CSS selector to find container element
    // default options
  },  ...opts };

  // Load i18n files
  editor.I18n && editor.I18n.addMessages({
      en,
      ...options.i18n,
  });

  // Initialize AI Copilot
  let aiCopilot = null;
  
  editor.on('load', () => {
    // Check if API key is provided
    const envApiKey = typeof process !== 'undefined' && process.env ? 
      (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) : null;
    if (options.apiKey || envApiKey) {
      try {
        aiCopilot = new AICopilot(editor, options);
        console.log(`AI Copilot initialized successfully with ${options.aiProvider || 'claude'} provider`);
      } catch (error) {
        console.warn('AI Copilot initialization failed:', error.message);
        console.log('Please provide a valid API key to enable AI features');
      }
    } else {
      console.warn('AI Copilot requires an API key. Pass it via options.apiKey or set OPENAI_API_KEY/ANTHROPIC_API_KEY environment variable');
    }
  });

  // Expose AI Copilot instance
  return {
    aiCopilot: () => aiCopilot
  };
};