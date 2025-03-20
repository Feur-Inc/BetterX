/**
 * API Loader utility for ensuring the BetterX API is properly initialized
 */

/**
 * Ensures the API is loaded and returns it
 * 
 * @returns {Object} The BetterX API
 */
export async function ensureAPI() {
  if (!window.BetterX || !window.BetterX.api) {
    
    // Wait for API to be initialized
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (window.BetterX && window.BetterX.api) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.error("[BetterX] API initialization timeout");
        resolve();
      }, 10000);
    });
  }
  
  return window.BetterX?.api || {};
}

/**
 * Helper function to get the notifications API
 * 
 * @returns {Object} The notifications API
 */
export async function getNotificationsAPI() {
  const api = await ensureAPI();
  return api.notifications || null;
}
