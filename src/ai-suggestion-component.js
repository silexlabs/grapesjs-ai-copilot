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
    userPrompt: { type: String }
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
        <div class="gjs-sm-label">Analyzing...</div>
      </div>
    `;
  }

  renderError() {
    return html`
      <div style="display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center;" class="gjs-danger">
        Connection Error<br>
        <small>${this.error}</small>
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
        </div>
      </div>
    `;
  }

  renderSuggestion() {
    return html`
      <div style="padding: 8px; display: flex; flex-direction: column; gap: 8px;">
        <div class="gjs-field">
          <div style="min-height: 40px; max-height: 120px; overflow-y: auto; padding: 8px; border: none; background: transparent;">
            ${this.suggestion.explanation}
          </div>
        </div>

        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="gjs-btn-prim" @click=${this.handleApply} ?disabled=${this.loading}>
            ${this.loading ? 'Applying...' : 'Apply'}
          </button>
          <span class="gjs-field-info" @click=${this.toggleCodePreview} style="cursor: pointer; text-decoration: underline;">
            ${this.showCode ? 'Hide code' : 'Show code'}
          </span>
          <button class="gjs-btn gjs-btn-sm" @click=${this.handleRefresh} ?disabled=${this.loading} title="Refresh" style="margin-left: auto;">
            ↻
          </button>
        </div>

        <div class="gjs-field-code" style="max-height: 100px; overflow-y: auto; white-space: pre-wrap; font-size: 10px; ${this.showCode ? 'display: block;' : 'display: none;'}">
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

  handlePromptInput(event) {
    this.userPrompt = event.target.value;
  }

  handlePromptKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey && this.userPrompt.trim()) {
      event.preventDefault();
      this.handleUserPrompt();
    }
  }

  handleUserPrompt() {
    if (!this.userPrompt.trim()) return;

    // Dispatch user prompt event
    this.dispatchEvent(new CustomEvent('user-prompt', {
      detail: { prompt: this.userPrompt.trim() },
      bubbles: true
    }));

    // Clear the input
    this.userPrompt = '';
  }

  // Method to update the suggestion from parent
  updateSuggestion(suggestion) {
    this.suggestion = suggestion;
  }

  // Method to set loading state
  setLoading(loading) {
    this.loading = loading;
  }

  // Method to set error state
  setError(error) {
    this.error = error;
  }
}

// Define the custom element
customElements.define('ai-suggestion', AISuggestionComponent);

export { AISuggestionComponent };
