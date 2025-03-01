import * as notifications from './notifications.js';

/**
 * BetterX API
 * 
 * This module exports all BetterX API functions for plugins to use.
 */

export { notifications };

// Expose the API globally for easy access from plugins
window.BetterXAPI = {
  notifications
};

// Log that the API is available
console.log('[BetterX] API initialized and available via window.BetterXAPI');
