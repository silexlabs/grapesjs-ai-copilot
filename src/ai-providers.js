import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Abstract AI Provider interface
export class AIProvider {
  constructor(options) {
    this.options = options;
  }
  
  async generateResponse(prompt) {
    throw new Error('generateResponse must be implemented by subclass');
  }
}

// Claude/Anthropic provider
export class ClaudeProvider extends AIProvider {
  constructor(options) {
    super(options);
    this.client = new Anthropic({
      apiKey: options.apiKey,
      dangerouslyAllowBrowser: true
    });
  }
  
  async generateResponse(prompt) {
    const response = await this.client.messages.create({
      model: this.options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: this.options.maxTokens || 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    return response.content[0].text;
  }
}

// OpenAI provider
export class OpenAIProvider extends AIProvider {
  constructor(options) {
    super(options);
    this.client = new OpenAI({
      apiKey: options.apiKey,
      dangerouslyAllowBrowser: true
    });
  }
  
  async generateResponse(prompt) {
    const response = await this.client.chat.completions.create({
      model: this.options.model || 'gpt-4o',
      max_tokens: this.options.maxTokens || 2000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
  }
}

// Factory function to create AI provider
export function createAIProvider(type, options) {
  switch (type.toLowerCase()) {
    case 'claude':
    case 'anthropic':
      return new ClaudeProvider(options);
    case 'openai':
    case 'gpt':
      return new OpenAIProvider(options);
    default:
      throw new Error(`Unknown AI provider type: ${type}. Supported types: claude, openai`);
  }
}

export default { AIProvider, ClaudeProvider, OpenAIProvider, createAIProvider };