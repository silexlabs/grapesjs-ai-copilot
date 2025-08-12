import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Abstract AI Provider interface
export class AIProvider {
  constructor(options) {
    this.options = options;
    this.technicalDetails = {
      totalRequests: 0,
      totalRetries: 0,
      totalTokensUsed: 0,
      errors: []
    };
    this.currentAbortController = null;
  }
  
  async generateResponse(prompt, context = {}) {
    throw new Error('generateResponse must be implemented by subclass');
  }

  async generateResponseWithRetry(prompt, context = {}, maxRetries = 4) {
    // Create abort controller for this request
    this.currentAbortController = new AbortController();
    
    this.technicalDetails.totalRequests++;
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if request was aborted before starting this attempt
        if (this.currentAbortController && this.currentAbortController.signal.aborted) {
          throw new Error('Request was cancelled by user');
        }
        
        const startTime = Date.now();
        
        // For retry attempts, include error context in the prompt
        let enhancedPrompt = prompt;
        if (attempt > 0 && context.states) {
          // Add error information to states array for AI self-correction
          const errorInfo = {
            timestamp: Date.now(),
            attempt: attempt,
            previousError: lastError ? {
              message: lastError.message,
              type: lastError.constructor.name,
              stack: lastError.stack
            } : null,
            aiResponse: null // Will be filled with the failed response if available
          };
          
          context.states = context.states || [];
          context.states.unshift(errorInfo);
          
          console.log(`[AI Provider] Retry attempt ${attempt}/${maxRetries} - Adding error context to states`);
        }

        const response = await this.generateResponse(enhancedPrompt, context);
        const endTime = Date.now();
        
        // Track successful response
        this.technicalDetails.totalTokensUsed += this.estimateTokens(prompt + response);
        
        console.log(`[AI Provider] Request successful on attempt ${attempt + 1}/${maxRetries + 1}`);
        
        // Clear abort controller on success
        this.currentAbortController = null;
        return response;
        
      } catch (error) {
        // Handle cancellation
        if (error.message === 'Request was cancelled by user' || error.name === 'AbortError') {
          console.log('[AI Provider] Request cancelled by user');
          this.currentAbortController = null;
          throw error;
        }
        
        lastError = error;
        this.technicalDetails.totalRetries++;
        
        // Log error details
        const errorDetail = {
          attempt: attempt + 1,
          timestamp: Date.now(),
          error: error.message,
          type: error.constructor.name
        };
        this.technicalDetails.errors.push(errorDetail);
        
        console.error(`[AI Provider] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);
        
        if (attempt === maxRetries) {
          // Final attempt failed
          console.error(`[AI Provider] All ${maxRetries + 1} attempts failed. Final error:`, error);
          this.currentAbortController = null;
          throw new Error(`AI request failed after ${maxRetries + 1} attempts. Last error: ${error.message}`);
        }
        
        // Check if already aborted before starting delay
        if (this.currentAbortController && this.currentAbortController.signal.aborted) {
          throw new Error('Request was cancelled by user');
        }
        
        // Wait before retry (exponential backoff) - but check for cancellation
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10 seconds
        console.log(`[AI Provider] Waiting ${delay}ms before retry...`);
        
        await new Promise((resolve, reject) => {
          // Check again right before setting timeout
          if (this.currentAbortController && this.currentAbortController.signal.aborted) {
            reject(new Error('Request was cancelled by user'));
            return;
          }
          
          const timeout = setTimeout(() => {
            console.log(`[AI Provider] Retry delay completed after ${delay}ms`);
            resolve();
          }, delay);
          
          // Listen for abort signal during delay
          if (this.currentAbortController) {
            const abortHandler = () => {
              console.log(`[AI Provider] Retry delay cancelled by user`);
              clearTimeout(timeout);
              reject(new Error('Request was cancelled by user'));
            };
            
            this.currentAbortController.signal.addEventListener('abort', abortHandler);
          }
        });
      }
    }
  }

  // Estimate token count (rough approximation)
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  // Get technical details for debugging
  getTechnicalDetails() {
    return {
      ...this.technicalDetails,
      // Keep only last 10 errors to prevent memory bloat
      errors: this.technicalDetails.errors.slice(-10)
    };
  }

  // Reset technical details
  resetTechnicalDetails() {
    this.technicalDetails = {
      totalRequests: 0,
      totalRetries: 0,
      totalTokensUsed: 0,
      errors: []
    };
  }

  // Abort current request
  abortCurrentRequest() {
    if (this.currentAbortController) {
      console.log('[AI Provider] Aborting current request');
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  // Check if there's an active request
  hasActiveRequest() {
    return this.currentAbortController !== null;
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
  
  async generateResponse(prompt, context = {}) {
    const requestOptions = {
      model: this.options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: this.options.maxTokens || 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    };

    // Pass the abort signal to the Anthropic client via fetch options
    if (this.currentAbortController) {
      // Create a new Anthropic client instance with the abort signal
      const clientWithSignal = new Anthropic({
        apiKey: this.client.apiKey,
        dangerouslyAllowBrowser: true,
        fetch: (url, init) => {
          return fetch(url, {
            ...init,
            signal: this.currentAbortController.signal
          });
        }
      });
      
      const response = await clientWithSignal.messages.create(requestOptions);
      
      // Track token usage more accurately
      const usage = response.usage;
      if (usage) {
        this.technicalDetails.totalTokensUsed += (usage.input_tokens || 0) + (usage.output_tokens || 0);
      }
      
      return response.content[0].text;
    } else {
      const response = await this.client.messages.create(requestOptions);
      
      // Track token usage more accurately
      const usage = response.usage;
      if (usage) {
        this.technicalDetails.totalTokensUsed += (usage.input_tokens || 0) + (usage.output_tokens || 0);
      }
      
      return response.content[0].text;
    }
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
  
  async generateResponse(prompt, context = {}) {
    const requestOptions = {
      model: this.options.model || 'gpt-4o',
      max_tokens: this.options.maxTokens || 2000,
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.7
    };

    // Pass the abort signal to the OpenAI client via fetch options
    if (this.currentAbortController) {
      // Create a new OpenAI client instance with the abort signal
      const clientWithSignal = new OpenAI({
        apiKey: this.client.apiKey,
        dangerouslyAllowBrowser: true,
        fetch: (url, init) => {
          return fetch(url, {
            ...init,
            signal: this.currentAbortController.signal
          });
        }
      });
      
      const response = await clientWithSignal.chat.completions.create(requestOptions);
      
      // Track token usage more accurately
      const usage = response.usage;
      if (usage) {
        this.technicalDetails.totalTokensUsed += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
      }
      
      return response.choices[0].message.content;
    } else {
      const response = await this.client.chat.completions.create(requestOptions);
      
      // Track token usage more accurately
      const usage = response.usage;
      if (usage) {
        this.technicalDetails.totalTokensUsed += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
      }
      
      return response.choices[0].message.content;
    }
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