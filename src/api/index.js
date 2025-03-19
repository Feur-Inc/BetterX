import * as notifications from './notifications.js';

/**
 * BetterX API
 * 
 * This module exports all BetterX API functions for plugins to use.
 */

export { notifications };

// Export a convenience method for getting the BetterX instance
export function getBetterX() {
  return window.BetterX || window.BetterXBundle || null;
}

// Always create our own API object
window.BetterXAPI = {
  notifications,
  getBetterX
};

