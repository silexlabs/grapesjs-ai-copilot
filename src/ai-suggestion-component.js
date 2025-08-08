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
    selectedIntent: { type: String }
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
    this.selectedIntent = '';

    // Available intents (should match IntentManager)
    this.intents = {
      'question': { label: 'Ask Question', icon: '❓' },
      'navigation': { label: 'Navigate UI', icon: '🧭' },
      'add-page': { label: 'Add Page', icon: '📄' },
      'add-section': { label: 'Add Section', icon: '📋' },
      'modify-page': { label: 'Modify Page', icon: '✏️' },
      'modify-site': { label: 'Modify Site', icon: '🌐' },
      'modify-selection': { label: 'Modify Selection', icon: '🎯' },
      'expressions': { label: 'Creative', icon: '🎨' },
      'detect-problems': { label: 'Detect Issues', icon: '🔍' }
    };
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
      <div style="padding: 8px; display: flex; flex-direction: column; gap: 12px;">
        <!-- Intent Selection -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="gjs-sm-label" style="font-size: 11px; margin-bottom: 4px;">
            <strong>What would you like to do?</strong>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 8px;">
            ${Object.entries(this.intents).map(([key, intent]) => html`
              <button
                class="gjs-btn gjs-btn-sm ${this.selectedIntent === key ? 'gjs-btn-prim' : ''}"
                @click=${() => this.selectIntent(key)}
                style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 9px; padding: 8px 4px; min-height: 50px; text-align: center;"
                title="${intent.label}"
              >
                <span style="font-size: 14px;">${intent.icon}</span>
                <span style="line-height: 1.2; word-break: break-word;">
                  ${intent.label}
                </span>
              </button>
            `)}
          </div>
        </div>

        <!-- Input Field -->
        <div class="gjs-field">
          <input
            type="text"
            placeholder="${this.getPlaceholderText()}"
            .value=${this.userPrompt}
            @input=${this.handlePromptInput}
            @keydown=${this.handlePromptKeydown}
          />
        </div>

        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="gjs-btn-prim" @click=${this.handleUserPrompt} ?disabled=${this.loading || !this.userPrompt.trim()}>
            ${this.loading ? 'Processing...' : this.getButtonText()}
          </button>
          ${this.selectedIntent ? html`
            <button class="gjs-btn gjs-btn-sm" @click=${this.clearIntent} title="Clear selection">
              ✕
            </button>
          ` : ''}
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

    // Dispatch user prompt event with intent
    this.dispatchEvent(new CustomEvent('user-prompt', {
      detail: {
        prompt: this.userPrompt.trim(),
        intentKey: this.selectedIntent || null
      },
      bubbles: true
    }));

    // Clear the input
    this.userPrompt = '';
  }

  // Intent selection methods
  selectIntent(intentKey) {
    this.selectedIntent = intentKey;
    this.requestUpdate();
  }

  clearIntent() {
    this.selectedIntent = '';
    this.requestUpdate();
  }

  getPlaceholderText() {
    if (!this.selectedIntent) {
      return "Describe what you want to do...";
    }

    const intent = this.intents[this.selectedIntent];
    const placeholders = {
      'question': "What is your question?",
      'navigation': "Where do you want to go in the interface?",
      'add-page': "What type of page do you want to create?",
      'add-section': "What section do you want to add?",
      'modify-page': "How do you want to modify the page?",
      'modify-site': "What global changes do you want to make?",
      'modify-selection': "How do you want to modify the selected element?",
      'expressions': "What is your creative vision?",
      'detect-problems': "What problems should I look for?"
    };

    return placeholders[this.selectedIntent] || intent?.label || "Describe your request...";
  }

  getButtonText() {
    if (!this.selectedIntent) {
      return "Ask AI";
    }

    const buttonTexts = {
      'question': "Ask Question",
      'navigation': "Navigate",
      'add-page': "Create Page",
      'add-section': "Add Section",
      'modify-page': "Modify Page",
      'modify-site': "Modify Site",
      'modify-selection': "Modify Selection",
      'expressions': "Create",
      'detect-problems': "Analyze"
    };

    return buttonTexts[this.selectedIntent] || "Execute";
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
