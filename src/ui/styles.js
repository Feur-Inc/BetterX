export function injectUIStyles() {
  const styles = document.createElement('style');
  styles.textContent = `
    /* Use system fonts instead of loading remote fonts with CORS issues */
    .betterx-modal,
    .betterx-button,
    .betterx-tab,
    .betterx-plugin-info h3,
    .betterx-option-label,
    .betterx-select,
    .betterx-input,
    .betterx-notification,
    .betterx-notification-title,
    .betterx-notification-message,
    .betterx-notification-source,
    .betterx-notification-action,
    .betterx-developer-heading {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Root CSS Variables - Will be set dynamically */
    :root {
      --betterx-bg: rgba(91, 112, 131, 0.4);
      --betterx-modalBg: #15202b;
      --betterx-contentBg: #192734;
      --betterx-borderColor: #38444d;
      --betterx-textColor: #ffffff;
      --betterx-textColorSecondary: #8899a6;
      --betterx-accentColor: #1da1f2;
      --betterx-accentHoverColor: #1a91da;
      --betterx-hoverBg: rgba(239, 243, 244, 0.1);
      --betterx-switchBg: #38444d;
      --betterx-pluginDetailsBg: #192734;
      --betterx-tabsBg: #15202b;
      --betterx-searchBarBg: #273340;
      --betterx-searchBarBorderColor: #38444d;
      --betterx-searchBarPlaceholderColor: #8899a6;
      --betterx-searchBarHoverBg: #1c2732;
      --betterx-closeButtonHoverBg: rgba(239, 243, 244, 0.1);
      --betterx-notificationBg: #15202b;
      --betterx-notificationBorder: #38444d;
      --betterx-emojiPreviewBg: #15202b;
      --betterx-emojiPreviewBorder: #38444d;
      --betterx-themeItemBg: #192734;
      --betterx-editorMainBg: #192734;
    }
    
    .betterx-modal {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: none;
      position: fixed;
      z-index: 10000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: var(--betterx-bg);
      font-family: "Segoe UI", Arial, sans-serif;
      overflow-y: auto;
      overflow-x: hidden; /* Prevent horizontal scrolling */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE and Edge */
    }
    .betterx-modal::-webkit-scrollbar {
      display: none; /* Chrome, Safari and Opera */
    }
    .betterx-modal-content {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: var(--betterx-modalBg);
      border: 1px solid var(--betterx-borderColor);
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      color: var(--betterx-textColor);
      z-index: 10001;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center center;
      will-change: transform, height;
      overflow: hidden; /* Hide any overflow */
    }
    .betterx-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: var(--betterx-modalBg);
      padding: 20px;
      border-bottom: 1px solid var(--betterx-borderColor);
      z-index: 3; /* Increased z-index to stay above tabs */
      flex-shrink: 0; /* Prevent header from shrinking */
    }
    .betterx-modal-body {
      padding: 20px;
      overflow-x: hidden; /* Prevent horizontal scrolling */
      flex: 1;
      overflow-y: auto;
      margin-top: 0; /* Remove the excessive margin */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE and Edge */
    }
    .betterx-modal-body::-webkit-scrollbar {
      display: none; /* Chrome, Safari and Opera */
    }
    .betterx-plugin-item {
      border-bottom: 1px solid var(--betterx-borderColor);
      padding: 15px 0;
      max-width: 100%; /* Ensure content doesn't exceed container width */
      word-wrap: break-word; /* Break long words if needed */
    }
    .betterx-plugin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .betterx-plugin-info {
      flex-grow: 1;
    }
    .betterx-plugin-info h3 {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 700;
      margin: 0 0 5px 0;
      font-size: 16px;
    }
    .betterx-plugin-info p {
      margin: 0;
      font-size: 14px;
      color: var(--betterx-textColorSecondary);
    }
    .betterx-plugin-controls {
      display: flex;
      align-items: center;
    }
    .betterx-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 24px;
      flex-shrink: 0;
      margin-right: 10px;
    }
    .betterx-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .betterx-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--betterx-switchBg);
      transition: .4s;
      border-radius: 24px;
    }
    .betterx-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: var(--betterx-modalBg);
      transition: .4s;
      border-radius: 50%;
    }
    input:checked + .betterx-slider {
      background-color: var(--betterx-accentColor);
    }
    input:checked + .betterx-slider:before {
      transform: translateX(24px);
    }
    .betterx-details-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 5px;
    }
    .betterx-arrow-icon {
      width: 24px;
      height: 24px;
      fill: var(--betterx-textColorSecondary);
      transition: transform 0.3s ease;
    }
    .betterx-details-toggle.rotated .betterx-arrow-icon {
      transform: rotate(180deg);
    }
    .betterx-plugin-details {
      margin-top: 10px;
      padding: 10px;
      background-color: var(--betterx-pluginDetailsBg);
      border-radius: 8px;
      overflow-x: hidden; /* Prevent horizontal scrolling */
      word-wrap: break-word; /* Break long words if needed */
    }
    .betterx-plugin-details p {
      margin: 5px 0;
      font-size: 14px;
    }
    .betterx-option-wrapper {
      margin-top: 10px;
    }
    .betterx-option-label {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 500;
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .betterx-option-description {
      font-size: 12px;
      color: var(--betterx-textColorSecondary);
      margin-bottom: 5px;
    }
    .betterx-select,
    .betterx-input {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 100%;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid var(--betterx-borderColor);
      background-color: var(--betterx-contentBg);
      color: var(--betterx-textColor);
      font-size: 14px;
    }
    .betterx-select:focus,
    .betterx-input:focus {
      outline: none;
      border-color: var(--betterx-accentColor);
    }

    .betterx-restart-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10002;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    }
    .betterx-restart-content {
      background: #15202b;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #38444d;
      width: 90%;
      max-width: 400px;
    }
    .betterx-restart-content h3 {
      margin: 0 0 15px 0;
      color: #fff;
    }
    .betterx-changed-plugins {
      margin: 0 0 20px 0;
      padding: 0 0 0 20px;
      color: #8899a6;
    }
    .betterx-changed-plugins li {
      margin: 5px 0;
    }
    .betterx-restart-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    @media screen and (max-width: 480px) {
      .betterx-modal-content {
        width: 95%;
        padding: 15px;
      }
      .betterx-modal-header h2 {
        font-size: 18px;
      }
      .betterx-plugin-info h3 {
        font-size: 14px;
      }
      .betterx-plugin-info p {
        font-size: 12px;
      }
    }

    @media screen and (max-height: 600px) {
      .betterx-modal-content {
        max-height: 96vh;
      }
    }
    .betterx-tabs {
      display: flex;
      background-color: var(--betterx-tabsBg);
      padding: 0 20px;
      border-bottom: 1px solid var(--betterx-borderColor);
      width: 100%;
      box-sizing: border-box;
      z-index: 2;
      flex-shrink: 0; /* Prevent tabs from shrinking */
    }
    
    .betterx-tab {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 500;
      background: none;
      border: none;
      color: var(--betterx-textColorSecondary);
      padding: 10px 20px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.2s ease, border-color 0.2s ease;
    }
    
    .betterx-tab:hover {
      color: var(--betterx-accentColor);
    }
    
    .betterx-tab.active {
      color: var(--betterx-accentColor);
      border-bottom-color: var(--betterx-accentColor);
    }
    
    .betterx-tab-content {
      display: none;
      opacity: 0;
      transition: opacity 0.3s ease-out;
      padding-top: 10px; /* Add a small amount of padding at the top */
    }
    
    .betterx-tab-content.active {
      display: block;
      opacity: 1;
    }
    
    .betterx-theme-item {
      background: var(--betterx-themeItemBg);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      cursor: move;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .betterx-theme-item.dragging {
      opacity: 0.5;
      transform: scale(1.02);
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }

    .betterx-drag-handle {
      color: #8899a6;
      margin-right: 12px;
      cursor: move;
      display: flex;
      align-items: center;
    }

    .betterx-theme-header {
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }

    .betterx-theme-header h3 {
      margin: 0;
      flex-grow: 1;
    }
    
    .betterx-theme-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .betterx-theme-controls {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    /* Add as a separate selector to avoid affecting theme item controls */
    #betterx-theme-list > .betterx-theme-controls {
      margin-bottom: 20px;
    }
    
    .betterx-button {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 500;
      background: var(--betterx-accentColor);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .betterx-button:hover {
      background: var(--betterx-accentHoverColor);
    }
    
    .betterx-editor-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(5px);
    }
    
    .betterx-theme-editor {
      background-color: var(--betterx-modalBg);
      padding: 20px;
      border-radius: 12px;
      width: 90%;
      max-width: 900px;
      height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      border: 1px solid var(--betterx-borderColor);
    }
    
    .betterx-editor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 20px;
    }

    .betterx-editor-title {
      flex: 1;
    }

    .betterx-editor-title h3 {
      margin: 0 0 10px 0;
      font-size: 18px;
      color: var(--betterx-textColor);
    }

    .betterx-editor-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--betterx-editorMainBg);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--betterx-borderColor);
    }

    .betterx-editor-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: var(--betterx-contentBg);
      border-bottom: 1px solid var(--betterx-borderColor);
    }

    .betterx-editor-info {
      font-size: 12px;
      color: var(--betterx-textColorSecondary);
      font-weight: 500;
    }

    .betterx-codemirror-wrapper {
      flex: 1;
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .betterx-codemirror-wrapper::-webkit-scrollbar {
      display: none;
    }
    .betterx-codemirror-wrapper .cm-scroller {
      padding: 8px 0;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .betterx-codemirror-wrapper .cm-scroller::-webkit-scrollbar {
      display: none;
    }

    .betterx-input {
      width: 100%;
      max-width: 300px;
    }

    .betterx-editor-controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .betterx-author-link {
      color: #1da1f2;
      text-decoration: none;
    }
    .betterx-author-link:hover {
      text-decoration: underline;
    }
    .betterx-close {
      color: #8899a6;
      font-size: 32px;
      font-weight: bold;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      margin: -6px -6px -6px 0;
      transition: background-color 0.2s;
    }
    .betterx-close:hover {
      color: var(--betterx-textColor);
      background-color: var(--betterx-closeButtonHoverBg);
    }
    .betterx-theme-controls {
      margin-bottom: 20px;
    }
    .betterx-input.search-bar {
      background-color: var(--betterx-searchBarBg);
      border: 1px solid var(--betterx-searchBarBorderColor);
      border-radius: 20px;
      padding: 8px 16px;
      margin-bottom: 15px;
      font-size: 14px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      transition: border-color 0.2s, background-color 0.2s;
    }

    .betterx-input.search-bar:focus {
      background-color: var(--betterx-modalBg);
      border-color: var(--betterx-accentColor);
      outline: none;
      box-shadow: 0 0 0 1px rgba(29, 161, 242, 0.3);
    }

    .betterx-input.search-bar::placeholder {
      color: var(--betterx-searchBarPlaceholderColor);
    }
    #betterx-plugin-list {
      padding: 0 16px;
      box-sizing: border-box;
    }

    /* Notification Styles */
    .betterx-notification-container {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 320px;
      max-width: 100%;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      z-index: 90000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    
    .betterx-notification-container::-webkit-scrollbar {
      display: none;
    }
    
    .betterx-notification {
      /* Use CSS variables for theme compatibility */
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--betterx-notificationBg);
      color: var(--betterx-textColor);
      border-radius: 8px;
      border: 1px solid var(--betterx-notificationBorder);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      padding: 12px;
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
      pointer-events: auto;
      overflow: hidden;
      font-size: 14px;
      line-height: 1.4;
    }
    
    .betterx-notification-show {
      transform: translateX(0);
      opacity: 1;
    }
    
    .betterx-notification-hide {
      transform: translateX(120%);
      opacity: 0;
    }
    
    .betterx-notification-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    
    .betterx-notification-icon-container {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: currentColor;
    }
    
    .betterx-notification-text {
      flex-grow: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .betterx-notification-title {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 700;
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--betterx-textColor);
    }
    
    .betterx-notification-message {
      margin: 0;
      word-break: break-word;
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 400;
      color: var(--betterx-textColor);
    }
    
    .betterx-notification-source {
      margin-top: 4px;
      font-size: 12px;
      color: var(--betterx-textColorSecondary);
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 400;
    }
    
    .betterx-notification-close {
      color: var(--betterx-textColorSecondary);
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      background: none;
      border: none;
      padding: 2px 6px;
      margin: -2px -6px -2px 0;
      border-radius: 50%;
      transition: all 0.2s;
    }
    
    .betterx-notification-close:hover {
      color: var(--betterx-textColor);
      background-color: var(--betterx-hoverBg);
    }
    
    .betterx-notification-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      justify-content: flex-end;
    }
    
    .betterx-notification-action {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 500;
      background: transparent;
      border: 1px solid var(--betterx-borderColor);
      border-radius: 4px;
      color: var(--betterx-textColor);
      cursor: pointer;
      font-size: 13px;
      padding: 5px 10px;
      transition: all 0.2s;
    }
    
    .betterx-notification-action:hover {
      background: var(--betterx-hoverBg);
      border-color: var(--betterx-accentColor);
    }
    
    .betterx-notification-progress-container {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      margin-top: 12px;
      margin-left: -12px;
      margin-right: -12px;
      margin-bottom: -12px;
      border-radius: 0 0 8px 8px;
      overflow: hidden;
      position: relative;
    }
    
    .betterx-notification-progress {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      background: var(--accent, #1da1f2);
      will-change: width;
    }
    
    /* Notification Types */
    .betterx-notification-info {
      border-left: 4px solid var(--accent, #1da1f2);
    }
    
    .betterx-notification-success {
      border-left: 4px solid var(--ctp-mocha-green, #17bf63);
    }
    
    .betterx-notification-warning {
      border-left: 4px solid var(--ctp-mocha-yellow, #ffad1f);
    }
    
    .betterx-notification-error {
      border-left: 4px solid var(--ctp-mocha-red, #e0245e);
    }
    
    /* Progress bar color variations */
    .betterx-notification-info .betterx-notification-progress {
      background-color: var(--accent, #1da1f2);
    }
    
    .betterx-notification-success .betterx-notification-progress {
      background-color: var(--ctp-mocha-green, #17bf63);
    }
    
    .betterx-notification-warning .betterx-notification-progress {
      background-color: var(--ctp-mocha-yellow, #ffad1f);
    }
    
    .betterx-notification-error .betterx-notification-progress {
      background-color: var(--ctp-mocha-red, #e0245e);
    }

    /* Developer Tab Styles */
    .betterx-developer-section {
      background-color: #192734;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .betterx-developer-heading {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 700;
      margin: 0 0 8px 0;
      font-size: 16px;
    }
    
    .betterx-developer-description {
      color: #8899a6;
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .betterx-developer-actions {
      display: flex;
      gap: 8px;
    }
    
    .betterx-version-info {
      color: #8899a6;
      font-size: 14px;
    }
    
    .betterx-version-row {
      display: flex;
      margin-bottom: 4px;
    }
    
    .betterx-version-label {
      font-weight: 500;
      min-width: 120px;
    }
    
    .betterx-log-levels {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .betterx-log-option {
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    
    .betterx-log-option input {
      margin-right: 6px;
    }

    /* Emoji Preview Styles */
    .betterx-emoji-preview {
      position: absolute;
      background-color: var(--betterx-emojiPreviewBg);
      border: 1px solid var(--betterx-emojiPreviewBorder);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 300px;
      overflow: hidden;
    }
    
    .betterx-emoji-item {
      padding: 8px 12px;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .betterx-emoji-item:hover {
      background-color: rgba(29, 161, 242, 0.1);
    }
    
    .betterx-emoji {
      font-size: 18px;
      margin-right: 8px;
    }
    
    .betterx-emoji-name {
      color: var(--betterx-textColorSecondary);
      font-size: 14px;
    }

    /* Author avatar styles */
    .betterx-plugin-authors {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .betterx-plugin-authors p {
      margin: 0;
      font-weight: 500;
      min-width: 60px;
    }
    
    .betterx-author-avatars {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      align-items: center;
    }
    
    .betterx-author-avatar {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      display: inline-block;
      margin-right: -6px;
      border: 2px solid var(--betterx-modalBg);
      background-color: var(--betterx-contentBg);
      transition: transform 0.2s ease, z-index 0.1s;
      z-index: 1;
      vertical-align: middle; /* Added to fix alignment */
      line-height: 0; /* Added to eliminate extra space */
    }
    
    .betterx-author-avatar:hover {
      transform: scale(1.1);
      z-index: 2;
    }
    
    .betterx-author-avatar:last-child {
      margin-right: 0;
    }
    
    .betterx-author-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block; /* Added to eliminate extra space */
    }

    .betterx-author-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--betterx-modalBg);
      color: var(--betterx-textColor);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      margin-bottom: 5px;
      border: 1px solid var(--betterx-borderColor);
    }
    
    .betterx-author-avatar:hover .betterx-author-tooltip {
      opacity: 1;
    }

    .betterx-author-name {
      font-size: 14px;
      color: var(--betterx-textColorSecondary);
      margin-left: 5px;
    }
    
    .betterx-author-link {
      color: #1da1f2;
      text-decoration: none;
    }
    .betterx-author-link:hover {
      text-decoration: underline;
    }

    /* Add spacing between plugin options and authors */
    .betterx-plugin-options {
      margin-top: 8px;
    }
  `;
  document.head.appendChild(styles);
}
