import { css } from "@codemirror/lang-css";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";

Object.assign(globalThis, {
  __betterxEditorModules: { EditorView, basicSetup, css, oneDark },
});
