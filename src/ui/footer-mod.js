export function injectFooterLink() {
  const footer = document.querySelector('nav[aria-label="Footer"]');
  if (!footer || footer.querySelector('.betterx-footer-link')) return;

  const betterXLink = document.createElement('a');
  betterXLink.className = 'css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-n6v787 r-1cwl3u0 r-16dba41 r-1xuzw63 r-faml9v r-1loqt21 betterx-footer-link';
  betterXLink.style.color = 'rgb(113, 118, 123)';
  betterXLink.href = '#';
  betterXLink.setAttribute('role', 'link');

  const span = document.createElement('span');
  span.className = 'css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3';
  span.textContent = 'BetterX';

  betterXLink.appendChild(span);

  // Insert before the "More" button
  const moreButton = footer.querySelector('button[aria-label="More"]');
  if (moreButton) {
    footer.insertBefore(betterXLink, moreButton);
  } else {
    footer.appendChild(betterXLink);
  }

  // Add click handler to open BetterX settings
  betterXLink.addEventListener('click', (e) => {
    e.preventDefault();
    const settingsModal = document.querySelector('#betterx-settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'block';
    }
  });
}
