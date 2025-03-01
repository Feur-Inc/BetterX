import { EditorView, basicSetup } from "codemirror";
import { css } from "@codemirror/lang-css";
import { oneDark } from '@codemirror/theme-one-dark';

export function createThemeEditor(theme, uiManager) {
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

  return {
    element: editorElement,
    initialize: function() {
      const nameInput = editorElement.querySelector('input');
      const editorContainer = editorElement.querySelector('.betterx-codemirror-wrapper');
      
      // Initialize CodeMirror
      const view = new EditorView({
        doc: theme?.css || '',
        extensions: [
          basicSetup,
          css(),
          oneDark,
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "14px"
            },
            ".cm-content": {
              fontFamily: "monospace"
            },
            ".cm-line": {
              padding: "0 3px",
              lineHeight: "1.6"
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
        // Mise à jour de la liste des thèmes après enregistrement
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
