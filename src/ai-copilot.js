import { createAIProvider } from './ai-providers';
import { PromptManager } from './prompt-manager';
import { AISuggestionComponent } from './ai-suggestion-component';

// AI Copilot class to manage AI API interactions and web component interface
class AICopilot {
  constructor(editor, options = {}) {
    this.editor = editor;
    // Support multiple environment variables for different AI providers
    const envApiKey = typeof process !== 'undefined' && process.env ?
      (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) : null;

    this.options = {
      apiKey: options.apiKey || envApiKey,
      aiProvider: options.aiProvider || 'claude', // 'claude' or 'openai'
      model: options.model || null, // Will use provider defaults if not specified
      maxTokens: options.maxTokens || 2000,
      updateInterval: options.updateInterval || 20000, // 20 seconds - more conservative
      minChangesThreshold: options.minChangesThreshold || 5, // Increased threshold
      iframeContainerId: options.iframeContainerId || 'ai-copilot-container',
      // Prompt configuration
      customPrompt: options.customPrompt || null, // Custom prompt string
      promptUrl: options.promptUrl || null, // URL to load prompt from
      // UI container configuration
      containerElement: options.containerElement || null, // HTML element to insert iframe
      containerSelector: options.containerSelector || null, // CSS selector for container
      ...options
    };

    // Create AI provider instance
    try {
      this.aiProvider = createAIProvider(this.options.aiProvider, {
        apiKey: this.options.apiKey,
        model: this.options.model,
        maxTokens: this.options.maxTokens
      });
      console.log(`[AI Copilot] Using ${this.options.aiProvider} provider`);
    } catch (error) {
      console.error('[AI Copilot] Failed to initialize AI provider:', error.message);
      throw error;
    }

    this.suggestionComponent = null;
    this.lastAnalysis = null;
    this.changeCount = 0;
    this.lastSnapshot = '';
    this.errorLog = [];
    this.analysisHistory = [];
    this.responseHistory = []; // Store recent AI responses with optional feedback
    this.userFeedback = []; // Store user feedback
    this.isLoading = false; // Loading state
    this.isAnalyzing = false; // Flag to prevent concurrent analysis
    this.isProcessingUserPrompt = false; // Flag to prevent analysis during user prompt processing
    this.userActions = []; // Store semantic user actions as they happen
    this.promptManager = new PromptManager({
      customPrompt: this.options.customPrompt,
      promptUrl: this.options.promptUrl
    });

    this.init();
  }

  // Initialize the copilot
  init() {
    this.createSuggestionComponent();
    this.setupEventListeners();
    this.setupActionTracking();
    this.setupConsoleInterception();
    this.startPeriodicAnalysis();
  }

  // Create and inject the web component into GrapesJS interface
  createSuggestionComponent() {
    let container = null;

    // Try to find custom container
    if (this.options.containerElement) {
      container = this.options.containerElement;
    } else if (this.options.containerSelector) {
      container = document.querySelector(this.options.containerSelector);
    }

    // Create web component
    this.suggestionComponent = document.createElement('ai-suggestion');
    this.suggestionComponent.id = this.options.iframeContainerId;
    this.suggestionComponent.style.width = '100%';
    this.suggestionComponent.style.border = 'none';
    this.suggestionComponent.style.borderRadius = '8px';

    // Set editor reference
    this.suggestionComponent.editor = this.editor;

    // Setup event listeners for the component
    this.setupComponentEventListeners();

    if (container) {
      // Use custom container
      container.appendChild(this.suggestionComponent);
      console.log('[AI Copilot] Using custom container for web component');
    } else {
      // Fallback to GrapesJS panel system
      const panelManager = this.editor.Panels;

      // Add a new panel for the AI copilot
      panelManager.addPanel({
        id: 'ai-copilot-panel',
        visible: true,
        buttons: []
      });

      // Create component container in panel
      const panel = panelManager.getPanel('ai-copilot-panel');
      const panelEl = panel.view.el;
      panelEl.style.width = '350px';
      panelEl.style.height = '400px';
      panelEl.style.position = 'fixed';
      panelEl.style.top = '20px';
      panelEl.style.right = '20px';
      panelEl.style.zIndex = '1000';
      panelEl.style.border = '1px solid #ccc';
      panelEl.style.borderRadius = '8px';
      panelEl.style.backgroundColor = '#fff';
      panelEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';

      panelEl.appendChild(this.suggestionComponent);
      console.log('[AI Copilot] Using default GrapesJS panel container');
    }
  }

  // Setup event listeners to track changes
  setupEventListeners() {
    // Track component changes
    this.editor.on('component:add component:remove component:update', () => {
      this.changeCount++;
    });

    // Track style changes
    this.editor.on('styleable:change', () => {
      this.changeCount++;
    });
  }

  // Setup event listeners for the web component
  setupComponentEventListeners() {
    if (!this.suggestionComponent) return;

    // Listen for apply success/error events
    this.suggestionComponent.addEventListener('apply-success', (event) => {
      console.log('[AI Copilot] Code applied successfully:', event.detail);
      this.logMessage('log', 'AI code executed successfully');

      // Reset change counter after user prompt execution to prevent immediate re-analysis
      if (event.detail.isUserPromptResult) {
        console.log('[AI Copilot] Resetting change counter after user prompt execution');
        this.changeCount = 0;
        this.lastSnapshot = this.createContentSnapshot();
      }
    });

    this.suggestionComponent.addEventListener('apply-error', (event) => {
      console.error('[AI Copilot] Code application failed:', event.detail);
      this.logError(`Code execution failed: ${event.detail.error.message}`, event.detail.error);

      // Reset change counter after user prompt execution to prevent immediate re-analysis
      if (event.detail.isUserPromptResult) {
        console.log('[AI Copilot] Resetting change counter after user prompt execution');
        this.changeCount = 0;
        this.lastSnapshot = this.createContentSnapshot();
      }
    });

    // Listen for refresh requests
    this.suggestionComponent.addEventListener('refresh-request', () => {
      this.forceAnalysis();
    });

    // Listen for user prompts
    this.suggestionComponent.addEventListener('user-prompt', (event) => {
      this.handleUserPrompt(event.detail.prompt);
    });
  }


  // Start periodic analysis of the current state
  startPeriodicAnalysis() {
    setInterval(() => {
      if (this.shouldRunAnalysis()) {
        console.log('[AI Copilot] Running analysis due to significant changes');
        this.analyzeCurrentState();
      } else if (this.changeCount > 0) {
        console.log(`[AI Copilot] Skipping analysis - ${this.changeCount} changes but not significant enough`);
      }
    }, this.options.updateInterval);
  }

  // Check if we should run analysis
  shouldRunAnalysis() {
    // Don't run analysis if user prompt is being processed
    if (this.isProcessingUserPrompt) {
      console.log('[AI Copilot] Skipping analysis - user prompt being processed');
      return false;
    }

    if (this.changeCount < this.options.minChangesThreshold) {
      return false;
    }

    // Get current snapshot
    const currentSnapshot = this.createContentSnapshot();

    // Compare with last snapshot to detect meaningful changes
    const hasSignificantChanges = this.hasSignificantChanges(this.lastSnapshot, currentSnapshot);

    return hasSignificantChanges;
  }

  // Create a simplified snapshot of the current content
  createContentSnapshot() {
    const html = this.editor.getHtml();
    const css = this.editor.getCss();
    const components = this.editor.getComponents();

    return {
      html: this.normalizeHtml(html),
      css: this.normalizeCss(css),
      componentCount: components.length,
      // Create a structural hash to detect meaningful changes
      structuralHash: this.createStructuralHash(html, css)
    };
  }

  // Normalize HTML for comparison (remove whitespace, formatting differences)
  normalizeHtml(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim()
      .toLowerCase();
  }

  // Normalize CSS for comparison
  normalizeCss(css) {
    return css
      .replace(/\s+/g, ' ')
      .replace(/;\s*}/g, '}')
      .replace(/{\s*/g, '{')
      .replace(/:\s*/g, ':')
      .trim()
      .toLowerCase();
  }

  // Create a structural hash of the content
  createStructuralHash(html, css) {
    const content = this.normalizeHtml(html) + this.normalizeCss(css);
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Check if there are significant changes worth analyzing
  hasSignificantChanges(oldSnapshot, newSnapshot) {
    // First analysis - always run
    if (!oldSnapshot) {
      console.log('[AI Copilot] First analysis - running');
      return true;
    }

    // Check if structural hash changed
    if (oldSnapshot.structuralHash !== newSnapshot.structuralHash) {
      // Additional checks to filter out trivial changes
      const htmlDiff = this.calculateDifference(oldSnapshot.html, newSnapshot.html);
      const cssDiff = this.calculateDifference(oldSnapshot.css, newSnapshot.css);

      console.log(`[AI Copilot] Content changed - HTML diff: ${(htmlDiff * 100).toFixed(2)}%, CSS diff: ${(cssDiff * 100).toFixed(2)}%`);

      // Only consider it significant if there's more than minimal change
      const significantThreshold = 0.03; // 3% change threshold - lowered for better detection

      if (htmlDiff > significantThreshold || cssDiff > significantThreshold) {
        console.log('[AI Copilot] Changes are significant - will analyze');
        return true;
      }

      // Check for component count changes
      if (Math.abs(oldSnapshot.componentCount - newSnapshot.componentCount) > 0) {
        console.log(`[AI Copilot] Component count changed: ${oldSnapshot.componentCount} -> ${newSnapshot.componentCount}`);
        return true;
      }

      console.log('[AI Copilot] Changes detected but not significant enough');
    } else {
      console.log('[AI Copilot] No structural changes detected');
    }

    return false;
  }

  // Calculate the difference ratio between two strings
  calculateDifference(str1, str2) {
    if (str1 === str2) return 0;
    if (!str1 || !str2) return 1;

    const maxLength = Math.max(str1.length, str2.length);
    const minLength = Math.min(str1.length, str2.length);

    // Simple difference calculation based on length and character differences
    let differences = Math.abs(str1.length - str2.length);

    for (let i = 0; i < minLength; i++) {
      if (str1[i] !== str2[i]) {
        differences++;
      }
    }

    return differences / maxLength;
  }

  // Analyze current state and get AI suggestions
  async analyzeCurrentState() {
    // Prevent concurrent requests
    if (this.isAnalyzing) {
      console.log('[AI Copilot] Analysis already in progress, skipping...');
      return;
    }

    try {
      this.isAnalyzing = true;
      // Set loading state
      this.setLoading(true);

      const context = this.gatherContext();
      const prompt = await this.buildAnalysisPrompt(context);

      const aiResponse = await this.aiProvider.generateResponse(prompt);

      // Parse JSON response from AI
      const suggestion = this.parseAISuggestion(aiResponse);

      // Store response in history with current HTML/CSS snapshot
      const responseEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        context,
        suggestion: suggestion,
        explanation: suggestion.explanation,
        code: suggestion.code,
        feedback: null // Will be populated when user provides feedback
      };

      this.responseHistory.unshift(responseEntry);
      if (this.responseHistory.length > 10) {
        this.responseHistory = this.responseHistory.slice(0, 10); // Keep only last 10
      }

      this.updateComponentSuggestion(suggestion);

      // Reset change counter and update snapshot
      this.changeCount = 0;
      this.lastSnapshot = this.createContentSnapshot();
      this.analysisHistory.push(responseEntry);

      // Clear loading state
      this.setLoading(false);

    } catch (error) {
      this.setLoading(false);
      this.logError('AI analysis failed', error);
      this.setComponentError(error.message);
    } finally {
      // Always clear the analyzing flag
      this.isAnalyzing = false;
    }
  }

  // Setup real-time action tracking
  setupActionTracking() {
    // Track component additions
    this.editor.on('component:add', (component) => {
      this.trackComponentAddition(component);
    });

    // Track component removal
    this.editor.on('component:remove', (component) => {
      if (!component || typeof component.get !== 'function' || typeof component.getId !== 'function') {
        return;
      }
      try {
        this.userActions.push({
          type: 'component_remove',
          componentType: component.get('type') || 'unknown',
          componentId: component.getId() || 'unknown',
          timestamp: Date.now()
        });
        this.limitActionHistory();
      } catch (error) {
        console.warn('[AI Copilot] Error tracking component removal:', error);
      }
    });

    // Track style changes
    this.editor.on('styleable:change', (target, property, value, opts) => {
      this.trackStyleChange(target, property, value, opts);
    });

    // Track component selection
    this.editor.on('component:selected', (component) => {
      if (!component || typeof component.get !== 'function' || typeof component.getId !== 'function') {
        return;
      }
      try {
        this.userActions.push({
          type: 'component_select',
          componentType: component.get('type') || 'unknown',
          componentId: component.getId() || 'unknown',
          timestamp: Date.now()
        });
        this.limitActionHistory();
      } catch (error) {
        console.warn('[AI Copilot] Error tracking component selection:', error);
      }
    });

    // Track component updates
    this.editor.on('component:update', (component) => {
      if (!component || typeof component.get !== 'function' || typeof component.getId !== 'function') {
        return;
      }
      try {
        this.userActions.push({
          type: 'component_update',
          componentType: component.get('type') || 'unknown',
          componentId: component.getId() || 'unknown',
          timestamp: Date.now()
        });
        this.limitActionHistory();
      } catch (error) {
        console.warn('[AI Copilot] Error tracking component update:', error);
      }
    });
  }

  // Track component additions and detect duplications
  trackComponentAddition(component) {
    if (!component || typeof component.get !== 'function' || typeof component.getId !== 'function') {
      return;
    }

    try {
      const componentInfo = {
        type: component.get('type') || 'unknown',
        tagName: component.get('tagName') || 'div',
        id: component.getId() || 'unknown',
        classes: component.get('classes') && typeof component.get('classes').pluck === 'function'
          ? component.get('classes').pluck('name') : [],
        content: component.get('content') || '',
        parent: component.parent() && typeof component.parent().getId === 'function'
          ? component.parent().getId() : null
      };

    // Check if this looks like a duplication
    const recentAdditions = this.userActions
      .filter(action => action.type === 'component_add' &&
              Date.now() - action.timestamp < 10000) // Within last 10 seconds
      .slice(-5); // Last 5 additions

    const similarComponent = recentAdditions.find(action =>
      action.componentType === componentInfo.type &&
      action.componentTagName === componentInfo.tagName
    );

    if (similarComponent) {
      // This looks like a duplication
      this.userActions.push({
        type: 'component_duplicate',
        componentType: componentInfo.type,
        componentTagName: componentInfo.tagName,
        componentId: componentInfo.id,
        originalId: similarComponent.componentId,
        classes: componentInfo.classes,
        timestamp: Date.now()
      });

    } else {
      // Regular addition
      this.userActions.push({
        type: 'component_add',
        componentType: componentInfo.type,
        componentTagName: componentInfo.tagName,
        componentId: componentInfo.id,
        classes: componentInfo.classes,
        parent: componentInfo.parent,
        timestamp: Date.now()
      });
    }

      this.limitActionHistory();
    } catch (error) {
      console.warn('[AI Copilot] Error tracking component addition:', error);
    }
  }

  // Track style changes and detect patterns
  trackStyleChange(target, property, value, opts) {
    // Add safety checks for target methods
    if (!target || typeof target.get !== 'function' || typeof target.getId !== 'function') {
      // Silently ignore invalid targets - this can happen with some GrapesJS events
      return;
    }

    try {
      const styleAction = {
        type: 'style_change',
        componentType: target.get('type') || 'unknown',
        componentId: target.getId() || 'unknown',
        property,
        value,
        previousValue: opts && opts.prevValue,
        timestamp: Date.now()
      };

      this.userActions.push(styleAction);
      this.limitActionHistory();
    } catch (error) {
      console.warn('[AI Copilot] Error tracking style change:', error);
    }
  }

  // Keep action history manageable
  limitActionHistory() {
    if (this.userActions.length > 50) {
      this.userActions = this.userActions.slice(-50);
    }
  }

  // Setup console interception to capture logs
  setupConsoleInterception() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console)
    };

    // Override console methods to capture logs
    ['log', 'warn', 'error', 'info'].forEach(level => {
      console[level] = (...args) => {
        // Call original console method
        this.originalConsole[level](...args);

        // Capture the log (without using console methods to avoid recursion)
        this.captureConsoleMessage(level, args);
      };
    });

    this.originalConsole.log('[AI Copilot] Console interception setup complete');
  }

  // Gather context information with states
  gatherContext() {
    // Get only current page HTML/CSS but truncate to save tokens
    const fullHtml = this.editor.getHtml();
    const fullCss = this.editor.getCss();

    // Get project data but exclude HTML/CSS to save tokens
    const fullProjectData = this.editor.getProjectData();
    const { assets, ...projectDataWithoutAssets } = fullProjectData;
    const projectData = JSON.stringify({
      ...projectDataWithoutAssets,
      // Remove the base64 image data
      assets: assets.map(asset => ({
        ...asset,
        src: asset.src.startsWith('data') ? asset.src.substring(0, 30) : asset.src,
      })),
    }, null, 2);

    // Build states array from response history - only 1 most recent interaction
    const states = this.responseHistory.slice(0, 5).map(response => ({
      timestamp: response.timestamp,
      userPrompt: response.userPrompt || null,
      aiResponse: {
        explanation: response.explanation,
        code: response.code,
      },
      // Include console logs for error fixing - this is critical!
      consoleLogs: this.getConsoleLogs(response.timestamp).slice(0, 5)
    }));

    return {
      projectData,
      states
    };
  }

  // Get console logs since a specific timestamp
  getConsoleLogs(sinceTimestamp) {
    return this.errorLog
      .filter(log => log && log.timestamp >= sinceTimestamp)
      .map(log => ({
        timestamp: log.timestamp || Date.now(),
        level: log.level || 'log',
        message: log.message || String(log),
        source: log.source || 'unknown'
      }));
  }


  // Build the analysis prompt for the AI
  async buildAnalysisPrompt(context) {
    return await this.promptManager.processPrompt(context);
  }

  // Parse AI JSON response
  parseAISuggestion(aiResponse) {
    if (!aiResponse || typeof aiResponse !== 'string') {
      throw new Error('Invalid AI response');
    }

    let cleaned = aiResponse.trim();

    // Remove markdown code blocks if present (handle multiple variations)
    // Handle ```json at start
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    }
    // Handle ```javascript at start
    else if (cleaned.startsWith('```javascript')) {
      cleaned = cleaned.substring(13);
    }
    // Handle generic ``` at start
    else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }

    // Remove trailing ```
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }

    // Remove any remaining markdown formatting
    cleaned = cleaned.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

    cleaned = cleaned.trim();

    try {
      const suggestion = JSON.parse(cleaned);

      if (!suggestion.explanation || !suggestion.code) {
        throw new Error('Missing explanation or code in AI response');
      }

      console.log('[AI Copilot] Parsed AI suggestion:', {
        explanationLength: suggestion.explanation.length,
        codeLength: suggestion.code.length
      });

      return suggestion;
    } catch (error) {
      console.error('[AI Copilot] Failed to parse AI response:', error.message);
      console.error('[AI Copilot] Raw response:', aiResponse);

      // Return fallback suggestion
      return {
        explanation: "Sorry, I couldn't understand the AI response. Please try refreshing.",
        code: "console.log('AI response parsing failed');"
      };
    }
  }


  // Update web component with suggestion
  updateComponentSuggestion(suggestion, isUserPromptResult = false) {
    if (this.suggestionComponent) {
      this.suggestionComponent.updateSuggestion(suggestion, isUserPromptResult);
    }
  }

  // Set loading state on web component
  setComponentLoading(loading) {
    if (this.suggestionComponent) {
      this.suggestionComponent.setLoading(loading);
    }
  }

  // Set error state on web component
  setComponentError(error) {
    if (this.suggestionComponent) {
      this.suggestionComponent.setError(error);
    }
  }


  // Capture and store console messages from iframe
  captureConsoleMessage(level, args) {
    const message = {
      timestamp: Date.now(),
      level,
      message: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return arg.toString();
          }
        }
        return String(arg);
      }).join(' '),
      source: 'component'
    };

    // Add to error log
    this.errorLog.push(message);

    // Keep only last 20 messages to avoid memory issues
    if (this.errorLog.length > 20) {
      this.errorLog = this.errorLog.slice(-20);
    }

    // Log to main console with prefix using original console method
    if (this.originalConsole && this.originalConsole[level]) {
      this.originalConsole[level](`[AI Copilot]`, ...args);
    }
  }


  // Log errors for analysis
  logError(message, error) {
    const errorEntry = {
      timestamp: Date.now(),
      level: 'error',
      message,
      error: error.message || error,
      stack: error.stack,
      source: 'component'
    };
    this.errorLog.push(errorEntry);
    if (this.originalConsole && this.originalConsole.error) {
      this.originalConsole.error('[AI Copilot]', message, error);
    }
  }

  // Log general messages for analysis
  logMessage(level, message) {
    const logEntry = {
      timestamp: Date.now(),
      level: level || 'log',
      message: String(message),
      source: 'component'
    };
    this.errorLog.push(logEntry);

    // Keep only last 20 messages to avoid memory issues
    if (this.errorLog.length > 20) {
      this.errorLog = this.errorLog.slice(-20);
    }
  }

  // Get current AI Copilot instance for external access
  getActions() {
    return this.userActions;
  }

  // Get analysis history
  getAnalysisHistory() {
    return this.analysisHistory;
  }

  // Force analysis (for manual triggers)
  async forceAnalysis() {
    // Reset change count to ensure analysis runs even if threshold not met
    this.changeCount = this.options.minChangesThreshold;
    await this.analyzeCurrentState();
  }


  // Handle user prompts
  async handleUserPrompt(userPrompt) {
    console.log('[AI Copilot] User prompt:', userPrompt);

    // Set flags to prevent analysis interference
    this.isProcessingUserPrompt = true;
    this.setLoading(true);

    try {
      const context = this.gatherContext();
      context.userPrompt = userPrompt; // Add user prompt to context

      const prompt = await this.buildAnalysisPrompt(context);

      // Log what's being sent to the AI model
      console.log('[AI Copilot] User-initiated request:', {context, prompt});

      const aiResponse = await this.aiProvider.generateResponse(prompt);

      // Parse JSON response from AI
      const suggestion = this.parseAISuggestion(aiResponse);

      // Store response in history with current HTML/CSS snapshot
      const responseEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        context,
        suggestion: suggestion,
        explanation: suggestion.explanation,
        code: suggestion.code,
        userPrompt: userPrompt, // Store the user prompt
        feedback: null
      };

      this.responseHistory.unshift(responseEntry);
      if (this.responseHistory.length > 10) {
        this.responseHistory = this.responseHistory.slice(0, 10);
      }

      this.updateComponentSuggestion(suggestion, true);
      this.analysisHistory.push(responseEntry);

      // Clear loading state
      this.setLoading(false);

    } catch (error) {
      this.setLoading(false);
      this.logError('AI user prompt analysis failed', error);
      this.setComponentError(error.message);
    } finally {
      // Always clear the user prompt processing flag
      this.isProcessingUserPrompt = false;
    }
  }

  // Reload the prompt (useful for development)
  async reloadPrompt() {
    await this.promptManager.reloadPrompt();
    console.log('[AI Copilot] Prompt reloaded');
  }

  // Update prompt configuration
  updatePromptConfig(config) {
    if (config.customPrompt !== undefined) {
      this.options.customPrompt = config.customPrompt;
      this.promptManager.customPrompt = config.customPrompt;
    }
    if (config.promptUrl !== undefined) {
      this.options.promptUrl = config.promptUrl;
      this.promptManager.promptUrl = config.promptUrl;
    }
    // Clear loaded prompt to force reload
    this.promptManager.loadedPrompt = null;
    console.log('[AI Copilot] Prompt configuration updated');
  }



  // Get feedback for prompt context (responses with feedback for AI to learn from)
  getFeedbackForContext() {
    return this.responseHistory
      .filter(response => response.feedback)
      .slice(0, 5) // Last 5 responses with feedback
      .map(response => ({
        responseId: response.id,
        timestamp: response.timestamp,
        responsePreview: response.truncatedResponse,
        feedback: response.feedback
      }));
  }

  // Loading state management
  setLoading(loading) {
    this.isLoading = loading;
    this.setComponentLoading(loading);
    console.log('[AI Copilot] Loading state:', loading);
  }

  // Utility methods
  truncateHTML(html, maxLength) {
    if (!html || html.length <= maxLength) return html;

    // Try to truncate at a reasonable point
    const truncated = html.substring(0, maxLength);
    const lastTag = truncated.lastIndexOf('<');
    const lastSpace = truncated.lastIndexOf(' ');

    const cutPoint = lastTag > lastSpace ? lastTag : lastSpace;
    return cutPoint > 0 ? truncated.substring(0, cutPoint) + '...' : truncated + '...';
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Escape HTML for safe display
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Get user feedback
  getUserFeedback() {
    return this.userFeedback;
  }

  // Get response history
  getResponseHistory() {
    return this.responseHistory;
  }

  // Clear feedback and history
  clearFeedback() {
    this.userFeedback = [];
    console.log('[AI Copilot] User feedback cleared');
  }

  clearResponseHistory() {
    this.responseHistory = [];
    console.log('[AI Copilot] Response history cleared');
  }

}

export default AICopilot;
