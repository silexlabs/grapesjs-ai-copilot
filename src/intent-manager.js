// Intent Manager for AI Copilot
// Handles user intent detection and prompt routing

export class IntentManager {
  constructor() {
    // Define user intents in French
    this.intents = {
      'question': {
        label: 'Poser une question',
        icon: '❓',
        description: 'Demander des informations ou de l\'aide',
        keywords: ['comment', 'pourquoi', 'que', 'qu\'est-ce', 'aide', 'help', '?'],
        promptFile: 'question-prompt.txt'
      },
      'navigation': {
        label: 'Naviguer dans l\'interface',
        icon: '🧭',
        description: 'Se déplacer ou trouver des éléments dans Silex',
        keywords: ['naviguer', 'aller', 'trouver', 'où', 'menu', 'interface', 'ui'],
        promptFile: 'navigation-prompt.txt'
      },
      'add-page': {
        label: 'Ajouter une page',
        icon: '📄',
        description: 'Créer une nouvelle page sur le site',
        keywords: ['nouvelle page', 'ajouter page', 'créer page', 'page'],
        promptFile: 'add-page-prompt.txt'
      },
      'add-section': {
        label: 'Ajouter une section',
        icon: '📋',
        description: 'Ajouter une section ou composant',
        keywords: ['section', 'composant', 'élément', 'ajouter', 'insérer'],
        promptFile: 'add-section-prompt.txt'
      },
      'modify-page': {
        label: 'Modifier la page',
        icon: '✏️',
        description: 'Modifier le contenu ou la structure de la page',
        keywords: ['modifier page', 'changer page', 'éditer page', 'page'],
        promptFile: 'modify-page-prompt.txt'
      },
      'modify-site': {
        label: 'Modifier le site',
        icon: '🌐',
        description: 'Modifications globales du site',
        keywords: ['site', 'global', 'général', 'tout', 'ensemble'],
        promptFile: 'modify-site-prompt.txt'
      },
      'modify-selection': {
        label: 'Modifier la sélection',
        icon: '🎯',
        description: 'Modifier l\'élément actuellement sélectionné',
        keywords: ['sélection', 'sélectionné', 'élément', 'ce', 'cet', 'cette'],
        promptFile: 'modify-selection-prompt.txt'
      },
      'expressions': {
        label: 'Expressions créatives',
        icon: '🎨',
        description: 'Créer du contenu créatif, textes, designs',
        keywords: ['créatif', 'design', 'style', 'couleur', 'texte', 'contenu'],
        promptFile: 'expressions-prompt.txt'
      },
      'detect-problems': {
        label: 'Détecter les problèmes',
        icon: '🔍',
        description: 'Analyser les problèmes d\'éco-conception, accessibilité, SEO',
        keywords: ['problème', 'erreur', 'améliorer', 'optimiser', 'accessibilité', 'seo', 'éco'],
        promptFile: 'detect-problems-prompt.txt'
      }
    };

    // Silex resources for AI to reference
    this.silexResources = {
      documentation: 'https://docs.silex.me',
      github: 'https://github.com/silexlabs/Silex',
      community: 'https://community.silex.me',
      videos: 'https://www.youtube.com/channel/UC...',
      events: 'https://www.silex.me/events',
      website: 'https://www.silex.me'
    };
  }

  // Detect user intent from text input
  detectIntent(userInput) {
    if (!userInput || userInput.trim().length === 0) {
      return null;
    }

    const input = userInput.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const [intentKey, intent] of Object.entries(this.intents)) {
      let score = 0;
      
      // Check for keyword matches
      for (const keyword of intent.keywords) {
        if (input.includes(keyword.toLowerCase())) {
          score += keyword.length; // Longer keywords get more weight
        }
      }

      // Boost score if intent label words are found
      const labelWords = intent.label.toLowerCase().split(' ');
      for (const word of labelWords) {
        if (input.includes(word) && word.length > 2) {
          score += word.length;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = intentKey;
      }
    }

    return bestMatch;
  }

  // Get intent configuration
  getIntent(intentKey) {
    return this.intents[intentKey] || null;
  }

  // Get all available intents
  getAllIntents() {
    return this.intents;
  }

  // Get Silex resources for AI to reference in prompts
  getSilexResources() {
    return this.silexResources;
  }

  // Check if user input looks like a specific intent
  isIntentMatch(userInput, intentKey) {
    const detectedIntent = this.detectIntent(userInput);
    return detectedIntent === intentKey;
  }

  // Get suggested intents based on current context
  getSuggestedIntents(context = {}) {
    const suggestions = [];

    // If something is selected, suggest modify-selection
    if (context.hasSelection) {
      suggestions.push('modify-selection');
    }

    // If page is empty, suggest add-section
    if (context.isEmptyPage) {
      suggestions.push('add-section', 'add-page');
    }

    // Always suggest these as general options
    suggestions.push('question', 'detect-problems');

    // Remove duplicates and return unique intents
    return [...new Set(suggestions)].map(key => ({
      key,
      ...this.intents[key]
    }));
  }
}

export default IntentManager;