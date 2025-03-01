/**
 * Notification Manager for BetterX
 * Provides a flexible notification system for plugins and core functionality
 */
export class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.idCounter = 0;
    this.initContainer();
  }

  /**
   * Initialize the notification container
   */
  initContainer() {
    // Check if container already exists
    if (document.querySelector('.betterx-notification-container')) {
      this.container = document.querySelector('.betterx-notification-container');
      return;
    }

    this.container = document.createElement('div');
    this.container.className = 'betterx-notification-container';
    // Hide scrollbars but keep scrollable functionality
    this.container.style.scrollbarWidth = 'none';
    this.container.style.msOverflowStyle = 'none';
    document.body.appendChild(this.container);

    // Add specific style to hide WebKit scrollbar
    const style = document.createElement('style');
    style.textContent = `.betterx-notification-container::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(style);
  }

  /**
   * Create a notification with various options
   * @param {Object} options Notification options
   * @returns {string} Notification ID for future reference
   */
  createNotification({
    title = '',
    message = '',
    type = 'info', // 'info', 'success', 'warning', 'error'
    duration = 5000, // Duration in ms, 0 means permanent until dismissed
    progress = false, // Show progress bar that depletes as the notification times out
    actions = [], // Array of { label, callback } objects
    icon = null, // Optional icon class or URL
    plugin = null, // Plugin name if from a plugin
    html = false // Whether to parse message as HTML
  } = {}) {
    const id = `betterx-notification-${++this.idCounter}`;
    const notificationEl = document.createElement('div');
    
    notificationEl.id = id;
    notificationEl.className = `betterx-notification betterx-notification-${type}`;
    notificationEl.setAttribute('role', 'alert');
    
    // Apply chirp font family 
    notificationEl.style.fontFamily = '"chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    // Create icon if provided
    let iconHtml = '';
    if (icon) {
      if (icon.startsWith('http')) {
        iconHtml = `<img src="${icon}" class="betterx-notification-icon" alt="" />`;
      } else {
        iconHtml = `<i class="betterx-notification-icon ${icon}"></i>`;
      } 
    } else {
      // Default icons based on type
      const defaultIcons = {
        info: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
        success: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
        warning: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        error: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
      };
      iconHtml = defaultIcons[type] || defaultIcons.info;
    }

    // Build notification content
    let actionsHtml = '';
    if (actions && actions.length) {
      actionsHtml = '<div class="betterx-notification-actions">' +
        actions.map((action, index) => 
          `<button class="betterx-notification-action" data-action-index="${index}">${action.label}</button>`
        ).join('') +
        '</div>';
    }

    let pluginSource = '';
    if (plugin) {
      pluginSource = `<div class="betterx-notification-source">From: ${plugin}</div>`;
    }

    let progressHtml = '';
    if (progress && duration > 0) {
      progressHtml = '<div class="betterx-notification-progress-container"><div class="betterx-notification-progress"></div></div>';
    }
    
    notificationEl.innerHTML = `
      <div class="betterx-notification-content">
        <div class="betterx-notification-icon-container">${iconHtml}</div>
        <div class="betterx-notification-text">
          ${title ? `<h3 class="betterx-notification-title">${title}</h3>` : ''}
          <div class="betterx-notification-message">${html ? message : this.escapeHtml(message)}</div>
          ${pluginSource}
        </div>
        <button class="betterx-notification-close" aria-label="Close">×</button>
      </div>
      ${actionsHtml}
      ${progressHtml}
    `;
    
    // Add to DOM
    this.container.appendChild(notificationEl);
    
    // Store notification data with additional timing information
    const notificationData = {
      element: notificationEl,
      timeout: null,
      actions,
      duration, // Store the original duration
      startTime: 0, // Will be set when timeout starts
      remainingTime: duration, // Initialize remaining time as full duration
      progress, // Store progress option
      paused: false // Track if notification timeout is paused
    };
    
    this.notifications.set(id, notificationData);
    
    // Add event listeners
    notificationEl.querySelector('.betterx-notification-close').addEventListener('click', () => {
      this.removeNotification(id);
    });
    
    // Add action button event listeners
    const actionButtons = notificationEl.querySelectorAll('.betterx-notification-action');
    actionButtons.forEach(button => {
      button.addEventListener('click', () => {
        const actionIndex = parseInt(button.dataset.actionIndex);
        if (actions[actionIndex] && typeof actions[actionIndex].callback === 'function') {
          actions[actionIndex].callback();
          
          // If autoClose is true for this action, close the notification
          if (actions[actionIndex].autoClose !== false) {
            this.removeNotification(id);
          }
        }
      });
    });
    
    // Set timeout if duration is specified
    if (duration > 0) {
      this.startTimeout(id, duration);
      
      // Add hover pause/resume functionality
      notificationEl.addEventListener('mouseenter', () => {
        this.pauseNotification(id);
      });
      
      notificationEl.addEventListener('mouseleave', () => {
        this.resumeNotification(id);
      });
    }
    
    // Add entrance animation class
    setTimeout(() => {
      notificationEl.classList.add('betterx-notification-show');
    }, 10);
    
    return id;
  }
  
  /**
   * Start the timeout for a notification
   * @param {string} id Notification ID
   * @param {number} duration Duration in ms
   */
  startTimeout(id, duration) {
    const notification = this.notifications.get(id);
    if (!notification || duration <= 0) return;
    
    // Record the start time
    notification.startTime = Date.now();
    notification.remainingTime = duration;
    
    // Create the timeout
    notification.timeout = setTimeout(() => {
      this.removeNotification(id);
    }, duration);
    
    // Initialize progress bar animation if needed
    if (notification.progress) {
      const progressBar = notification.element.querySelector('.betterx-notification-progress');
      if (progressBar) {
        // Make sure the bar is initially visible at full width
        progressBar.style.width = '100%';
        
        // Force a reflow to ensure the initial state is rendered
        void progressBar.offsetWidth;
        
        // Set up the animation
        progressBar.style.transition = `width ${duration}ms linear`;
        
        // In the next frame, begin the transition to 0%
        requestAnimationFrame(() => {
          progressBar.style.width = '0%';
        });
      }
    }
  }
  
  /**
   * Pause a notification's timeout
   * @param {string} id Notification ID
   */
  pauseNotification(id) {
    const notification = this.notifications.get(id);
    if (!notification || !notification.timeout || notification.paused) return;
    
    // Calculate remaining time
    const elapsedTime = Date.now() - notification.startTime;
    notification.remainingTime = Math.max(0, notification.remainingTime - elapsedTime);
    
    // Clear existing timeout
    clearTimeout(notification.timeout);
    notification.timeout = null;
    notification.paused = true;
    
    // Pause progress bar animation
    if (notification.progress) {
      const progressBar = notification.element.querySelector('.betterx-notification-progress');
      if (progressBar) {
        // Get computed style to find the current width
        const computedStyle = window.getComputedStyle(progressBar);
        const currentWidth = computedStyle.getPropertyValue('width');
        
        // Pause by removing the transition and setting current width
        progressBar.style.transition = 'none';
        void progressBar.offsetWidth; // Force reflow
        progressBar.style.width = currentWidth;
      }
    }
  }
  
  /**
   * Resume a paused notification's timeout
   * @param {string} id Notification ID
   */
  resumeNotification(id) {
    const notification = this.notifications.get(id);
    if (!notification || !notification.paused) return;
    
    notification.paused = false;
    
    // Only restart the timeout if there's time remaining
    if (notification.remainingTime > 0) {
      notification.startTime = Date.now();
      
      // Create new timeout with remaining time
      notification.timeout = setTimeout(() => {
        this.removeNotification(id);
      }, notification.remainingTime);
      
      // Resume progress bar animation
      if (notification.progress) {
        const progressBar = notification.element.querySelector('.betterx-notification-progress');
        if (progressBar) {
          // Get current width ratio
          const computedStyle = window.getComputedStyle(progressBar);
          const currentWidth = parseFloat(computedStyle.getPropertyValue('width'));
          const containerWidth = parseFloat(window.getComputedStyle(progressBar.parentElement).getPropertyValue('width'));
          const widthRatio = currentWidth / containerWidth;
          
          // Resume the animation with the remaining time
          progressBar.style.transition = `width ${notification.remainingTime}ms linear`;
          void progressBar.offsetWidth; // Force reflow
          progressBar.style.width = '0%';
        }
      }
    }
  }
  
  /**
   * Update an existing notification
   * @param {string} id Notification ID
   * @param {Object} options New notification options
   */
  updateNotification(id, options = {}) {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    const { element } = notification;
    
    // Update title
    if (options.title !== undefined) {
      const titleEl = element.querySelector('.betterx-notification-title');
      if (titleEl) {
        titleEl.textContent = options.title;
      } else if (options.title) {
        // Create title if it doesn't exist
        const messageEl = element.querySelector('.betterx-notification-message');
        const titleEl = document.createElement('h3');
        titleEl.className = 'betterx-notification-title';
        titleEl.textContent = options.title;
        messageEl.parentNode.insertBefore(titleEl, messageEl);
      }
    }
    
    // Update message
    if (options.message !== undefined) {
      const messageEl = element.querySelector('.betterx-notification-message');
      if (messageEl) {
        if (options.html) {
          messageEl.innerHTML = options.message;
        } else {
          messageEl.textContent = options.message;
        }
      }
    }
    
    // Update type/style
    if (options.type) {
      element.className = element.className.replace(/betterx-notification-\w+/, `betterx-notification-${options.type}`);
    }
    
    // Reset timeout if duration provided
    if (options.duration !== undefined) {
      // Clean up any existing timeout
      if (notification.timeout) {
        clearTimeout(notification.timeout);
        notification.timeout = null;
      }
      
      // Update duration properties
      notification.duration = options.duration;
      notification.remainingTime = options.duration;
      notification.paused = false;
      
      // Set new timeout if duration is positive
      if (options.duration > 0) {
        this.startTimeout(id, options.duration);
      }
    }
    
    return true;
  }
  
  /**
   * Remove a notification
   * @param {string} id Notification ID
   */
  removeNotification(id) {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    const { element, timeout } = notification;
    
    // Clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }
    
    // Add exit animation
    element.classList.add('betterx-notification-hide');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications.delete(id);
    }, 300); // Match the CSS animation duration
    
    return true;
  }
  
  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.forEach((notification, id) => {
      this.removeNotification(id);
    });
  }
  
  /**
   * Helper method to escape HTML
   * @param {string} html 
   * @returns {string} Escaped HTML
   */
  escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
  
  /**
   * Shorthand for info notification
   */
  info(message, options = {}) {
    return this.createNotification({
      ...options,
      message,
      type: 'info'
    });
  }
  
  /**
   * Shorthand for success notification
   */
  success(message, options = {}) {
    return this.createNotification({
      ...options,
      message,
      type: 'success'
    });
  }
  
  /**
   * Shorthand for warning notification
   */
  warning(message, options = {}) {
    return this.createNotification({
      ...options,
      message,
      type: 'warning'
    });
  }
  
  /**
   * Shorthand for error notification
   */
  error(message, options = {}) {
    return this.createNotification({
      ...options,
      message,
      type: 'error',
      duration: options.duration || 0 // Errors stay until dismissed by default
    });
  }
}
