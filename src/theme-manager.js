export class ThemeManager {
    constructor() {
      this.themes = [];
      this.activeTheme = null;
      this.styleElement = null;
      this.loadThemes();
      this.initializeDefaultStyles();
    }

    async waitForBackgroundColor() {
        return new Promise(resolve => {
            const checkColor = () => {
                const bgColor = this.extractBackgroundColor(document.body);
                if (bgColor) {
                    resolve(bgColor);
                } else {
                    requestAnimationFrame(checkColor);
                }
            };
            checkColor();
        });
    }

    async initializeDefaultStyles() {
        const bodyBgColor = await this.waitForBackgroundColor();
        const defaultStyle = document.createElement('style');
        defaultStyle.id = 'betterx-default-style';
        defaultStyle.textContent = `body { background-color: ${bodyBgColor}; }`;
        document.head.appendChild(defaultStyle);
        
        // Remove inline background-color from body
        document.body.style.removeProperty('background-color');
        
        // Remove r-kemksi class from specific div if it exists
        this.removeKemksiClass();
    }

    extractBackgroundColor(element) {
        const style = window.getComputedStyle(element);
        const bgColor = element.style.backgroundColor || style.backgroundColor;
        
        // Vérifier si c'est une couleur RGB valide
        if (bgColor.startsWith('rgb')) {
            return bgColor;
        }
        return null;
    }

    removeKemksiClass() {
        const removeIfTarget = element => {
            if (element.classList.contains('r-kemksi')) {
                element.classList.remove('r-kemksi');
            }
        };

        // Retirer au chargement des éléments existants
        const initialTargets = document.querySelectorAll(
            '.css-175oi2r.r-vacyoi.r-ttdzmv .css-175oi2r.r-1awozwy.r-aqfbo4.r-kemksi.r-18u37iz.r-1h3ijdo.r-6gpygo.r-15ysp7h.r-1xcajam.r-ipm5af.r-136ojw6.r-1hycxz'
        );
        initialTargets.forEach(removeIfTarget);

        // Observer les modifications du DOM
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Si l'élément lui-même correspond
                        if (
                            node.matches &&
                            node.matches('.css-175oi2r.r-1awozwy.r-aqfbo4.r-kemksi.r-18u37iz.r-1h3ijdo.r-6gpygo.r-15ysp7h.r-1xcajam.r-ipm5af.r-136ojw6.r-1hycxz') &&
                            node.closest('.css-175oi2r.r-vacyoi.r-ttdzmv')
                        ) {
                            removeIfTarget(node);
                        }
                        // Vérifier les descendants
                        const targets = node.querySelectorAll(
                            '.css-175oi2r.r-1awozwy.r-aqfbo4.r-kemksi.r-18u37iz.r-1h3ijdo.r-6gpygo.r-15ysp7h.r-1xcajam.r-ipm5af.r-136ojw6.r-1hycxz'
                        );
                        targets.forEach(el => {
                            if (el.closest('.css-175oi2r.r-vacyoi.r-ttdzmv')) {
                                removeIfTarget(el);
                            }
                        });
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    loadThemes() {
      const savedThemes = JSON.parse(localStorage.getItem('betterXThemes')) || [];
      this.themes = savedThemes;
      
      const activeThemeId = localStorage.getItem('betterXActiveTheme');
      if (activeThemeId) {
        const theme = this.themes.find(t => t.id === activeThemeId);
        if (theme) this.applyTheme(theme);
      }
    }
    saveThemes() {
      localStorage.setItem('betterXThemes', JSON.stringify(this.themes));
      if (this.activeTheme) {
        localStorage.setItem('betterXActiveTheme', this.activeTheme.id);
      } else {
        localStorage.removeItem('betterXActiveTheme');
      }
    }
    createTheme(name, css) {
      const theme = {
        id: Date.now().toString(),
        name,
        css,
        enabled: false
      };
      this.themes.push(theme);
      this.saveThemes();
      return theme;
    }
    updateTheme(id, name, css) {
      const theme = this.themes.find(t => t.id === id);
      if (theme) {
        theme.name = name;
        theme.css = css;
        this.saveThemes();
        if (this.activeTheme && this.activeTheme.id === id) {
          this.applyTheme(theme);
        }
      }
    }
    deleteTheme(id) {
      const index = this.themes.findIndex(t => t.id === id);
      if (index !== -1) {
        if (this.activeTheme && this.activeTheme.id === id) {
          this.disableTheme();
        }
        this.themes.splice(index, 1);
        this.saveThemes();
      }
    }
    async applyTheme(theme) {
        const bodyBgColor = await this.waitForBackgroundColor();
        
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'betterx-custom-theme';
            document.head.appendChild(this.styleElement);
        }
        
        this.styleElement.textContent = theme.css;
        this.activeTheme = theme;
        this.saveThemes();
        
        document.body.style.removeProperty('background-color');
    }
    disableTheme() {
      if (this.styleElement) {
        this.styleElement.textContent = '';
      }
      this.activeTheme = null;
      this.saveThemes();
    }
  }
  
function camelCase(str) {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function applyTheme(theme) {
    for (const key in theme) {
        if (key === 'background_color' || key === 'backgroundColor') {
            // Let CSS handle background color
            continue;
        }
        document.body.style[camelCase(key)] = theme[key];
    }
}