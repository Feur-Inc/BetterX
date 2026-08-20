// ─── BetterX UI Styles ────────────────────────────────────────────────────────

export const BETTERX_STYLES = `
/* === CSS Variables === */
:root {
  --betterx-bg: rgba(0, 0, 0, 0.7);
  --betterx-modalBg: #1e1e2e;
  --betterx-contentBg: #2a2a3e;
  --betterx-borderColor: #3a3a52;
  --betterx-textColor: #e0e0f0;
  --betterx-textColorSecondary: #9090b0;
  --betterx-accentColor: #1d9bf0;
  --betterx-hoverBg: #35354a;
  --betterx-switchBg: #3a3a52;
  --betterx-notificationBg: #2a2a3e;
  --betterx-searchBarBg: #1a1a2e;
  --betterx-danger: #ef4444;
  --betterx-success: #22c55e;
  --betterx-warning: #f59e0b;
}

/* === Modal Overlay === */
#betterx-modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--betterx-bg);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: betterxFadeIn 0.15s ease;
}

/* === Modal === */
#betterx-modal,
#betterx-modal * {
  font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}
#betterx-modal {
  background: var(--betterx-modalBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 16px;
  width: clamp(820px, 75vw, 1280px);
  max-width: calc(100vw - 32px);
  height: clamp(600px, 80vh, 960px);
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: betterxSlideUp 0.2s ease;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}

/* === Modal Header === */
.betterx-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  flex-shrink: 0;
}

.betterx-modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--betterx-textColor);
  display: flex;
  align-items: center;
  gap: 10px;
}

.betterx-modal-title-logo {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.betterx-modal-title-logo svg {
  width: 100%;
  height: 100%;
  display: block;
}

.betterx-modal-version {
  font-size: 11px;
  font-weight: 400;
  color: var(--betterx-textColorSecondary);
}

.betterx-modal-close {
  background: none;
  border: none;
  color: var(--betterx-textColorSecondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  font-size: 18px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}
.betterx-modal-close:hover {
  color: var(--betterx-textColor);
  background: var(--betterx-hoverBg);
}

/* === Tabs === */
.betterx-tabs {
  display: flex;
  gap: 2px;
  padding: 0 24px;
  border-bottom: 1px solid var(--betterx-borderColor);
  flex-shrink: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.betterx-tabs::-webkit-scrollbar { display: none; }

.betterx-tab {
  padding: 10px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--betterx-textColorSecondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.betterx-tab:hover {
  color: var(--betterx-textColor);
}

.betterx-tab.betterx-tab-active {
  color: var(--betterx-accentColor);
  border-bottom-color: var(--betterx-accentColor);
}

/* === Modal Body === */
.betterx-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--betterx-borderColor) transparent;
}
.betterx-modal-body::-webkit-scrollbar { width: 6px; }
.betterx-modal-body::-webkit-scrollbar-track { background: transparent; }
.betterx-modal-body::-webkit-scrollbar-thumb { background: var(--betterx-borderColor); border-radius: 3px; }

/* === Plugins Toolbar === */
.betterx-plugins-toolbar {
  display: flex !important;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.betterx-plugins-toolbar .betterx-search-bar {
  margin-bottom: 0;
  flex: 1;
}
.betterx-view-toggle {
  display: flex !important;
  background: var(--betterx-contentBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 8px;
  padding: 2px;
  flex-shrink: 0;
}
.betterx-view-btn {
  background: none !important;
  border: none !important;
  border-right: 1px solid var(--betterx-borderColor) !important;
  color: var(--betterx-textColorSecondary) !important;
  cursor: pointer !important;
  padding: 5px 8px !important;
  border-radius: 6px 0 0 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: color 0.15s, background 0.15s;
  line-height: 1;
}
.betterx-view-btn:last-child {
  border-right: none !important;
  border-radius: 0 6px 6px 0 !important;
}
.betterx-view-btn:hover {
  color: var(--betterx-textColor) !important;
  background: var(--betterx-hoverBg) !important;
}
.betterx-view-btn.betterx-view-btn-active {
  color: var(--betterx-accentColor) !important;
  background: var(--betterx-hoverBg) !important;
}

/* === Grid View === */
.betterx-plugin-list.betterx-grid-view {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}
.betterx-grid-view .betterx-plugin-item {
  min-height: 88px;
}
.betterx-grid-view .betterx-plugin-item {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}
.betterx-grid-view .betterx-plugin-header {
  flex: 1;
  align-items: flex-start;
}
.betterx-grid-view .betterx-plugin-description {
  white-space: normal;
  overflow: hidden;
  text-overflow: unset;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
/* Library label must span all grid columns */
.betterx-grid-view .betterx-library-section-label {
  grid-column: 1 / -1;
  margin-top: 4px;
}

/* === Plugin List === */
.betterx-search-bar {
  width: 100%;
  padding: 10px 14px;
  background: var(--betterx-searchBarBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  color: var(--betterx-textColor);
  font-size: 14px;
  outline: none;
  margin-bottom: 16px;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.betterx-search-bar:focus { border-color: var(--betterx-accentColor); }
.betterx-search-bar::placeholder { color: var(--betterx-textColorSecondary); }

.betterx-plugin-item {
  background: var(--betterx-contentBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.betterx-plugin-item:hover { border-color: var(--betterx-accentColor); }

.betterx-plugin-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  gap: 12px;
}

.betterx-plugin-info { flex: 1; min-width: 0; }

.betterx-plugin-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--betterx-textColor);
  display: flex;
  align-items: center;
  gap: 8px;
}

.betterx-plugin-description {
  font-size: 13px;
  color: var(--betterx-textColorSecondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.betterx-plugin-body {
  padding: 0 16px 14px;
  border-top: 1px solid var(--betterx-borderColor);
}

/* === Plugin Detail Panel (tiled mode) === */
@keyframes betterxSlideInRight {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

.betterx-plugin-list-view {
  display: contents;
}

.betterx-plugin-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  animation: betterxSlideInRight 0.18s ease;
}

.betterx-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--betterx-accentColor);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0 0 14px 0;
  flex-shrink: 0;
}
.betterx-detail-back:hover { opacity: 0.75; }
.betterx-detail-back svg { flex-shrink: 0; }

.betterx-detail-hero {
  background: var(--betterx-contentBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.betterx-detail-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.betterx-detail-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--betterx-textColor);
  display: flex;
  align-items: center;
  gap: 8px;
}

.betterx-detail-description {
  font-size: 14px;
  color: var(--betterx-textColorSecondary);
  line-height: 1.6;
}

.betterx-detail-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.betterx-detail-body .betterx-plugin-authors { margin-bottom: 12px; }
.betterx-detail-body .betterx-plugin-options { margin: 0; }

.betterx-detail-deps {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.betterx-detail-deps-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.betterx-detail-deps-label {
  font-size: 12px;
  color: var(--betterx-textColorSecondary);
  min-width: 72px;
  flex-shrink: 0;
}
.betterx-dep-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  background: none;
  transition: opacity 0.15s;
}
.betterx-dep-badge:hover { opacity: 0.75; }
.betterx-dep-badge-on {
  color: var(--betterx-success);
  border-color: var(--betterx-success);
}
.betterx-dep-badge-off {
  color: var(--betterx-textColorSecondary);
  border-color: var(--betterx-borderColor);
}

/* === Cloud Sync Tab === */
/* === Cloud Sync Tab — tile grid layout === */
.bx-cloud-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 16px;
}

.bx-cloud-card {
  background: var(--betterx-contentBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bx-cloud-card-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--betterx-textColorSecondary);
  margin-bottom: 2px;
}

/* Account card — left column */
.bx-cloud-account-card {
  grid-column: 1;
  grid-row: 1;
}

.bx-cloud-status-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bx-cloud-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--betterx-textColorSecondary);
  flex-shrink: 0;
  transition: background 0.3s;
}

.bx-cloud-status-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--betterx-textColor);
}

.bx-cloud-user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--betterx-searchBarBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
}

.bx-cloud-pfp {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.bx-cloud-username {
  font-weight: 600;
  font-size: 15px;
  color: var(--betterx-textColor);
}

.bx-cloud-auth-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
}

/* Connection card — right column */
.bx-cloud-connection-card {
  grid-column: 2;
  grid-row: 1;
}

.bx-cloud-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bx-cloud-field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--betterx-textColor);
}

.bx-cloud-field-desc {
  font-size: 13px;
  color: var(--betterx-textColorSecondary);
  margin-bottom: 6px;
}

.bx-cloud-url-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* Ops row — spans both columns */
.bx-cloud-ops-row {
  grid-column: 1 / -1;
  grid-row: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.bx-cloud-op-card {
  justify-content: space-between;
}

.bx-cloud-op-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
}

.bx-full-btn {
  width: 100%;
  justify-content: center;
}
.betterx-button {
  background: var(--betterx-switchBg);
  color: var(--betterx-textColor);
  border: 1px solid var(--betterx-borderColor);
  padding: 8px 20px;
  border-radius: 9999px;
  font-weight: 700;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  transition: background 0.2s, opacity 0.2s;
}
.betterx-button:hover:not(:disabled) {
  background: var(--betterx-hoverBg);
}
.betterx-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.betterx-button-primary {
  background: var(--betterx-accentColor);
  border-color: transparent;
  color: white;
}
.betterx-button-primary:hover:not(:disabled) {
  background: var(--betterx-accentColor);
  filter: brightness(1.1);
}
.betterx-button-danger {
  background: rgba(239, 68, 68, 0.1);
  color: var(--betterx-danger);
  border-color: rgba(239, 68, 68, 0.2);
}
.betterx-button-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
}
.betterx-help-text {
  color: var(--betterx-textColorSecondary);
  font-size: 13px;
  margin: 0;
  line-height: 1.5;
}

.betterx-plugin-authors {
  display: flex;
  gap: 8px;
  margin: 10px 0;
  flex-wrap: wrap;
}

.betterx-author-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--betterx-searchBarBg);
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--betterx-textColorSecondary);
  text-decoration: none;
}

.betterx-author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

/* === Toggle Switch === */
.betterx-toggle {
  display: block;
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.betterx-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.betterx-toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--betterx-switchBg);
  border-radius: 24px;
  cursor: pointer;
  transition: background 0.2s;
}

.betterx-toggle-slider::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
}

.betterx-toggle input:checked + .betterx-toggle-slider {
  background: var(--betterx-accentColor);
}

.betterx-toggle input:checked + .betterx-toggle-slider::before {
  transform: translateX(20px);
}

/* === Option Controls === */
.betterx-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 0;
  gap: 16px;
  border-bottom: 1px solid var(--betterx-borderColor);
}
.betterx-option:last-child { border-bottom: none; }

.betterx-option-label-group {
  flex: 1;
  min-width: 0;
}

.betterx-option-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--betterx-textColor);
}

.betterx-option-label-badged {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--betterx-textColor);
}

.betterx-restart-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--betterx-warning);
  color: #000;
  opacity: 0.8;
  flex-shrink: 0;
}

.betterx-platform-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--betterx-textColorSecondary);
  color: var(--betterx-bg);
  opacity: 0.7;
  flex-shrink: 0;
}

.betterx-plugin-item-unavailable {
  opacity: 0.45;
  pointer-events: none;
}
.betterx-plugin-item-unavailable .betterx-plugin-header {
  pointer-events: auto;
  cursor: default !important;
}

.betterx-plugin-item-meta {
  border-color: var(--betterx-accentColor);
  background: color-mix(in srgb, var(--betterx-accentColor) 6%, var(--betterx-pluginBg));
}
.betterx-plugin-item-meta .betterx-plugin-header { cursor: pointer; }

.betterx-version-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--betterx-accentColor);
  background: color-mix(in srgb, var(--betterx-accentColor) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--betterx-accentColor) 40%, transparent);
  border-radius: 12px;
  padding: 2px 8px;
  flex-shrink: 0;
}

.betterx-plugin-item-library {
  opacity: 0.6;
}
.betterx-plugin-item-library .betterx-plugin-header { cursor: pointer; }

.betterx-auto-badge {
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  padding: 2px 8px;
  flex-shrink: 0;
}
.betterx-auto-badge-on {
  color: #22c55e;
  background: color-mix(in srgb, #22c55e 15%, transparent);
  border: 1px solid color-mix(in srgb, #22c55e 40%, transparent);
}
.betterx-auto-badge-off {
  color: var(--betterx-textColorSecondary);
  background: color-mix(in srgb, var(--betterx-textColorSecondary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--betterx-textColorSecondary) 25%, transparent);
}

.betterx-library-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--betterx-textColorSecondary);
  padding: 14px 4px 6px;
  margin-top: 4px;
  border-top: 1px solid var(--betterx-border);
}

.betterx-option-description {
  font-size: 13px;
  color: var(--betterx-textColorSecondary);
  margin-top: 3px;
}

.betterx-option-control {
  flex-shrink: 0;
}

.betterx-bundle-path {
  font-size: 12px;
  color: var(--betterx-textColorSecondary);
  font-family: monospace;
  word-break: break-all;
  padding: 8px 10px;
  margin-bottom: 10px;
  background: var(--betterx-searchBarBg);
  border-radius: 6px;
  border: 1px solid var(--betterx-borderColor);
}

.betterx-select {
  appearance: none;
  background: var(--betterx-searchBarBg);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='%23888'%3E%3Cpath d='M8 11L2 5h12z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  color: var(--betterx-textColor);
  padding: 8px 32px 8px 12px;
  font-size: 14px;
  min-height: 38px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.betterx-select:hover  { border-color: color-mix(in srgb, var(--betterx-accentColor) 50%, var(--betterx-borderColor)); }
.betterx-select:focus  { border-color: var(--betterx-accentColor); }

.betterx-input-text {
  background: var(--betterx-searchBarBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  color: var(--betterx-textColor);
  padding: 8px 12px;
  font-size: 14px;
  min-height: 38px;
  outline: none;
  min-width: 180px;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.betterx-input-text:hover { border-color: color-mix(in srgb, var(--betterx-accentColor) 50%, var(--betterx-borderColor)); }
.betterx-input-text:focus { border-color: var(--betterx-accentColor); }

.betterx-input-number {
  background: var(--betterx-searchBarBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  color: var(--betterx-textColor);
  padding: 8px 12px;
  font-size: 14px;
  min-height: 38px;
  outline: none;
  width: 120px;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.betterx-input-number:hover { border-color: color-mix(in srgb, var(--betterx-accentColor) 50%, var(--betterx-borderColor)); }
.betterx-input-number:focus { border-color: var(--betterx-accentColor); }

.betterx-color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}
.betterx-input-color {
  -webkit-appearance: none;
  appearance: none;
  width: 40px;
  height: 38px;
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  background: none;
  cursor: pointer;
  padding: 3px;
  transition: border-color 0.15s;
}
.betterx-input-color:hover { border-color: color-mix(in srgb, var(--betterx-accentColor) 50%, var(--betterx-borderColor)); }
.betterx-input-color::-webkit-color-swatch-wrapper { padding: 0; }
.betterx-input-color::-webkit-color-swatch { border: none; border-radius: 6px; }
.betterx-input-color::-moz-color-swatch { border: none; border-radius: 6px; }
.betterx-input-color-hex { width: 100px; font-family: monospace; }

/* === Theme Editor === */
.betterx-theme-list { display: flex; flex-direction: column; gap: 8px; }

.betterx-theme-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--betterx-contentBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  gap: 12px;
  cursor: grab;
  transition: border-color 0.15s, background 0.15s;
}
.betterx-theme-item:hover { border-color: var(--betterx-accentColor); }
.betterx-theme-item.betterx-dragging { opacity: 0.5; cursor: grabbing; }

.betterx-theme-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--betterx-textColor);
}

.betterx-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s, background 0.15s;
}
.betterx-btn:hover { opacity: 0.85; }

.betterx-btn-primary {
  background: var(--betterx-accentColor);
  color: white;
}

.betterx-btn-secondary {
  background: var(--betterx-contentBg);
  border: 1px solid var(--betterx-borderColor);
  color: var(--betterx-textColor);
}

.betterx-btn-danger {
  background: var(--betterx-danger);
  color: white;
}

.betterx-theme-editor {
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  overflow: hidden;
  margin-top: 12px;
}

/* === Theme Editor Modal === */
#betterx-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: betterxFadeIn 0.15s ease;
}
#betterx-editor-overlay,
#betterx-editor-overlay * {
  font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}

.betterx-editor-modal {
  background: var(--betterx-modalBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 16px;
  width: 900px;
  max-width: calc(100vw - 48px);
  height: 80vh;
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  animation: betterxSlideUp 0.2s ease;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}

.betterx-editor-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--betterx-borderColor);
  flex-shrink: 0;
}

.betterx-editor-modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--betterx-textColor);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.betterx-editor-modal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.betterx-editor-modal-close {
  background: none;
  border: none;
  color: var(--betterx-textColorSecondary);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
}
.betterx-editor-modal-close:hover {
  color: var(--betterx-textColor);
  background: var(--betterx-hoverBg);
}

.betterx-editor-modal-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.betterx-editor-modal-body .cm-editor {
  height: 100%;
}

/* Live Reload Toggle */
.betterx-editor-live-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--betterx-textColorSecondary);
  user-select: none;
  white-space: nowrap;
}
.betterx-editor-live-toggle .betterx-toggle {
  width: 36px;
  height: 20px;
}
.betterx-editor-live-toggle .betterx-toggle-slider::before {
  width: 14px;
  height: 14px;
}
.betterx-editor-live-toggle .betterx-toggle input:checked + .betterx-toggle-slider::before {
  transform: translateX(16px);
}

/* Mode Selector Group (Full | Split | Window) */
.betterx-editor-mode-group {
  display: flex;
  align-items: center;
  border: 1px solid var(--betterx-borderColor);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.betterx-editor-mode-btn {
  background: none;
  border: none;
  color: var(--betterx-textColorSecondary);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  line-height: 1;
}
.betterx-editor-mode-btn:not(:last-child) {
  border-right: 1px solid var(--betterx-borderColor);
}
.betterx-editor-mode-btn:hover {
  background: var(--betterx-hoverBg);
  color: var(--betterx-textColor);
}
.betterx-editor-mode-btn.betterx-editor-mode-active {
  background: var(--betterx-accentColor);
  color: #fff;
}

/* Resize Handle */
.betterx-editor-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  z-index: 10;
  opacity: 0.4;
  transition: opacity 0.15s;
}
.betterx-editor-resize-handle::after {
  content: '';
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--betterx-textColorSecondary);
  border-bottom: 2px solid var(--betterx-textColorSecondary);
}
.betterx-editor-resize-handle:hover {
  opacity: 1;
}

/* Split View Mode */
#betterx-editor-overlay.betterx-split-mode {
  background: none;
  pointer-events: none;
  align-items: stretch;
  justify-content: flex-end;
}
#betterx-editor-overlay.betterx-split-mode .betterx-editor-modal {
  pointer-events: auto;
  position: relative;
  width: 50vw;
  max-width: 50vw;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
  animation: none;
  box-shadow: -4px 0 32px rgba(0, 0, 0, 0.5);
  border-right: none;
  border-top: none;
  border-bottom: none;
}
/* In split mode, resize handle becomes a left-edge drag bar */
#betterx-editor-overlay.betterx-split-mode .betterx-editor-resize-handle {
  top: 0;
  left: 0;
  bottom: 0;
  right: auto;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  border-radius: 0;
}
#betterx-editor-overlay.betterx-split-mode .betterx-editor-resize-handle::after {
  content: none;
}
#betterx-editor-overlay.betterx-split-mode .betterx-editor-resize-handle:hover {
  background: var(--betterx-accentColor);
  opacity: 0.5;
}

/* Window Mode */
#betterx-editor-overlay.betterx-window-mode {
  background: none;
  pointer-events: none;
}
#betterx-editor-overlay.betterx-window-mode .betterx-editor-modal {
  pointer-events: auto;
  position: fixed;
  border-radius: 12px;
  animation: none;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  transition: opacity 0.15s ease;
}
#betterx-editor-overlay.betterx-window-mode .betterx-editor-modal-header {
  cursor: grab;
}
#betterx-editor-overlay.betterx-window-mode .betterx-editor-modal-header:active {
  cursor: grabbing;
}

/* === Developer Tab === */
.betterx-dev-section {
  background: var(--betterx-contentBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.betterx-dev-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--betterx-textColor);
  margin: 0 0 12px;
}

.betterx-dev-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* === About Tab === */
.betterx-about {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
  gap: 16px;
}
.betterx-tab-panel[data-tab-id="about"] {
  overflow-y: hidden;
}
.betterx-modal-body:has(.betterx-tab-panel[data-tab-id="about"]:not([style*="none"])) {
  overflow-y: hidden;
}

.betterx-about-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 12px;
}

.betterx-about h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--betterx-textColor);
  margin: 0;
}

.betterx-about-version {
  font-size: 13px;
  color: var(--betterx-textColorSecondary);
}

.betterx-about-contributors {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}

/* === Contributor Modal === */
.bx-cm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(3px);
  animation: betterxFadeIn 0.15s ease;
}
.bx-cm-modal {
  font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--betterx-modalBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 16px;
  padding: 24px;
  width: 480px;
  max-width: calc(100vw - 32px);
  max-height: min(520px, calc(100vh - 64px));
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  animation: betterxSlideUp 0.2s ease;
}
.bx-cm-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.bx-cm-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.bx-cm-name {
  font-size: 17px;
  font-weight: 700;
  color: var(--betterx-textColor);
}
.bx-cm-handle {
  font-size: 14px;
  color: var(--betterx-textColorSecondary);
  margin-top: 2px;
}
.bx-cm-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  flex: 1;
}
.bx-cm-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--betterx-textColorSecondary);
  flex-shrink: 0;
}
.bx-cm-plugin-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: var(--betterx-searchBarBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 12px;
  padding: 10px;
  scrollbar-width: thin;
  scrollbar-color: var(--betterx-borderColor) transparent;
}
.bx-cm-plugin-list .betterx-plugin-item {
  flex-shrink: 0;
}
.bx-cm-plugin-list::-webkit-scrollbar { width: 6px; }
.bx-cm-plugin-list::-webkit-scrollbar-track { background: transparent; }
.bx-cm-plugin-list::-webkit-scrollbar-thumb { background: var(--betterx-borderColor); border-radius: 3px; }
.bx-cm-empty {
  font-size: 13px;
  color: var(--betterx-textColorSecondary);
  padding: 8px 0;
}
/* === Plugin Detail Modal (from contributor modal) === */
.bx-pd-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(3px);
  animation: betterxFadeIn 0.15s ease;
}
.bx-pd-modal {
  font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--betterx-modalBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 16px;
  width: clamp(820px, 75vw, 1280px);
  max-width: calc(100vw - 32px);
  height: clamp(600px, 80vh, 960px);
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: betterxSlideUp 0.2s ease;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
}
.bx-pd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--betterx-borderColor);
  flex-shrink: 0;
}
.bx-pd-header .betterx-detail-back { padding: 0; }
.bx-pd-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--betterx-borderColor) transparent;
}
.bx-pd-body::-webkit-scrollbar { width: 6px; }
.bx-pd-body::-webkit-scrollbar-track { background: transparent; }
.bx-pd-body::-webkit-scrollbar-thumb { background: var(--betterx-borderColor); border-radius: 3px; }
.bx-cm-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* Author badges — clickable everywhere */
.betterx-author-badge {
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.15s, color 0.15s;
}
.betterx-author-badge:hover {
  border-color: var(--betterx-accentColor);
  color: var(--betterx-textColor);
}

/* === Notifications === */
#betterx-notification-container,
#betterx-notification-container * {
  font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}

.betterx-notification-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 360px;
  width: 100%;
}
.betterx-notification-container[data-position="bottom-left"] { right: auto; left: 20px; }
.betterx-notification-container[data-position="top-right"]   { bottom: auto; top: 20px; }
.betterx-notification-container[data-position="top-left"]    { bottom: auto; top: 20px; right: auto; left: 20px; }

.betterx-notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--betterx-notificationBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 12px;
  pointer-events: all;
  position: relative;
  opacity: 0;
  transform: translateX(100%);
  transition: opacity 0.25s, transform 0.25s;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.betterx-notification-show {
  opacity: 1;
  transform: translateX(0);
}

.betterx-notification-hide {
  opacity: 0;
  transform: translateX(100%);
}

.betterx-notification-info    { border-left: 3px solid #1d9bf0; }
.betterx-notification-success { border-left: 3px solid #22c55e; }
.betterx-notification-warning { border-left: 3px solid #f59e0b; }
.betterx-notification-error   { border-left: 3px solid #ef4444; }

.betterx-notification-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}
.betterx-notification-info    .betterx-notification-icon { color: #1d9bf0; }
.betterx-notification-success .betterx-notification-icon { color: #22c55e; }
.betterx-notification-warning .betterx-notification-icon { color: #f59e0b; }
.betterx-notification-error   .betterx-notification-icon { color: #ef4444; }

.betterx-notification-icon svg { width: 100%; height: 100%; display: block; }

.betterx-notification-content { flex: 1; min-width: 0; }

.betterx-notification-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--betterx-textColor);
  margin: 0 0 4px;
}

.betterx-notification-message {
  font-size: 13px;
  color: var(--betterx-textColorSecondary);
  margin: 0;
  word-break: break-word;
}

.betterx-notification-close {
  background: none;
  border: none;
  color: var(--betterx-textColorSecondary);
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.15s;
}
.betterx-notification-close:hover { color: var(--betterx-textColor); }

.betterx-notification-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.betterx-notification-action {
  padding: 5px 10px;
  background: var(--betterx-hoverBg);
  border: 1px solid var(--betterx-borderColor);
  border-radius: 6px;
  color: var(--betterx-textColor);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.betterx-notification-action:hover { background: var(--betterx-accentColor); }

.betterx-notification-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--betterx-borderColor);
}

.betterx-notification-progress {
  height: 100%;
  background: var(--betterx-accentColor);
  width: 100%;
}

/* === BetterX Nav Button === */
#betterx-nav-btn:hover > div:first-child {
  background-color: color-mix(in srgb, currentColor 10%, transparent) !important;
}

#betterx-nav-btn:hover [dir="ltr"] {
  color: var(--betterx-textColor) !important;
}

/* === Focus Indicators === */
.betterx-tab:focus-visible,
.betterx-btn:focus-visible,
.betterx-modal-close:focus-visible {
  outline: 2px solid var(--betterx-accentColor);
  outline-offset: 2px;
}
.betterx-toggle input:focus-visible + .betterx-toggle-slider {
  outline: 2px solid var(--betterx-accentColor);
  outline-offset: 2px;
}

/* === Themes Tab === */
.betterx-themes-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  align-items: center;
}

.betterx-theme-new-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--betterx-borderColor);
  background: var(--betterx-searchBarBg);
  color: var(--betterx-textColor);
  font-size: 14px;
  min-width: 0;
  box-sizing: border-box;
  outline: none;
}
.betterx-theme-new-input:focus { border-color: var(--betterx-accentColor); }

.betterx-empty-state {
  text-align: center;
  color: var(--betterx-textColorSecondary);
  padding: 40px;
}

.betterx-drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  margin-bottom: 16px;
  border: 2px dashed var(--betterx-borderColor);
  border-radius: 10px;
  color: var(--betterx-textColorSecondary);
  font-size: 13px;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
  cursor: default;
}
.betterx-drop-zone svg {
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.2s;
}
.betterx-drop-zone-active {
  border-color: var(--betterx-accentColor);
  background: rgba(29, 155, 240, 0.06);
  color: var(--betterx-textColor);
}
.betterx-drop-zone-active svg {
  opacity: 1;
  color: var(--betterx-accentColor);
}

.betterx-drag-handle {
  color: var(--betterx-textColorSecondary);
  cursor: grab;
  font-size: 16px;
  flex-shrink: 0;
}

.betterx-editor-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.betterx-editor-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--betterx-textColor);
  margin: 0;
}

/* === Developer Tab === */
.betterx-dev-plugin-list {
  font-family: monospace;
  font-size: 12px;
  color: var(--betterx-textColorSecondary);
  max-height: 200px;
  overflow-y: auto;
}
.betterx-dev-plugin-row { padding: 2px 0; }
.betterx-dev-plugin-name { color: var(--betterx-textColor); }

/* === About Tab === */
.betterx-about-description {
  color: var(--betterx-textColorSecondary);
  text-align: center;
  max-width: 400px;
  font-size: 14px;
}

.betterx-about-contributors-section {
  width: 100%;
  border-top: 1px solid var(--betterx-borderColor);
  padding-top: 20px;
  margin-top: 8px;
}

.betterx-about-contributors-title {
  text-align: center;
  color: var(--betterx-textColor);
  font-size: 16px;
  margin-bottom: 16px;
  font-weight: 600;
}

.betterx-about-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.betterx-contributor-name {
  font-weight: 600;
  color: var(--betterx-textColor);
}

/* === Animations === */
@keyframes betterxFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes betterxSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}`;
