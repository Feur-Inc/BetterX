export function injectUIStyles() {
  const styles = document.createElement('style');
  styles.textContent = `
    @font-face {
      font-family: "chirp";
      src: url("https://abs.twimg.com/responsive-web/client-web/chirp-regular-web.708173b5.woff2") format("woff2");
      font-weight: 400;
      font-style: normal;
    }
    
    @font-face {
      font-family: "chirp";
      src: url("https://abs.twimg.com/responsive-web/client-web/chirp-medium-web.f8e2739a.woff2") format("woff2");
      font-weight: 500;
      font-style: normal;
    }
    
    @font-face {
      font-family: "chirp";
      src: url("https://abs.twimg.com/responsive-web/client-web/chirp-bold-web.ebb56aba.woff2") format("woff2");
      font-weight: 700;
      font-style: normal;
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
      background-color: rgba(91, 112, 131, 0.4);
      font-family: "Segoe UI", Arial, sans-serif;
      overflow-y: auto;
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
      background-color: #15202b;
      border: 1px solid #38444d;
      border-radius: 16px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      color: #ffffff;
      scrollbar-width: none;
      -ms-overflow-style: none;
      z-index: 10001;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center center;
      will-change: transform, height;
    }
    .betterx-modal-content::-webkit-scrollbar {
      display: none;
    }
    .betterx-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      background-color: #15202b;
      padding: 20px;
      border-bottom: 1px solid #38444d;
      z-index: 2;
    }
    .betterx-modal-body {
      padding: 20px;
    }
    .betterx-plugin-item {
      border-bottom: 1px solid #38444d;
      padding: 15px 0;
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
      color: #8899a6;
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
      background-color: #38444d;
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
      background-color: #15202b;
      transition: .4s;
      border-radius: 50%;
    }
    input:checked + .betterx-slider {
      background-color: #1da1f2;
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
      fill: #8899a6;
      transition: transform 0.3s ease;
    }
    .betterx-details-toggle.rotated .betterx-arrow-icon {
      transform: rotate(180deg);
    }
    .betterx-plugin-details {
      margin-top: 10px;
      padding: 10px;
      background-color: #192734;
      border-radius: 8px;
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
      color: #8899a6;
      margin-bottom: 5px;
    }
    .betterx-select,
    .betterx-input {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 100%;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #38444d;
      background-color: #192734;
      color: #ffffff;
      font-size: 14px;
    }
    .betterx-select:focus,
    .betterx-input:focus {
      outline: none;
      border-color: #1da1f2;
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
      position: sticky;
      top: 65px;
      z-index: 2;
      background-color: #15202b;
      margin: -20px -20px 20px -20px;
      padding: 0 20px;
      border-bottom: 1px solid #38444d;
    }
    
    .betterx-tab {
      font-family: "chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-weight: 500;
      background: none;
      border: none;
      color: #8899a6;
      padding: 10px 20px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.2s ease, border-color 0.2s ease;
    }
    
    .betterx-tab:hover {
      color: #1da1f2;
    }
    
    .betterx-tab.active {
      color: #1da1f2;
      border-bottom-color: #1da1f2;
    }
    
    .betterx-tab-content {
      display: none;
      opacity: 0;
      transition: opacity 0.3s ease-out;
    }
    
    .betterx-tab-content.active {
      display: block;
      opacity: 1;
    }
    
    .betterx-theme-item {
      background: #192734;
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
      background: #1da1f2;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .betterx-button:hover {
      background: #1a91da;
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
      background: #15202b;
      padding: 20px;
      border-radius: 12px;
      width: 90%;
      max-width: 900px;
      height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      border: 1px solid #38444d;
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
      color: #fff;
    }

    .betterx-editor-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #192734;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #38444d;
    }

    .betterx-editor-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #22303c;
      border-bottom: 1px solid #38444d;
    }

    .betterx-editor-info {
      font-size: 12px;
      color: #8899a6;
      font-weight: 500;
    }

    .betterx-editor-actions {
      display: flex;
      gap: 8px;
    }

    .betterx-button.primary {
      background: #1da1f2;
    }

    .betterx-button.secondary {
      background: transparent;
      border: 1px solid #38444d;
    }

    .betterx-button.mini {
      padding: 4px 8px;
      font-size: 12px;
      background: transparent;
      border: 1px solid #38444d;
    }

    .betterx-button.mini:hover {
      background: rgba(29, 161, 242, 0.1);
      border-color: #1da1f2;
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
      color: #ffffff;
      background-color: rgba(239, 243, 244, 0.1);
    }
    .betterx-theme-controls {
      margin-bottom: 20px;
    }
    .betterx-input.search-bar {
      background-color: #273340;
      border: 1px solid #38444d;
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
      background-color: #15202b;
      border-color: #1da1f2;
      outline: none;
      box-shadow: 0 0 0 1px rgba(29, 161, 242, 0.3);
    }

    .betterx-input.search-bar::placeholder {
      color: #8899a6;
    }
    #betterx-plugin-list {
      padding: 0 16px;
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(styles);
}
