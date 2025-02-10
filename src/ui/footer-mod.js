export function injectFooterLink() {
  const footer = document.querySelector('nav[aria-label="Footer"]');
  if (!footer || footer.querySelector('.betterx-footer-link')) return;

  // Web settings link
  const webSettingsLink = document.createElement('a');
  webSettingsLink.className = 'css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-n6v787 r-1cwl3u0 r-16dba41 r-1xuzw63 r-faml9v r-1loqt21 betterx-footer-link';
  webSettingsLink.style.color = 'rgb(113, 118, 123)';
  webSettingsLink.href = '#';
  webSettingsLink.setAttribute('role', 'link');

  const webSpan = document.createElement('span');
  webSpan.className = 'css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3';
  webSpan.textContent = 'BetterX';

  webSettingsLink.appendChild(webSpan);

  // Desktop settings link
  const desktopSettingsLink = document.createElement('a');
  desktopSettingsLink.className = 'css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-n6v787 r-1cwl3u0 r-16dba41 r-1xuzw63 r-faml9v r-1loqt21 betterx-footer-link';
  desktopSettingsLink.style.color = 'rgb(113, 118, 123)';
  desktopSettingsLink.href = '#';
  desktopSettingsLink.setAttribute('role', 'link');

  const desktopSpan = document.createElement('span');
  desktopSpan.className = 'css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3';
  desktopSpan.textContent = 'BetterX Desktop';

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
  webSettingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    const settingsModal = document.querySelector('#betterx-settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'block';
    }
  });

  desktopSettingsLink.addEventListener('click', async (e) => {
    e.preventDefault();
    await window.api.openSettings();
  });
}
