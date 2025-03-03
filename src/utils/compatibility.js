/**
 * BetterX compatibility utilities
 * 
 * These utilities help ensure compatibility between the bundle and desktop app
 */

/**
 * Gets either the BetterX desktop app API or the BetterX bundle API
 * @returns {Object} The best available API
 */
export function getBestAvailableAPI() {
  // Prefer desktop app API if available
  if (window.BetterX && Object.keys(window.BetterX).length > 0) {
    return window.BetterX;
  }
  
  // Fall back to bundle API
  return window.BetterXBundle || {};
}

/**
 * Check if the desktop app is available
 * @returns {boolean} True if desktop app is available
 */
export function isDesktopAppAvailable() {
  return window.BetterX && typeof window.BetterX === 'object' && 
    (typeof window.BetterX.getDesktopVersion === 'function' || 
     typeof window.BetterX.registerBundle === 'function');
}

/**
 * Gets the version of the desktop app if available
 * @returns {Promise<string|null>} The version or null if unavailable
 */
export async function getDesktopVersion() {
  if (isDesktopAppAvailable() && typeof window.BetterX.getDesktopVersion === 'function') {
    try {
      return await window.BetterX.getDesktopVersion();
    } catch (error) {
      console.error('Error getting desktop version:', error);
    }
  }
  return null;
}
