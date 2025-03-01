/**
 * Create and populate the developer settings panel
 * @param {HTMLElement} container - The container element to populate
 * @param {Object} uiManager - The UIManager instance
 */
export function populateDeveloperSettings(container, uiManager) {
  container.innerHTML = `
    <div class="betterx-plugin-item">
      <div class="betterx-plugin-header">
        <div class="betterx-plugin-info">
          <h3>Notification System</h3>
          <p>Tools to test and debug the BetterX notification system.</p>
        </div>
        <div class="betterx-plugin-controls">
          <button id="betterx-open-notification-tester" class="betterx-button">Open Tester</button>
        </div>
      </div>
    </div>

    <div class="betterx-plugin-item">
      <div class="betterx-plugin-header">
        <div class="betterx-plugin-info">
          <h3>Version Information</h3>
        </div>
      </div>
      <div class="betterx-plugin-details" style="display: block; margin-top: 10px;">
        <p><strong>BetterX Desktop Version:</strong> <span id="betterx-version">Loading...</span></p>
        <p><strong>BetetrX Bundle Build Date:</strong> <span id="betterx-build-date">Loading...</span></p>
      </div>
    </div>
  `;

  // Set version info
  const version = document.getElementById('betterx-version');
  const buildDate = document.getElementById('betterx-build-date');
  
  try {
    // Get the desktop version using the Promise API
    if (window.BetterX && typeof window.BetterX.getDesktopVersion === 'function') {
      window.BetterX.getDesktopVersion()
        .then(desktopVersion => {
          version.textContent = desktopVersion || 'Not available';
        })
        .catch(err => {
          console.error('Error getting desktop version', err);
          version.textContent = 'Error';
        });
    } else {
      version.textContent = 'Not available';
    }
    
    buildDate.textContent = window.betterX?.buildDate || new Date().toLocaleDateString();
  } catch (e) {
    console.error('Error setting version information', e);
    version.textContent = 'Error';
    buildDate.textContent = 'Error';
  }

  // Setup notification tester button
  const notificationTesterBtn = document.getElementById('betterx-open-notification-tester');
  notificationTesterBtn.addEventListener('click', () => {
    if (!uiManager.notificationTesterModal) {
      createNotificationTester(uiManager);
    }
    
    uiManager.settingsModal.style.display = 'none';
    uiManager.notificationTesterModal.style.display = 'flex';
  });
}

/**
 * Create the notification tester modal
 * @param {Object} uiManager - The UIManager instance
 */
export function createNotificationTester(uiManager) {
  // Create modal with same styling as other BetterX modals
  const modal = document.createElement('div');
  modal.className = 'betterx-modal';
  modal.style.display = 'none';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'betterx-modal-content';

  // Create header similar to other BetterX modals
  const header = document.createElement('div');
  header.className = 'betterx-modal-header';
  header.innerHTML = `
    <h2>Notification Tester</h2>
    <span class="betterx-close">&times;</span>
  `;
  
  // Create body using the same classes as other BetterX content
  const body = document.createElement('div');
  body.className = 'betterx-modal-body';
  
  body.innerHTML = `
    <div class="betterx-plugin-item">
      <div class="betterx-plugin-header">
        <div class="betterx-plugin-info">
          <h3>Notification Type</h3>
        </div>
      </div>
      <div class="betterx-plugin-details" style="display: block;">
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="radio" name="notif-type" value="info" checked style="margin-right: 5px;"> Info
          </label>
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="radio" name="notif-type" value="success" style="margin-right: 5px;"> Success
          </label>
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="radio" name="notif-type" value="warning" style="margin-right: 5px;"> Warning
          </label>
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="radio" name="notif-type" value="error" style="margin-right: 5px;"> Error
          </label>
        </div>
      </div>
    </div>
    
    <div class="betterx-plugin-item">
      <div class="betterx-plugin-header">
        <div class="betterx-plugin-info">
          <h3>Content</h3>
        </div>
      </div>
      <div class="betterx-plugin-details" style="display: block;">
        <div class="betterx-option-wrapper">
          <label for="notif-title" class="betterx-option-label">Title</label>
          <input id="notif-title" type="text" placeholder="Notification Title" value="Test Notification" class="betterx-input" style="width: 100%; box-sizing: border-box;">
        </div>
        
        <div class="betterx-option-wrapper" style="margin-top: 10px;">
          <label for="notif-message" class="betterx-option-label">Message</label>
          <textarea id="notif-message" placeholder="Notification Message" class="betterx-input" style="width: 100%; box-sizing: border-box; min-height: 80px; resize: vertical;">This is a test notification from BetterX</textarea>
        </div>
      </div>
    </div>
    
    <div class="betterx-plugin-item">
      <div class="betterx-plugin-header">
        <div class="betterx-plugin-info">
          <h3>Options</h3>
        </div>
      </div>
      <div class="betterx-plugin-details" style="display: block;">
        <div class="betterx-option-wrapper">
          <label for="notif-duration" class="betterx-option-label">Duration (ms)</label>
          <input id="notif-duration" type="number" value="5000" min="0" step="1000" class="betterx-input" style="width: 100%; box-sizing: border-box;">
          <div class="betterx-option-description">0 = stays until dismissed</div>
        </div>
        
        <div class="betterx-option-wrapper" style="margin-top: 10px;">
          <label class="betterx-switch">
            <input type="checkbox" id="notif-progress" checked>
            <span class="betterx-slider"></span>
          </label>
          <span style="margin-left: 10px;">Show Progress Bar</span>
        </div>
        
        <div class="betterx-option-wrapper" style="margin-top: 10px;">
          <label class="betterx-switch">
            <input type="checkbox" id="notif-html">
            <span class="betterx-slider"></span>
          </label>
          <span style="margin-left: 10px;">Parse as HTML</span>
        </div>
        
        <div class="betterx-option-wrapper" style="margin-top: 10px;">
          <label class="betterx-switch">
            <input type="checkbox" id="notif-plugin-source">
            <span class="betterx-slider"></span>
          </label>
          <span style="margin-left: 10px;">Add Plugin Source</span>
        </div>
      </div>
    </div>
    
    <div class="betterx-plugin-item">
      <div class="betterx-plugin-header">
        <div class="betterx-plugin-info">
          <h3>Actions</h3>
        </div>
      </div>
      <div class="betterx-plugin-details" style="display: block;">
        <div id="notif-actions">
          <div class="notif-action-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
            <input type="text" placeholder="Button Label" class="betterx-input" style="flex-grow: 1; box-sizing: border-box;">
            <button class="remove-action betterx-button secondary" style="padding: 4px 8px; flex-shrink: 0;">×</button>
          </div>
        </div>
        <button id="add-action" class="betterx-button secondary">+ Add Action</button>
      </div>
    </div>
    
    <div class="betterx-theme-controls" style="display: flex; justify-content: space-between; margin-top: 20px;">
      <button id="show-notification" class="betterx-button primary">Show Notification</button>
      <button id="clear-all" class="betterx-button secondary">Clear All Notifications</button>
    </div>
    
    <div class="betterx-plugin-item" style="margin-top: 20px; border-top: 1px solid #38444d;">
      <div class="betterx-plugin-header">
        <div class="betterx-plugin-info">
          <h3>Last Notification: <span id="last-notification-id" style="font-weight: normal;">None</span></h3>
        </div>
      </div>
      <div class="betterx-plugin-details" style="display: flex; gap: 10px;">
        <button id="update-notification" class="betterx-button primary" disabled>Update Last</button>
        <button id="remove-notification" class="betterx-button secondary" disabled>Remove Last</button>
      </div>
    </div>
  `;
  
  // Assemble modal
  modalContent.appendChild(header);
  modalContent.appendChild(body);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Store reference to modal in uiManager
  uiManager.notificationTesterModal = modal;

  // Close button
  modal.querySelector('.betterx-close').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Add action button
  const addActionBtn = modal.querySelector('#add-action');
  const actionsContainer = modal.querySelector('#notif-actions');

  addActionBtn.addEventListener('click', () => {
    const actionRow = document.createElement('div');
    actionRow.className = 'notif-action-row';
    actionRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
    
    actionRow.innerHTML = `
      <input type="text" placeholder="Button Label" class="betterx-input" style="flex-grow: 1; box-sizing: border-box;">
      <button class="remove-action betterx-button secondary" style="padding: 4px 8px; flex-shrink: 0;">×</button>
    `;
    
    actionsContainer.appendChild(actionRow);
    
    actionRow.querySelector('.remove-action').addEventListener('click', () => {
      actionRow.remove();
    });
  });

  // Add event listener to existing remove buttons
  modal.querySelectorAll('.remove-action').forEach(button => {
    button.addEventListener('click', () => {
      button.closest('.notif-action-row').remove();
    });
  });

  // Show notification button
  const showNotifButton = modal.querySelector('#show-notification');
  let lastNotificationId = null;

  showNotifButton.addEventListener('click', () => {
    const type = modal.querySelector('input[name="notif-type"]:checked').value;
    const title = modal.querySelector('#notif-title').value;
    const message = modal.querySelector('#notif-message').value;
    const duration = parseInt(modal.querySelector('#notif-duration').value, 10);
    const progress = modal.querySelector('#notif-progress').checked;
    const html = modal.querySelector('#notif-html').checked;
    const pluginSource = modal.querySelector('#notif-plugin-source').checked;
    
    // Collect actions
    const actions = [];
    modal.querySelectorAll('.notif-action-row').forEach(row => {
      const label = row.querySelector('input').value.trim();
      if (label) {
        actions.push({
          label,
          callback: () => {
            uiManager.notifyInfo(`Action "${label}" clicked`, {
              title: "Button Clicked",
              duration: 3000
            });
          }
        });
      }
    });
    
    const options = {
      title,
      message,
      type,
      duration,
      progress,
      html,
      plugin: pluginSource ? "Developer Tools" : null,
      actions
    };
    
    // Show the notification using BetterX's notification system
    lastNotificationId = uiManager.notify(options);
    
    // Update the last ID display
    const lastIdElement = modal.querySelector('#last-notification-id');
    lastIdElement.textContent = lastNotificationId;
    
    // Enable update and remove buttons
    const updateBtn = modal.querySelector('#update-notification');
    const removeBtn = modal.querySelector('#remove-notification');
    updateBtn.disabled = false;
    removeBtn.disabled = false;
  });

  // Update notification button
  const updateNotifButton = modal.querySelector('#update-notification');
  updateNotifButton.addEventListener('click', () => {
    if (!lastNotificationId) return;
    
    const type = modal.querySelector('input[name="notif-type"]:checked').value;
    const title = modal.querySelector('#notif-title').value;
    const message = modal.querySelector('#notif-message').value;
    const duration = parseInt(modal.querySelector('#notif-duration').value, 10);
    const progress = modal.querySelector('#notif-progress').checked;
    const html = modal.querySelector('#notif-html').checked;
    
    const options = {
      title,
      message,
      type,
      duration,
      progress,
      html
    };
    
    uiManager.updateNotification(lastNotificationId, options);
  });

  // Remove notification button
  const removeNotifButton = modal.querySelector('#remove-notification');
  removeNotifButton.addEventListener('click', () => {
    if (!lastNotificationId) return;
    
    uiManager.removeNotification(lastNotificationId);
    
    // Reset the last ID display
    const lastIdElement = modal.querySelector('#last-notification-id');
    lastIdElement.textContent = 'None';
    
    // Disable update and remove buttons
    const updateBtn = modal.querySelector('#update-notification');
    const removeBtn = modal.querySelector('#remove-notification');
    updateBtn.disabled = true;
    removeBtn.disabled = true;
    
    lastNotificationId = null;
  });

  // Clear all notifications button
  const clearAllButton = modal.querySelector('#clear-all');
  clearAllButton.addEventListener('click', () => {
    // Use the API if available, otherwise use the UIManager directly
    if (window.BetterXAPI?.notifications) {
      window.BetterXAPI.notifications.clearAllNotifications();
    } else {
      uiManager.notifications.clearAll();
    }
    
    // Reset the last ID display
    const lastIdElement = modal.querySelector('#last-notification-id');
    lastIdElement.textContent = 'None';
    
    // Disable update and remove buttons
    const updateBtn = modal.querySelector('#update-notification');
    const removeBtn = modal.querySelector('#remove-notification');
    updateBtn.disabled = true;
    removeBtn.disabled = true;
    
    lastNotificationId = null;
  });
}
