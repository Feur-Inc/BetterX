// Change the import to use .ts extension or no extension
import { Devs, Name } from '../utils/constants';
import { getCurrentThemeMode } from '../utils/theme-detector';

export function injectFooterLink(): void {
  const footer = document.querySelector('nav[aria-label="Footer"]');
  if (!footer || footer.querySelector('.betterx-footer-link')) return;

  // Get theme-appropriate colors
  const themeMode = getCurrentThemeMode();
  const textColor = themeMode === 0 ? 'rgb(83, 100, 113)' : 'rgb(113, 118, 123)';
  
  // Web settings link
  const webSettingsLink = document.createElement('a');
  webSettingsLink.className = 'css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-n6v787 r-1cwl3u0 r-16dba41 r-1xuzw63 r-faml9v r-1loqt21 betterx-footer-link';
  webSettingsLink.style.color = textColor;
  webSettingsLink.style.textDecoration = 'none';
  webSettingsLink.addEventListener('mouseenter', () => {
    webSettingsLink.style.textDecorationLine = 'underline';
  });
  webSettingsLink.addEventListener('mouseleave', () => {
    webSettingsLink.style.textDecorationLine = 'none';
  });
  webSettingsLink.href = '#';
  webSettingsLink.setAttribute('role', 'link');
  webSettingsLink.setAttribute('data-betterx-footer', 'true');

  const webSpan = document.createElement('span');
  webSpan.className = 'css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3';
  webSpan.textContent = `${Name}`;

  webSettingsLink.appendChild(webSpan);

  // Desktop settings link
  const desktopSettingsLink = document.createElement('a');
  desktopSettingsLink.className = 'css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-n6v787 r-1cwl3u0 r-16dba41 r-1xuzw63 r-faml9v r-1loqt21 betterx-footer-link';
  desktopSettingsLink.style.color = textColor;
  desktopSettingsLink.style.textDecoration = 'none';
  desktopSettingsLink.addEventListener('mouseenter', () => {
    desktopSettingsLink.style.textDecorationLine = 'underline';
  });
  desktopSettingsLink.addEventListener('mouseleave', () => {
    desktopSettingsLink.style.textDecorationLine = 'none';
  });
  desktopSettingsLink.href = '#';
  desktopSettingsLink.setAttribute('role', 'link');
  desktopSettingsLink.setAttribute('data-betterx-footer', 'true');

  const desktopSpan = document.createElement('span');
  desktopSpan.className = 'css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3';
  desktopSpan.textContent = Name + ' Desktop';

  desktopSettingsLink.appendChild(desktopSpan);

  // Insert before the "More" button
  const moreButton = footer.querySelector('button[aria-label="More"]');
  if (moreButton) {
    footer.insertBefore(desktopSettingsLink, moreButton);
    footer.insertBefore(webSettingsLink, desktopSettingsLink);
  } else {
    footer.appendChild(webSettingsLink);
    footer.appendChild(desktopSettingsLink);
  }

  // Add click handlers
  webSettingsLink.addEventListener('click', (e: MouseEvent) => {
    e.preventDefault();
    const settingsModal = document.querySelector('#betterx-settings-modal');
    if (settingsModal) {
      (settingsModal as HTMLElement).style.display = 'block';
    }
  });

  desktopSettingsLink.addEventListener('click', async (e: MouseEvent) => {
    e.preventDefault();
    await (window as any).api.openSettings();
  });
}

// Function to update the color of the footer links when theme changes
export function updateFooterLinkColors(): void {
  const footerLinks = document.querySelectorAll('.betterx-footer-link');
  if (footerLinks.length === 0) return;
  
  const themeMode = getCurrentThemeMode();
  // Use the correct color for each theme mode
  let textColor: string;
  if (themeMode === 0) {
    textColor = 'rgb(83, 100, 113)'; // Light theme
  } else if (themeMode === 1) {
    textColor = 'rgb(139, 152, 165)'; // Dim theme - corrected color
  } else {
    textColor = 'rgb(113, 118, 123)'; // Dark theme
  }
  
  footerLinks.forEach(link => {
    (link as HTMLElement).style.color = textColor;
  });
}

// Add the update function to the UI manager to be called when theme changes
export function registerFooterThemeUpdater(uiManager: any): void {
  if (uiManager.themeChangeCallbacks) {
    uiManager.themeChangeCallbacks.push(updateFooterLinkColors);
  } else {
    uiManager.themeChangeCallbacks = [updateFooterLinkColors];
  }
}
