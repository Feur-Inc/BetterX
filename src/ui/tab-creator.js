import { getCurrentThemeMode } from '../utils/theme-detector.js';
import { getAccentColor } from '../utils/accent-color.js';
import { Logger } from '../utils/logger.js';
import { Name } from '../utils/constants.js';

// Create the BetterX tab element - Returns a DOM element directly
export function createBetterXTab() {
  const newDiv = document.createElement('div');
  newDiv.setAttribute('class', 'css-175oi2r');
  newDiv.setAttribute('data-testid', 'BetterX');

  const newLink = document.createElement('a');
  newLink.setAttribute('href', '#');
  newLink.setAttribute('role', 'tab');
  newLink.setAttribute('aria-selected', 'false');
  newLink.setAttribute('class', 'css-175oi2r r-1wtj0ep r-16x9es5 r-1mmae3n r-o7ynqc r-6416eg r-1ny4l3l r-1loqt21');
  newLink.style.paddingRight = '16px';
  newLink.style.paddingLeft = '16px';

  // Get current theme
  const themeMode = getCurrentThemeMode();
  const textColor = themeMode === 0 ? 'rgb(15, 20, 25)' : 'rgb(231, 233, 234)';
  
  // Initially use standard hover colors based on theme (will be updated with accent later)
  const hoverBgColor = themeMode === 0 
    ? 'rgba(29, 155, 240, 0.1)' 
    : (themeMode === 2 ? 'rgb(22, 24, 28)' : 'rgba(29, 155, 240, 0.1)');

  // Set up element with initial styling
  newLink.addEventListener('mouseenter', () => {
    newLink.style.backgroundColor = hoverBgColor;
    const textDiv = newLink.querySelector('.css-146c3p1');
    if (textDiv) textDiv.style.color = textColor;
  });

  newLink.addEventListener('mouseleave', () => {
    newLink.style.backgroundColor = 'transparent';
    const textDiv = newLink.querySelector('.css-146c3p1');
    if (textDiv) textDiv.style.color = textColor;
  });

  // Add transition for smooth effect
  newLink.style.transition = 'all 0.2s ease';

  const linkContainer = document.createElement('div');
  linkContainer.setAttribute('class', 'css-175oi2r r-1awozwy r-18u37iz r-16y2uox');

  const textContainer = document.createElement('div');
  textContainer.setAttribute('class', 'css-175oi2r r-16y2uox r-1wbh5a2');

  const textDiv = document.createElement('div');
  textDiv.setAttribute('dir', 'ltr');
  textDiv.setAttribute('class', 'css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41');
  textDiv.style.textOverflow = 'unset';
  textDiv.style.color = textColor;

  const textSpan = document.createElement('span');
  textSpan.setAttribute('class', 'css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3');
  textSpan.style.textOverflow = 'unset';
  textSpan.textContent = 'BetterX';

  const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgIcon.setAttribute('viewBox', '0 0 24 24');
  svgIcon.setAttribute('aria-hidden', 'true');
  svgIcon.setAttribute('class', 'r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1bwzh9t r-1q142lx r-2dysd3');

  const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svgPath.setAttribute('d', 'M14.586 12L7.543 4.96l1.414-1.42L17.414 12l-8.457 8.46-1.414-1.42L14.586 12z');

  svgIcon.appendChild(svgPath);
  textDiv.appendChild(textSpan);
  textContainer.appendChild(textDiv);
  linkContainer.appendChild(textContainer);
  linkContainer.appendChild(svgIcon);
  newLink.appendChild(linkContainer);
  newDiv.appendChild(newLink);

  // Apply accent color asynchronously after the element is already created
  setTimeout(() => {
    getAccentColor().then(accentColor => {
      const updatedHoverBgColor = themeMode === 0 
        ? `rgba(${hexToRgb(accentColor.primary)}, 0.1)` 
        : (themeMode === 2 ? 'rgb(22, 24, 28)' : `rgba(${hexToRgb(accentColor.primary)}, 0.1)`);
      
      // Update the event listener with the accent color
      newLink.addEventListener('mouseenter', () => {
        newLink.style.backgroundColor = updatedHoverBgColor;
        const textDiv = newLink.querySelector('.css-146c3p1');
        if (textDiv) textDiv.style.color = textColor;
      });
    }).catch(err => {
      Logger.error("Error applying accent color to " + Name + "tab:", err);
    });
  }, 0);

  return newDiv;
}

// Helper function to convert hex to RGB for rgba values
function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '29, 155, 240'; // Default Twitter blue
}

export function addBetterXTab(uiManager) {
  const activeRouteContainer = document.querySelector('div[class="css-175oi2r"][role="tablist"]');

  if (activeRouteContainer && !document.querySelector('[data-testid="BetterX"]')) {
    try {
      // We need to ensure we're getting a DOM element back
      const betterXTab = createBetterXTab(); // Use the function directly
      
      if (betterXTab instanceof Element) {
        // Add click event to the BetterX tab to open the modal
        const link = betterXTab.querySelector('a');
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            if (uiManager && uiManager.settingsModal) {
              uiManager.settingsModal.style.display = 'block';
            }
          });
        }
        
        // Now append the tab
        activeRouteContainer.appendChild(betterXTab);
      } else {
        Logger.error(Name + ' tab creation failed: not an Element', typeof betterXTab);
      }
    } catch (error) {
      Logger.error("Error adding " + Name + " tab:", error);
    }
  }
}