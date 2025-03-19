import { EditorView, basicSetup } from "codemirror";
import { css } from "@codemirror/lang-css";
import { oneDark } from '@codemirror/theme-one-dark';
import { getCurrentThemeMode } from '../utils/theme-detector.js';

export function createThemeEditor(theme, uiManager) {
  // Get current Twitter theme
  const themeMode = getCurrentThemeMode();
  const isLightTheme = themeMode === 0;
  
  const editorElement = uiManager.createUIElement('div', {
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
  
  const editorTitle = editorElement.querySelector('.betterx-editor-title h3');
  if (editorTitle) {
    editorTitle.style.color = `var(--betterx-textColor)`;
  }

  // Style the toolbar to match the theme
  const editorToolbar = editorElement.querySelector('.betterx-editor-toolbar');
  if (editorToolbar) {
    editorToolbar.style.backgroundColor = isLightTheme ? '#e6e7e7' : '#22303c';
    editorToolbar.style.borderBottomColor = `var(--betterx-borderColor)`;
  }
  
  const editorInfo = editorElement.querySelector('.betterx-editor-info');
  if (editorInfo) {
    editorInfo.style.color = `var(--betterx-textColorSecondary)`;
  }

  return {
    element: editorElement,
    initialize: function() {
      const nameInput = editorElement.querySelector('input');
      const editorContainer = editorElement.querySelector('.betterx-codemirror-wrapper');
      
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
              backgroundColor: isLightTheme ? "#ffffff" : undefined,
              color: isLightTheme ? "#0f1419" : undefined
            },
            ".cm-content": {
              fontFamily: "monospace"
            },
            ".cm-line": {
              padding: "0 3px",
              lineHeight: "1.6"
            },
            ".cm-gutters": {
              backgroundColor: isLightTheme ? "#f7f9f9" : undefined,
              color: isLightTheme ? "#536471" : undefined,
              borderRight: isLightTheme ? "1px solid #eff3f4" : undefined
            },
            ".cm-activeLineGutter": {
              backgroundColor: isLightTheme ? "#e6e7e7" : undefined
            },
            ".cm-activeLine": {
              backgroundColor: isLightTheme ? "rgba(15, 20, 25, 0.05)" : undefined
            }
          })
        ],
        parent: editorContainer
      });

      // Save button handler
      editorElement.querySelector('.save').addEventListener('click', async () => {
        const css = view.state.doc.toString();
        if (theme) {
          await uiManager.themeManager.updateTheme(theme.id, nameInput.value, css);
        } else {
          await uiManager.themeManager.createTheme(nameInput.value, css);
        }
        // Update theme list after saving
        const themesContainer = document.querySelector('.betterx-themes-container');
        if (themesContainer) {
          uiManager.refreshThemesList(themesContainer);
        }
        view.destroy();
        editorElement.parentElement.remove();
      });

      // Cancel button handler
      editorElement.querySelector('.cancel').addEventListener('click', () => {
        view.destroy();
        editorElement.parentElement.remove();
      });

      // Format button handler
      editorElement.querySelector('.format').addEventListener('click', () => {
        try {
          const cssContent = view.state.doc.toString();
          const formatted = formatCSS(cssContent);
          view.dispatch({
            changes: {from: 0, to: view.state.doc.length, insert: formatted}
          });
        } catch (e) {
          console.error('Failed to format CSS:', e);
        }
      });

      // Clear button handler
      editorElement.querySelector('.clear').addEventListener('click', () => {
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

export function formatCSS(css) {
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
