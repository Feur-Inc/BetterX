export class ThemeManager {
    constructor() {
      this.themes = [];
      this.activeTheme = null;
      this.styleElement = null;
      this.loadThemes();
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
    applyTheme(theme) {
      if (!this.styleElement) {
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'betterx-custom-theme';
        document.head.appendChild(this.styleElement);
      }
      this.styleElement.textContent = theme.css;
      this.activeTheme = theme;
      this.saveThemes();
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
		// Convert underscore keys to camelCase for style assignments
		document.body.style[camelCase(key)] = theme[key];
	}
}