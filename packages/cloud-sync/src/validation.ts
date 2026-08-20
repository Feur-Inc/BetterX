export const THEME_ID_PATTERN = /^[a-zA-Z0-9._ -]{1,100}\.css$/;

export function validThemeId(value: unknown): value is string {
  return typeof value === "string" && THEME_ID_PATTERN.test(value);
}
