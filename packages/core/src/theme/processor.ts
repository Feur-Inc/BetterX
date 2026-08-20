// Preserve authored CSS byte-for-byte. The previous line-based rewriter
// corrupted minified declarations, data URLs, custom properties, comments,
// and nested at-rules while trying to append `!important` globally.
export function processCSS(css: string): string {
  return css;
}
