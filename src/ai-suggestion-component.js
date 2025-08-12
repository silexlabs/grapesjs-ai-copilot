import { LitElement, html, css } from 'lit';

class AISuggestionComponent extends LitElement {
  static properties = {
    suggestion: { type: Object },
    loading: { type: Boolean },
    error: { type: String },
    editor: { type: Object },
    showCode: { type: Boolean },
    statusMessage: { type: String },
    statusType: { type: String },
    userPrompt: { type: String },
    promptHistory: { type: Array },
    historyIndex: { type: Number },
    isUserPromptResult: { type: Boolean },
    technicalDetails: { type: Object }
  };

  // No shadow DOM styles - inherit from GrapesJS

  // Override to prevent shadow DOM creation so GrapesJS CSS can penetrate
  createRenderRoot() {
    return this;
  }


  constructor() {
    super();
    this.suggestion = null;
    this.loading = false;
    this.error = null;
    this.editor = null;
    this.showCode = false;
    this.statusMessage = '';
    this.statusType = '';
    this.userPrompt = '';
    this.promptHistory = [];
    this.historyIndex = -1;
    this.isUserPromptResult = false;
    this.technicalDetails = null;
  }

  render() {
    if (this.loading) {
      return this.renderLoading();
    }

    if (this.error) {
      return this.renderError();
    }

    if (!this.suggestion) {
      return this.renderWelcome();
    }

    return this.renderSuggestion();
  }

  renderLoading() {
    return html`
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <div style="display: flex; align-items: center; justify-content: center; padding: 20px; flex-direction: column; gap: 8px;">
        <div style="width: 14px; height: 14px; border: 2px solid #ddd; border-top: 2px solid #4a90a4; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <div class="gjs-sm-label">
          Analyzing...
          <span class="gjs-field-info" @click=${this.handleStop} style="cursor: pointer; text-decoration: underline; margin-left: 8px;">
            Stop
          </span>
        </div>
      </div>
    `;
  }

  renderError() {
    return html`
      <div style="padding: 8px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; flex-direction: column; padding: 12px; text-align: center; background: #fff5f5; border: 1px solid #fed7d7; border-radius: 4px;">
          <div style="font-weight: bold; color: #c53030; margin-bottom: 4px;">Connection Error</div>
          <small style="color: #744d47;">${this.error}</small>
        </div>

        <div class="gjs-field">
          <input
            type="text"
            placeholder="Try asking AI again... (e.g. 'make the header red')"
            .value=${this.userPrompt}
            @input=${this.handlePromptInput}
            @keydown=${this.handlePromptKeydown}
          />
        </div>

        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="gjs-btn-prim" @click=${this.handleUserPrompt} ?disabled=${this.loading || !this.userPrompt.trim()}>
            ${this.loading ? 'Asking...' : 'Ask AI'}
          </button>
          ${this.loading ? html`
            <span class="gjs-field-info" @click=${this.handleStop} style="cursor: pointer; text-decoration: underline; margin-left: 8px;">
              Stop
            </span>
          ` : ''}
          <button class="gjs-btn gjs-btn-sm" @click=${this.handleRefresh} ?disabled=${this.loading} title="Refresh" style="margin-left: auto;">
            ↻
          </button>
        </div>
      </div>
    `;
  }

  renderWelcome() {
    return html`
      <div style="padding: 8px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: center; padding: 10px; text-align: center;" class="gjs-sm-label">
          <small>Start editing to see suggestions</small>
        </div>

        <div class="gjs-field">
          <input
            type="text"
            placeholder="Ask AI to make changes... (e.g. 'make the header red')"
            .value=${this.userPrompt}
            @input=${this.handlePromptInput}
            @keydown=${this.handlePromptKeydown}
          />
        </div>

        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="gjs-btn-prim" @click=${this.handleUserPrompt} ?disabled=${this.loading || !this.userPrompt.trim()}>
            ${this.loading ? 'Asking...' : 'Ask AI'}
          </button>
          ${this.loading ? html`
            <span class="gjs-field-info" @click=${this.handleStop} style="cursor: pointer; text-decoration: underline; margin-left: 8px;">
              Stop
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderSuggestion() {
    return html`
      <div style="padding: 8px; display: flex; flex-direction: column; gap: 8px;">
        ${this.technicalDetails ? html`
          <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 12px;">
              ${this.isUserPromptResult ?
                (this.technicalDetails.errors && this.technicalDetails.errors.length > 0 ? '❌' : '✅')
                : '💡'}
            </span>
            ${this.technicalDetails.totalRetries > 0 ? html`
              <span class="gjs-badge gjs-badge-warning" style="font-size: 9px; display: initial; position: initial;">
                🔄 ${this.technicalDetails.totalRetries} ${this.technicalDetails.totalRetries === 1 ? 'retry' : 'retries'}
              </span>
            ` : ''}
            <span class="gjs-badge" style="font-size: 9px; display: initial; position: initial;">
              🪙 ${this.technicalDetails.totalTokensUsed} tokens
            </span>
            ${this.technicalDetails.errors && this.technicalDetails.errors.length > 0 ? html`
              <span class="gjs-badge gjs-badge-danger" style="font-size: 9px; display: initial; position: initial;" title="${this.technicalDetails.errors[0]?.error || 'Error occurred'}">
                ⚠️ ${this.technicalDetails.errors.length} errors
              </span>
            ` : ''}
          </div>
        ` : html`
          <div style="font-size: 10px; color: #666; margin-bottom: 4px;">
            ${this.isUserPromptResult ? '✅ Executed your request' : '💡 AI Suggestion'}
          </div>
        `}

        <div class="gjs-field">
          <div style="min-height: 40px; max-height: 120px; overflow-y: auto; padding: 8px; border: none; background: transparent;">
            ${this.suggestion.explanation}
          </div>
        </div>

        <div style="display: flex; gap: 4px; align-items: center;">
          ${!this.isUserPromptResult ? html`
            <button class="gjs-btn-prim" @click=${this.handleApply} ?disabled=${this.loading}>
              ${this.loading ? 'Applying...' : 'Apply'}
            </button>
          ` : ''}
          <span class="gjs-field-info" @click=${this.toggleCodePreview} style="cursor: pointer; text-decoration: underline;">
            ${this.showCode ? 'Hide code' : 'Show code'}
          </span>
          <button class="gjs-btn gjs-btn-sm" @click=${this.handleRefresh} ?disabled=${this.loading} title="Refresh" style="margin-left: auto;">
            ↻
          </button>
        </div>

        <div class="gjs-field-code" style="max-height: 500px; text-align: left; overflow-y: auto; white-space: pre-wrap; font-size: 10px; ${this.showCode ? 'display: block;' : 'display: none;'}">
          ${this.suggestion.code}
        </div>

        <div class="${this.statusType === 'success' ? 'gjs-badge gjs-badge-success' : 'gjs-badge gjs-badge-danger'}" style="font-size: 10px; ${this.statusMessage ? 'display: block;' : 'display: none;'}">
          ${this.statusMessage}
        </div>

        <div class="gjs-field">
          <input
            type="text"
            placeholder="Ask AI to make more changes..."
            .value=${this.userPrompt}
            @input=${this.handlePromptInput}
            @keydown=${this.handlePromptKeydown}
          />
        </div>

        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="gjs-btn-prim" @click=${this.handleUserPrompt} ?disabled=${this.loading || !this.userPrompt.trim()}>
            ${this.loading ? 'Asking...' : 'Ask AI'}
          </button>
          ${this.loading ? html`
            <span class="gjs-field-info" @click=${this.handleStop} style="cursor: pointer; text-decoration: underline; margin-left: 8px;">
              Stop
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  toggleCodePreview() {
    this.showCode = !this.showCode;
    this.requestUpdate(); // Force update to ensure reactive property change is detected
  }


  handleApply() {
    if (!this.suggestion || !this.editor) return;

    this.statusMessage = '';
    this.statusType = '';

    try {
      // Execute the JavaScript code with access to the editor
      const result = new Function('editor', this.suggestion.code)(this.editor);

      // Show success message
      this.statusMessage = '✓ Changes applied successfully!';
      this.statusType = 'success';

      console.log('[AI Copilot] Code executed successfully:', result);

      // Dispatch success event
      this.dispatchEvent(new CustomEvent('apply-success', {
        detail: { suggestion: this.suggestion, result },
        bubbles: true
      }));

    } catch (error) {
      // Show error message
      this.statusMessage = `✗ Error applying changes: ${error.message}`;
      this.statusType = 'error';

      console.error('[AI Copilot] Code execution failed:', error);

      // Dispatch error event
      this.dispatchEvent(new CustomEvent('apply-error', {
        detail: { suggestion: this.suggestion, error },
        bubbles: true
      }));
    }

    // Hide status message after 3 seconds
    setTimeout(() => {
      this.statusMessage = '';
      this.statusType = '';
      this.requestUpdate();
    }, 3000);
  }

  handleRefresh() {
    // Dispatch refresh event
    this.dispatchEvent(new CustomEvent('refresh-request', {
      bubbles: true
    }));
  }

  handleStop() {
    // Dispatch stop event
    this.dispatchEvent(new CustomEvent('stop-request', {
      bubbles: true
    }));
  }

  handlePromptInput(event) {
    this.userPrompt = event.target.value;
  }

  handlePromptKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey && this.userPrompt.trim()) {
      event.preventDefault();
      this.handleUserPrompt();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateHistory('up');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateHistory('down');
    }
  }

  handleUserPrompt() {
    if (!this.userPrompt.trim()) return;

    const prompt = this.userPrompt.trim();

    // Add to history if it's not the same as the last entry
    if (this.promptHistory.length === 0 || this.promptHistory[0] !== prompt) {
      this.promptHistory.unshift(prompt);
      // Keep only last 50 prompts
      if (this.promptHistory.length > 50) {
        this.promptHistory = this.promptHistory.slice(0, 50);
      }
    }

    // Reset history index
    this.historyIndex = -1;

    // Dispatch user prompt event
    this.dispatchEvent(new CustomEvent('user-prompt', {
      detail: { prompt: prompt },
      bubbles: true
    }));

    // Clear the input
    this.userPrompt = '';
  }

  navigateHistory(direction) {
    if (this.promptHistory.length === 0) return;

    if (direction === 'up') {
      if (this.historyIndex < this.promptHistory.length - 1) {
        this.historyIndex++;
        this.userPrompt = this.promptHistory[this.historyIndex];
      }
    } else if (direction === 'down') {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.userPrompt = this.promptHistory[this.historyIndex];
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.userPrompt = '';
      }
    }
  }

  // Method to update the suggestion from parent
  updateSuggestion(suggestion, isUserPromptResult = false) {
    this.suggestion = suggestion;
    this.isUserPromptResult = isUserPromptResult;

    // Auto-execute the code only for user prompt results
    if (isUserPromptResult && suggestion && suggestion.code && this.editor) {
      this.autoExecuteCode();
    }
  }

  // Auto-execute the AI code and update the explanation
  autoExecuteCode() {
    if (!this.suggestion || !this.editor) return;

    this.statusMessage = '';
    this.statusType = '';

    try {
      // Execute the JavaScript code with access to the editor
      const result = new Function('editor', this.suggestion.code)(this.editor);

      // Update the explanation to show what was done
      const executionResult = result ? ` Result: ${JSON.stringify(result)}` : '';
      this.suggestion.explanation = `✅ ${this.suggestion.explanation}${executionResult}`;

      console.log('[AI Copilot] Code executed automatically:', result);

      // Dispatch success event
      this.dispatchEvent(new CustomEvent('apply-success', {
        detail: { suggestion: this.suggestion, result, isUserPromptResult: this.isUserPromptResult },
        bubbles: true
      }));

    } catch (error) {
      // Update explanation to show the error
      this.suggestion.explanation = `❌ Error: ${error.message}\n\nOriginal plan: ${this.suggestion.explanation}`;

      console.error('[AI Copilot] Auto-execution failed:', error);

      // Dispatch error event
      this.dispatchEvent(new CustomEvent('apply-error', {
        detail: { suggestion: this.suggestion, error },
        bubbles: true
      }));
    }

    // Force UI update to reflect the new explanation
    this.requestUpdate();
  }

  // Method to set loading state
  setLoading(loading) {
    this.loading = loading;
  }

  // Method to set error state
  setError(error) {
    this.error = error;
  }

  // Method to update technical details
  updateTechnicalDetails(details) {
    this.technicalDetails = details;
    this.requestUpdate();
  }
}

// Define the custom element
customElements.define('ai-suggestion', AISuggestionComponent);

export { AISuggestionComponent };
