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
    this.setupThemeFileWatcher();
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
    this.saveThemeState();
    this.activeThemes.add(theme.id);

    const enabledThemes = this.themes.filter(t => t.enabled);
    
    // Apply custom properties first
    const allCustomProperties = {};
    enabledThemes.forEach(theme => {
      Object.assign(allCustomProperties, this.extractCustomProperties(theme.css));
    });
    this.applyCustomProperties(allCustomProperties);

    // Split CSS into sections (preserving selectors with their rules)
    const combinedCSS = enabledThemes.slice().reverse().map(t => t.css).join('\n\n');
    const sections = this.splitCSSIntoSections(combinedCSS);
    
    // Process sections in chunks
    const chunkSize = 20; // Process 20 rules at a time
    for (let i = 0; i < sections.length; i += chunkSize) {
      const chunk = sections.slice(i, i + chunkSize);
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          const processedChunk = chunk.map(section => this.processSection(section)).join('\n');
          if (i === 0) {
            this.styleElement.textContent = processedChunk;
          } else {
            this.styleElement.textContent += '\n' + processedChunk;
          }
          resolve();
        });
      });
    }
  }

  splitCSSIntoSections(css) {
    // Remove comments first
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    
    const sections = [];
    let currentSection = '';
    let braceCount = 0;
    let inMediaQuery = false;
    
    // Split into characters and process
    const chars = css.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      currentSection += char;
      
      if (char === '{') {
        braceCount++;
        if (currentSection.includes('@media')) {
          inMediaQuery = true;
        }
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && !inMediaQuery) {
          sections.push(currentSection.trim());
          currentSection = '';
        } else if (braceCount === 0 && inMediaQuery) {
          inMediaQuery = false;
          sections.push(currentSection.trim());
          currentSection = '';
        }
      }
    }
    
    return sections.filter(section => section.length > 0);
  }

  processSection(section) {
    // Don't modify @-rules
    if (section.trim().startsWith('@')) {
      return section;
    }

    // Process regular CSS rules
    return section.replace(/([^{}]+){([^{}]+)}/g, (match, selector, rules) => {
      const processedRules = rules.split(';')
        .map(rule => rule.trim())
        .filter(rule => rule.length > 0)
        .map(rule => {
          const [prop, ...values] = rule.split(':');
          const value = values.join(':').trim();
          if (!value) return '';
          
          // Skip adding !important to certain properties
          if (prop.includes('animation') || prop.includes('transition')) {
            return `${prop}: ${value}`;
          }
          
          return `${prop}: ${value}${value.includes('!important') ? '' : ' !important'}`;
        })
        .filter(rule => rule.length > 0)
        .join(';\n  ');

      return `${selector.trim()} {\n  ${processedRules}\n}`;
    });
  }

  async applyProcessedCSSInChunks(css, chunkSize = 1000) {
    // Split CSS into manageable chunks while preserving rules
    const rules = css.match(/{[^}]*}/g) || [];
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;

    for (const rule of rules) {
      currentSize += rule.length;
      currentChunk.push(rule);
      
      if (currentSize >= chunkSize) {
        chunks.push(currentChunk.join(''));
        currentChunk = [];
        currentSize = 0;
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(''));
    }

    // Process and apply chunks with delays
    for (let i = 0; i < chunks.length; i++) {
      const processedChunk = this.processCSS(chunks[i]);
      
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          if (i === 0) {
            this.styleElement.textContent = processedChunk;
          } else {
            this.styleElement.textContent += processedChunk;
          }
          setTimeout(resolve, 0); // Give UI thread a chance to breathe
        });
      });

      // Every few chunks, let's refresh the UI
      if (i % 5 === 0) {
        await this.refreshUIWithDebounce();
      }
    }

    // Final UI refresh
    await this.refreshUIWithDebounce();
  }

  // Debounced version of refreshUIElements
  refreshUIWithDebounce() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    return new Promise(resolve => {
      this.refreshTimeout = setTimeout(async () => {
        const elements = document.querySelectorAll(
          '[role="button"], [role="tab"], [role="dialog"], .css-175oi2r'
        );

        // Process elements in chunks
        const chunkSize = 10;
        for (let i = 0; i < elements.length; i += chunkSize) {
          const chunk = Array.from(elements).slice(i, i + chunkSize);
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              chunk.forEach(element => {
                if (element.style.display !== 'none') {
                  const originalDisplay = window.getComputedStyle(element).display;
                  element.style.display = 'none';
                  element.offsetHeight; // Force reflow
                  element.style.display = originalDisplay;
                }
              });
              resolve();
            });
          });
        }

        resolve();
      }, 100); // Debounce for 100ms
    });
  }

  async disableTheme(themeId) {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      theme.enabled = false;
      this.activeThemes.delete(themeId);
      this.saveThemeState();

      // Use activeThemes instead of theme.enabled to determine which themes are active
      const enabledThemes = this.themes.filter(t => this.activeThemes.has(t.id));
      if (enabledThemes.length > 0) {
        const combinedCSS = enabledThemes.slice().reverse().map(t => t.css).join('\n\n');
        const sections = this.splitCSSIntoSections(combinedCSS);
        const processedCSS = sections.map(section => this.processSection(section)).join('\n');
        this.styleElement.textContent = processedCSS;
      } else {
        this.styleElement.textContent = '';
        if (this.customPropertiesElement) {
          this.customPropertiesElement.textContent = '';
        }
      }
    }
  }

  toggleTheme(themeId, enabled) {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      // Ensure theme.enabled and activeThemes stay in sync
      theme.enabled = enabled;
      
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

  reorderThemes(newOrder) {
    this.themeOrder = newOrder;
    this.saveThemeState();
    
    this.themes.sort((a, b) => {
      const indexA = this.themeOrder.indexOf(a.id);
      const indexB = this.themeOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Use activeThemes consistently here too
    const enabledThemes = this.themes.filter(t => this.activeThemes.has(t.id));
    if (enabledThemes.length > 0) {
      const combinedCSS = enabledThemes.slice().reverse().map(t => t.css).join('\n\n');
      const sections = this.splitCSSIntoSections(combinedCSS);
      const processedCSS = sections.map(section => this.processSection(section)).join('\n');
      this.styleElement.textContent = processedCSS;
    }
  }

  applyAllActiveThemes() {
    // Use activeThemes consistently here too
    const enabledThemes = this.themes.filter(t => this.activeThemes.has(t.id));
    if (enabledThemes.length > 0) {
      let combinedCSS = enabledThemes.slice().reverse().map(t => t.css).join('\n\n');
      combinedCSS = this.processCSS(combinedCSS);
      this.styleElement.textContent = combinedCSS;
    }
  }

  setupThemeFileWatcher() {
    window.api.themes.onThemeFileChanged((filename, content) => {
      const theme = this.themes.find(t => t.id === filename);
      if (theme) {
        theme.css = content;
        // If the theme is enabled, reapply it
        if (theme.enabled) {
          this.applyAllActiveThemes();
        }
      }
    });
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