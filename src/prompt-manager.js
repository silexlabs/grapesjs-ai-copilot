// Prompt Manager for AI Copilot
// Handles loading and templating of AI prompts
import { defaultPrompt } from './prompts/default-prompt';

export class PromptManager {
  constructor(options = {}) {
    this.customPrompt = options.customPrompt;
    this.promptUrl = options.promptUrl;
    this.defaultPrompt = null;
    this.loadedPrompt = null;
  }

  // Load the default prompt from the bundled file
  async loadDefaultPrompt() {
    if (this.defaultPrompt) return this.defaultPrompt;

    // Use the statically imported prompt
    this.defaultPrompt = defaultPrompt;
    console.log('[AI Copilot] Loaded default prompt from module');

    return this.defaultPrompt;
  }

  // Get the active prompt (custom, URL, or default)
  async getPrompt() {
    if (this.loadedPrompt) return this.loadedPrompt;

    // Priority: custom prompt > URL prompt > default prompt
    if (this.customPrompt) {
      this.loadedPrompt = this.customPrompt;
      console.log('[AI Copilot] Using custom prompt');
      return this.loadedPrompt;
    }

    if (this.promptUrl) {
      try {
        const response = await fetch(this.promptUrl);
        if (response.ok) {
          this.loadedPrompt = await response.text();
          console.log('[AI Copilot] Loaded prompt from URL:', this.promptUrl);
          return this.loadedPrompt;
        } else {
          console.warn('[AI Copilot] Failed to load prompt from URL:', this.promptUrl);
        }
      } catch (error) {
        console.warn('[AI Copilot] Error loading prompt from URL:', error.message);
      }
    }

    // Fallback to default
    this.loadedPrompt = await this.loadDefaultPrompt();
    console.log('[AI Copilot] Using default prompt');
    return this.loadedPrompt;
  }

  // Process the prompt template with context data
  async processPrompt(context) {
    const template = await this.getPrompt();

    return this.replaceTemplate(template, {
      currentHtml: context.currentHtml || '',
      currentCss: context.currentCss || '',
      projectData: JSON.stringify(context.projectData || {}, null, 2),
      userPrompt: context.userPrompt || 'No specific user request - suggest general improvements',
      states: this.formatStates(context.states),
      // Keep legacy support for older templates
      html: context.currentHtml || '',
      css: context.currentCss || '',
      previousResponses: this.formatPreviousResponses(context.previousResponses || [])
    });
  }

  // Simple template replacement
  replaceTemplate(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), value);
    }
    return result;
  }

  // Format previous AI responses
  formatPreviousResponses(previousResponses) {
    if (!previousResponses || previousResponses.length === 0) return 'No previous responses';

    return previousResponses.map((response, index) => {
      return `Response ${index + 1} (${response.timestamp}):\n${response.content}`;
    }).join('\n\n---\n\n');
  }

  // Format states with HTML/CSS, AI responses, and console logs
  formatStates(states) {
    if (!states || states.length === 0) return 'No previous interaction states';

    return states.map((state, index) => {
      const timestamp = new Date(state.timestamp).toLocaleTimeString();

      let stateInfo = `State ${index + 1} (${timestamp}):\n`;

      // User Request (if exists)
      if (state.userPrompt) {
        stateInfo += `User Request: "${state.userPrompt}"\n\n`;
      }

      // HTML/CSS info (if available)
      if (state.html) {
        stateInfo += `HTML (${state.html.length} chars):\n${this.truncateText(state.html, 200)}\n\n`;
      }
      if (state.css) {
        stateInfo += `CSS (${state.css.length} chars):\n${this.truncateText(state.css, 200)}\n\n`;
      }

      // AI Response
      if (state.aiResponse) {
        stateInfo += `AI Response:\n`;
        stateInfo += `- Explanation: ${this.truncateText(state.aiResponse.explanation, 150)}\n`;
        stateInfo += `- Code: ${this.truncateText(state.aiResponse.code, 100)}\n\n`;
      }

      // Console logs and errors (critical for AI to fix issues!)
      if (state.consoleLogs && state.consoleLogs.length > 0) {
        stateInfo += `Console logs/errors (${state.consoleLogs.length} entries):\n`;
        state.consoleLogs.slice(0, 5).forEach(log => {
          const level = (log.level || 'log').toUpperCase();
          const message = this.truncateText(log.message || String(log), 100);
          stateInfo += `[${level}] ${message}\n`;
        });
        if (state.consoleLogs.length > 5) {
          stateInfo += `... and ${state.consoleLogs.length - 5} more log entries\n`;
        }
        stateInfo += `\n`;
      }

      return stateInfo;
    }).join('\n---\n\n');
  }

  // Truncate text to specified length
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  }


  // Safely stringify objects avoiding circular references
  safeStringify(obj, maxDepth = 2, currentDepth = 0) {
    if (currentDepth >= maxDepth) return '[Max Depth Reached]';
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

    const seen = new WeakSet();

    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }

        // Filter out functions and DOM elements
        if (typeof value === 'function') {
          return '[Function]';
        }
        if (value && value.nodeType) {
          return '[DOM Element]';
        }

        return value;
      }, 2);
    } catch (error) {
      return `[Error serializing: ${error.message}]`;
    }
  }


  // Reload the prompt (useful for development)
  async reloadPrompt() {
    this.loadedPrompt = null;
    return await this.getPrompt();
  }
}

export default PromptManager;
