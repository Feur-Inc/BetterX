import { EditorView, basicSetup } from "codemirror";
import { css } from "@codemirror/lang-css";
import { oneDark } from '@codemirror/theme-one-dark';
import { getCurrentThemeMode } from '../utils/theme-detector';

interface Theme {
  id: string;
  name: string;
  css: string;
}

interface UIManager {
  createUIElement: (tag: string, options: { className?: string, innerHTML?: string }) => HTMLElement;
  themeManager: {
    updateTheme: (id: string, name: string, css: string) => Promise<void>;
    createTheme: (name: string, css: string) => Promise<void>;
  };
  refreshThemesList: (container: HTMLElement) => void;
}

interface ThemeEditor {
  element: HTMLElement;
  initialize: () => EditorView;
}

export function createThemeEditor(theme: Theme | null, uiManager: UIManager): ThemeEditor {
  // Get current Twitter theme
  const themeMode: number = getCurrentThemeMode();
  const isLightTheme: boolean = themeMode === 0;
  
  const editorElement: HTMLElement = uiManager.createUIElement('div', {
    className: 'betterx-theme-editor',
    innerHTML: `
      <div class="betterx-editor-header">
        <div class="betterx-editor-title">
          <h3>${theme ? 'Edit Theme' : 'Create New Theme'}</h3>
          <input type="text" class="betterx-input" placeholder="Theme name" value="${theme?.name || ''}" maxlength="50">
        </div>
        <div class="betterx-editor-controls">
          <button class="betterx-button secondary cancel">Cancel</button>
          <button class="betterx-button primary save">Save Theme</button>
        </div>
      </div>
      <div class="betterx-editor-main">
        <div class="betterx-editor-toolbar">
          <span class="betterx-editor-info">CSS Editor</span>
          <div class="betterx-editor-actions">
            <button class="betterx-button mini format">Format</button>
            <button class="betterx-button mini clear">Clear</button>
          </div>
        </div>
        <div class="betterx-codemirror-wrapper"></div>
      </div>
    `
  });

  // Apply theme-specific styles directly to the editor modal
  editorElement.style.backgroundColor = `var(--betterx-modalBg)`;
  editorElement.style.borderColor = `var(--betterx-borderColor)`;
  
  const editorTitle: HTMLElement | null = editorElement.querySelector('.betterx-editor-title h3');
  if (editorTitle) {
    editorTitle.style.color = `var(--betterx-textColor)`;
  }

  // Style the toolbar to match the theme
  const editorToolbar: HTMLElement | null = editorElement.querySelector('.betterx-editor-toolbar');
  if (editorToolbar) {
    editorToolbar.style.backgroundColor = isLightTheme ? '#e6e7e7' : '#22303c';
    editorToolbar.style.borderBottomColor = `var(--betterx-borderColor)`;
  }
  
  const editorInfo: HTMLElement | null = editorElement.querySelector('.betterx-editor-info');
  if (editorInfo) {
    editorInfo.style.color = `var(--betterx-textColorSecondary)`;
  }

  return {
    element: editorElement,
    initialize: function(): EditorView {
      const nameInput = editorElement.querySelector('input') as HTMLInputElement;
      const editorContainer = editorElement.querySelector('.betterx-codemirror-wrapper') as HTMLElement;
      
      // Initialize CodeMirror with theme-appropriate settings
      const editorTheme = isLightTheme ? [] : [oneDark];
      
      const view = new EditorView({
        doc: theme?.css || '',
        extensions: [
          basicSetup,
          css(),
          ...editorTheme,
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "14px",
              backgroundColor: isLightTheme ? "#ffffff" : null,
              color: isLightTheme ? "#0f1419" : null
            },
            ".cm-content": {
              fontFamily: "monospace"
            },
            ".cm-line": {
              padding: "0 3px",
              lineHeight: "1.6"
            },
            ".cm-gutters": {
              backgroundColor: isLightTheme ? "#f7f9f9" : null,
              color: isLightTheme ? "#536471" : null,
              borderRight: isLightTheme ? "1px solid #eff3f4" : null
            },
            ".cm-activeLineGutter": {
              backgroundColor: isLightTheme ? "#e6e7e7" : null
            },
            ".cm-activeLine": {
              backgroundColor: isLightTheme ? "rgba(15, 20, 25, 0.05)" : null
            }
          })
        ],
        parent: editorContainer
      });

      // Save button handler
      const saveButton = editorElement.querySelector('.save') as HTMLButtonElement;
      saveButton.addEventListener('click', async () => {
        const cssContent: string = view.state.doc.toString();
        if (theme) {
          await uiManager.themeManager.updateTheme(theme.id, nameInput.value, cssContent);
        } else {
          await uiManager.themeManager.createTheme(nameInput.value, cssContent);
        }
        // Update theme list after saving
        const themesContainer = document.querySelector('.betterx-themes-container');
        if (themesContainer) {
          uiManager.refreshThemesList(themesContainer as HTMLElement);
        }
        view.destroy();
        const parentElement = editorElement.parentElement;
        if (parentElement) {
          parentElement.remove();
        }
      });

      // Cancel button handler
      const cancelButton = editorElement.querySelector('.cancel') as HTMLButtonElement;
      cancelButton.addEventListener('click', () => {
        view.destroy();
        const parentElement = editorElement.parentElement;
        if (parentElement) {
          parentElement.remove();
        }
      });

      // Format button handler
      const formatButton = editorElement.querySelector('.format') as HTMLButtonElement;
      formatButton.addEventListener('click', () => {
        try {
          const cssContent: string = view.state.doc.toString();
          const formatted: string = formatCSS(cssContent);
          view.dispatch({
            changes: {from: 0, to: view.state.doc.length, insert: formatted}
          });
        } catch (e) {
          console.error('Failed to format CSS:', e);
        }
      });

      // Clear button handler
      const clearButton = editorElement.querySelector('.clear') as HTMLButtonElement;
      clearButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all CSS?')) {
          view.dispatch({
            changes: {from: 0, to: view.state.doc.length, insert: ''}
          });
        }
      });

      return view;
    }
  };
}

export function formatCSS(css: string): string {
  // Simple CSS formatter
  return css
    .replace(/\s*{\s*/g, ' {\n  ')
    .replace(/\s*}\s*/g, '\n}\n')
    .replace(/;\s*/g, ';\n  ')
    .replace(/\/\*\s*/g, '\n/* ')
    .replace(/\s*\*\//g, ' */\n')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}
