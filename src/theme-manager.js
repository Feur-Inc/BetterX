export class ThemeManager {
  constructor() {
    this.themes = [];
    this.themeOrder = [];
    this.activeThemes = new Set();
    this.styleElement = null;
    this.customPropertiesElement = null;
    this.loadThemeState();
    this.initializeThemes();
    this.initializeDefaultStyles();
  }

  // Charger l'état des thèmes depuis le localStorage
  loadThemeState() {
    try {
      const state = JSON.parse(localStorage.getItem('betterXThemeState') || '{}');
      this.themeOrder = state.order || [];
      this.activeThemes = new Set(state.active || []);
    } catch (error) {
      console.error('Error loading theme state:', error);
      this.themeOrder = [];
      this.activeThemes = new Set();
    }
  }

  // Sauvegarder l'état des thèmes dans le localStorage
  saveThemeState() {
    const state = {
      order: this.themeOrder,
      active: Array.from(this.activeThemes)
    };
    localStorage.setItem('betterXThemeState', JSON.stringify(state));
  }

  async initializeThemes() {
    try {
      const themeFiles = await window.api.themes.list();

      // Filtrer activeThemes et themeOrder : retirer les thèmes qui n'existent plus
      const validThemes = new Set(themeFiles);
      this.activeThemes.forEach(id => {
        if (!validThemes.has(id)) {
          this.activeThemes.delete(id);
        }
      });
      this.themeOrder = this.themeOrder.filter(id => validThemes.has(id));
      this.saveThemeState();

      this.themes = await Promise.all(themeFiles.map(async filename => {
        const content = await window.api.themes.read(filename);
        return {
          id: filename,
          name: filename.replace('.css', ''),
          css: content,
          enabled: this.activeThemes.has(filename)
        };
      }));

      // Appliquer l'ordre sauvegardé
      this.themes.sort((a, b) => {
        const indexA = this.themeOrder.indexOf(a.id);
        const indexB = this.themeOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      // Appliquer les thèmes actifs
      this.themes.filter(t => t.enabled).forEach(theme => this.applyTheme(theme));
    } catch (error) {
      console.error('Error initializing themes:', error);
    }
  }

  async createTheme(name, css) {
    const filename = `${name}.css`;
    try {
      await window.api.themes.write(filename, css);
      const theme = {
        id: filename,
        name,
        css,
        enabled: false
      };
      this.themes.push(theme);
      this.themeOrder.push(filename);
      this.saveThemeState();
      return theme;
    } catch (error) {
      console.error('Error creating theme:', error);
      throw error;
    }
  }

  async updateTheme(id, name, css) {
    const theme = this.themes.find(t => t.id === id);
    if (theme) {
      const newFilename = `${name}.css`;
      try {
        if (id !== newFilename) {
          await window.api.themes.delete(id);
          // Mettre à jour l'ordre
          const index = this.themeOrder.indexOf(id);
          if (index !== -1) {
            this.themeOrder[index] = newFilename;
          }
          // Mettre à jour les thèmes actifs
          if (this.activeThemes.has(id)) {
            this.activeThemes.delete(id);
            this.activeThemes.add(newFilename);
          }
        }
        await window.api.themes.write(newFilename, css);
        theme.id = newFilename;
        theme.name = name;
        theme.css = css;
        this.saveThemeState();
        if (theme.enabled) {
          this.applyTheme(theme);
        }
      } catch (error) {
        console.error('Error updating theme:', error);
        throw error;
      }
    }
  }

  async deleteTheme(id) {
    const index = this.themes.findIndex(t => t.id === id);
    if (index !== -1) {
      try {
        await window.api.themes.delete(id);
        this.themes.splice(index, 1);
        // Mettre à jour l'ordre
        const orderIndex = this.themeOrder.indexOf(id);
        if (orderIndex !== -1) {
          this.themeOrder.splice(orderIndex, 1);
        }
        // Supprimer des thèmes actifs
        this.activeThemes.delete(id);
        this.saveThemeState();
      } catch (error) {
        console.error('Error deleting theme:', error);
        throw error;
      }
    }
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
      try {
          const bodyBgColor = await this.waitForBackgroundColor();
          const defaultStyle = document.createElement('style');
          defaultStyle.id = 'betterx-default-style';
          defaultStyle.textContent = `
              /* Smooth modal transitions */
              [role="dialog"] > div {
                  transition: width 0.3s ease, height 0.3s ease !important;
              }
              
              [role="dialog"] > div > div {
                  transition: width 0.3s ease, height 0.3s ease !important;
              }
          `;
          document.head.appendChild(defaultStyle);
          
          // Ne modifie le background que si des thèmes existent
          if (this.themes && this.themes.length > 0 && document.body.style.backgroundColor) {
              document.body.style.removeProperty('background-color');
          }
      } catch (error) {
          console.error('Error initializing default styles:', error);
          // En cas d'erreur, aucune modification n'est appliquée à l'interface
      }
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

  extractCustomProperties(css) {
      const properties = {};
      const regex = /--[\w-]+:\s*[^;]+/g;
      const matches = css.match(regex) || [];
      
      matches.forEach(match => {
          const [name, value] = match.split(/:\s*/);
          properties[name] = value;
      });
      
      return properties;
  }

  applyCustomProperties(properties) {
      if (!this.customPropertiesElement) {
          this.customPropertiesElement = document.createElement('style');
          this.customPropertiesElement.id = 'betterx-custom-properties';
          document.head.appendChild(this.customPropertiesElement);
      }

      const cssText = Object.entries(properties)
          .map(([name, value]) => `${name}: ${value};`)
          .join('\n');

      this.customPropertiesElement.textContent = `:root {\n${cssText}\n}`;
  }

  processCSS(css) {
      // Split CSS into rules while preserving @keyframes
      const parts = css.split(/(@keyframes[^{]+{[^}]*})/g);
      
      return parts.map(part => {
          // Preserve @keyframes blocks entirely
          if (part.trim().startsWith('@keyframes')) {
              return part;
          }
          
          // Process regular CSS rules
          const rules = part.split('}');
          return rules.map(rule => {
              if (!rule.trim()) return '';
              
              // Don't modify pseudo-elements or keyframe percentages
              if (rule.includes('::') || /^\s*\d+%/.test(rule)) {
                  return rule + '}';
              }

              // For other rules, add !important but preserve animation properties
              return rule.replace(/(?<!var\():\s*([^;]+)(?=;)/g, (match, p1) => {
                  // Don't add !important to animation-related properties
                  if (p1.includes('animation') || p1.includes('@keyframes')) {
                      return `: ${p1}`;
                  }
                  return p1.includes('!important')
                      ? `: ${p1}`
                      : `: ${p1.trim()} !important`;
              }) + '}';
          }).join('\n');
      }).join('\n');
  }

  async applyTheme(theme) {
      if (!this.styleElement) {
          this.styleElement = document.createElement('style');
          this.styleElement.id = 'betterx-custom-theme';
          document.head.appendChild(this.styleElement);
      }

      theme.enabled = true;
      // Remplacer saveThemes par saveThemeState
      this.saveThemeState();

      const enabledThemes = this.themes.filter(t => t.enabled);
      
      // Extract and combine custom properties from all enabled themes
      const allCustomProperties = {};
      enabledThemes.forEach(theme => {
          Object.assign(allCustomProperties, this.extractCustomProperties(theme.css));
      });
      this.applyCustomProperties(allCustomProperties);

      // Apply regular CSS
      let combinedCSS = enabledThemes.slice().reverse().map(t => t.css).join('\n\n');
      combinedCSS = this.processCSS(combinedCSS);
      this.styleElement.textContent = combinedCSS;
  }

  toggleTheme(themeId, enabled) {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      if (enabled) {
        this.activeThemes.add(themeId);
        this.applyTheme(theme);
      } else {
        this.activeThemes.delete(themeId);
        this.disableTheme(themeId);
      }
      this.saveThemeState();
    }
  }

  disableTheme(themeId) {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      theme.enabled = false;
      // Remplacer saveThemes par saveThemeState
      this.saveThemeState();
      
      const enabledThemes = this.themes.filter(t => t.enabled);
      if (enabledThemes.length > 0) {
        let combinedCSS = enabledThemes.slice().reverse().map(t => t.css).join('\n\n');
        combinedCSS = this.processCSS(combinedCSS);
        this.styleElement.textContent = combinedCSS;
      } else {
        this.styleElement.textContent = '';
        if (this.customPropertiesElement) {
            this.customPropertiesElement.textContent = '';
        }
      }
    }
  }

  reorderThemes(newOrder) {
    this.themeOrder = newOrder;
    this.saveThemeState();
    
    // Réorganiser les thèmes selon le nouvel ordre
    this.themes.sort((a, b) => {
      const indexA = this.themeOrder.indexOf(a.id);
      const indexB = this.themeOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Réappliquer les thèmes actifs dans le bon ordre
    this.applyAllActiveThemes();
  }

  applyAllActiveThemes() {
    const enabledThemes = this.themes.filter(t => this.activeThemes.has(t.id));
    if (enabledThemes.length > 0) {
      let combinedCSS = enabledThemes.slice().reverse().map(t => t.css).join('\n\n');
      combinedCSS = this.processCSS(combinedCSS);
      this.styleElement.textContent = combinedCSS;
    }
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