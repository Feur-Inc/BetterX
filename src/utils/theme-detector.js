/**
 * Twitter theme modes:
 * night_mode=0: Light mode
 * night_mode=1: Dim mode (default dark blue)
 * night_mode=2: Lights out mode (black)
 */

import { getAccentColor, watchAccentColorChanges } from './accent-color.js';

export function getCurrentThemeMode() {
  // Get the night_mode cookie value
  const cookies = document.cookie.split(';');
  let nightMode = '1'; // Default to dim mode if cookie not found
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'night_mode') {
      nightMode = value;
      break;
    }
  }
  
  // Parse the value as an integer, or default to 1 if it's not a valid number
  const mode = parseInt(nightMode, 10);
  return isNaN(mode) ? 1 : mode;
}

export function watchThemeChanges(callback) {
  let currentTheme = getCurrentThemeMode();
  let currentAccentColor = null;
  
  // Call callback immediately with initial theme
  const initializeTheme = async () => {
    const accentColor = await getAccentColor();
    currentAccentColor = accentColor;
    callback(currentTheme, accentColor);
  };
  
  initializeTheme();
  
  // Check for theme changes periodically
  const intervalId = setInterval(() => {
    const newTheme = getCurrentThemeMode();
    if (newTheme !== currentTheme) {
      console.log(`BetterX: Twitter theme changed from ${currentTheme} to ${newTheme}`);
      currentTheme = newTheme;
      callback(currentTheme, currentAccentColor);
    }
  }, 1000); // Check every second
  
  // Watch for accent color changes
  const accentColorWatcher = watchAccentColorChanges((accentColor) => {
    currentAccentColor = accentColor;
    callback(currentTheme, accentColor);
  });
  
  // Also watch for cookie changes and page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const newTheme = getCurrentThemeMode();
      if (newTheme !== currentTheme) {
        console.log(`BetterX: Twitter theme changed to ${newTheme} after visibility change`);
        currentTheme = newTheme;
        callback(currentTheme, currentAccentColor);
      }
    }
  });
  
  return () => {
    clearInterval(intervalId);
    accentColorWatcher(); // Clean up accent color watcher
  };
}

export const THEME_COLORS = {
  // Light theme (night_mode=0)
  light: {
    bg: 'rgba(0, 0, 0, 0.4)',  // Still need some transparency for modal backdrop
    modalBg: '#ffffff',
    contentBg: '#f7f9f9',
    borderColor: '#eff3f4',
    textColor: '#0f1419',
    textColorSecondary: '#536471',
    accentColor: '#1d9bf0',
    accentHoverColor: '#1a8cd8',
    hoverBg: 'rgba(15, 20, 25, 0.1)',
    switchBg: '#cfd9de',
    pluginDetailsBg: '#f7f9f9',
    tabsBg: '#ffffff',
    searchBarBg: '#eff3f4',
    searchBarBorderColor: '#cfd9de',
    searchBarPlaceholderColor: '#536471',
    searchBarHoverBg: '#e6e7e7',
    closeButtonHoverBg: 'rgba(15, 20, 25, 0.1)',
    notificationBg: '#ffffff',
    notificationBorder: '#cfd9de',
    emojiPreviewBg: '#ffffff',
    emojiPreviewBorder: '#cfd9de',
    themeItemBg: '#f7f9f9',
    editorMainBg: '#f7f9f9'
  },
  
  // Dim theme (night_mode=1) - Original BetterX theme
  dim: {
    bg: 'rgba(91, 112, 131, 0.4)',
    modalBg: '#15202b',
    contentBg: '#192734',
    borderColor: '#38444d',
    textColor: '#ffffff',
    textColorSecondary: '#8899a6',
    accentColor: '#1da1f2',
    accentHoverColor: '#1a91da',
    hoverBg: 'rgba(239, 243, 244, 0.1)',
    switchBg: '#38444d',
    pluginDetailsBg: '#192734',
    tabsBg: '#15202b',
    searchBarBg: '#273340',
    searchBarBorderColor: '#38444d',
    searchBarPlaceholderColor: '#8899a6',
    searchBarHoverBg: '#1c2732',
    closeButtonHoverBg: 'rgba(239, 243, 244, 0.1)',
    notificationBg: '#15202b',
    notificationBorder: '#38444d',
    emojiPreviewBg: '#15202b',
    emojiPreviewBorder: '#38444d',
    themeItemBg: '#192734',
    editorMainBg: '#192734'
  },
  
  // Lights out theme (night_mode=2)
  dark: {
    bg: 'rgba(91, 112, 131, 0.4)',
    modalBg: '#000000',
    contentBg: '#16181c',
    borderColor: '#2f3336',
    textColor: '#e7e9ea',
    textColorSecondary: '#71767b',
    accentColor: '#1d9bf0',
    accentHoverColor: '#1a8cd8',
    hoverBg: 'rgba(231, 233, 234, 0.1)',
    switchBg: '#3e4144',
    pluginDetailsBg: '#16181c',
    tabsBg: '#000000',
    searchBarBg: '#202327',
    searchBarBorderColor: '#2f3336',
    searchBarPlaceholderColor: '#71767b',
    searchBarHoverBg: '#181818',
    closeButtonHoverBg: 'rgba(231, 233, 234, 0.1)',
    notificationBg: '#000000',
    notificationBorder: '#2f3336',
    emojiPreviewBg: '#000000',
    emojiPreviewBorder: '#2f3336',
    themeItemBg: '#16181c',
    editorMainBg: '#16181c'
  }
};

export function applyThemeColors(themeMode, accentColor) {
  let colors;
  let themeName;
  
  // Explicitly check for each theme mode to ensure correct application
  if (themeMode === 0) {
    colors = THEME_COLORS.light;
    themeName = 'light';
  } else if (themeMode === 2) {
    colors = THEME_COLORS.dark;
    themeName = 'dark';
  } else {
    colors = THEME_COLORS.dim;
    themeName = 'dim';
  }
  
  console.log(`BetterX: Applying ${themeName} theme (mode: ${themeMode}) with accent color: ${accentColor?.color || 'default'}`);
  
  // Apply colors to CSS variables
  const root = document.documentElement;
  
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--betterx-${key}`, value);
  });
  
  // Apply accent color if provided
  if (accentColor) {
    root.style.setProperty('--betterx-accentColor', accentColor.primary);
    root.style.setProperty('--betterx-accentHoverColor', accentColor.hover);
  }
  
  // Also update body attribute for potential CSS selectors
  document.body.setAttribute('data-betterx-theme', themeName);
}
