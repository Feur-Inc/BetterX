/**
 * BetterX Notification API
 * 
 * This API provides a simplified interface for plugins to use the notification system.
 */

/**
 * Show a notification
 * @param {Object} options Notification options
 * @returns {string} Notification ID
 */
export function showNotification(options = {}) {
  const uiManager = getBetterXUIManager();
  if (!uiManager) {
    console.error('[BetterX] Failed to show notification: UIManager not found');
    return null;
  }
  
  return uiManager.notify(options);
}

/**
 * Show an info notification
 * @param {string} message Message to display
 * @param {Object} options Additional options
 * @returns {string} Notification ID
 */
export function showInfo(message, options = {}) {
  const uiManager = getBetterXUIManager();
  return uiManager?.notifyInfo(message, options);
}

/**
 * Show a success notification
 * @param {string} message Message to display
 * @param {Object} options Additional options
 * @returns {string} Notification ID
 */
export function showSuccess(message, options = {}) {
  const uiManager = getBetterXUIManager();
  return uiManager?.notifySuccess(message, options);
}

/**
 * Show a warning notification
 * @param {string} message Message to display
 * @param {Object} options Additional options
 * @returns {string} Notification ID
 */
export function showWarning(message, options = {}) {
  const uiManager = getBetterXUIManager();
  return uiManager?.notifyWarning(message, options);
}

/**
 * Show an error notification
 * @param {string} message Message to display
 * @param {Object} options Additional options
 * @returns {string} Notification ID
 */
export function showError(message, options = {}) {
  const uiManager = getBetterXUIManager();
  return uiManager?.notifyError(message, options);
}

/**
 * Update an existing notification
 * @param {string} id Notification ID
 * @param {Object} options New options
 * @returns {boolean} Success
 */
export function updateNotification(id, options = {}) {
  const uiManager = getBetterXUIManager();
  return uiManager?.updateNotification(id, options);
}

/**
 * Remove a notification
 * @param {string} id Notification ID
 * @returns {boolean} Success
 */
export function removeNotification(id) {
  const uiManager = getBetterXUIManager();
  return uiManager?.removeNotification(id);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  const uiManager = getBetterXUIManager();
  return uiManager?.notifications.clearAll();
}

/**
 * Helper function to get the BetterX UIManager instance
 * @returns {Object|null} UIManager instance or null if not found
 */
function getBetterXUIManager() {
  // Try to get the UIManager through various paths
  if (window.betterX?.uiManager) {
    return window.betterX.uiManager;
  }
  
  // Check if there's a BetterX plugin with an instance
  if (window.betterX?.plugins?.pluginManager?.plugins) {
    const betterXPlugin = window.betterX.plugins.pluginManager.plugins.find(p => p.name === "BetterX");
    if (betterXPlugin?.instance?.uiManager) {
      return betterXPlugin.instance.uiManager;
    }
  }
  
  console.error('[BetterX] UIManager not found');
  return null;
}
