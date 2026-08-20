export function patchBetterXCSP(policy: string): string {
  const directives = policy
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean);
  for (let i = 0; i < directives.length; i++) {
    const tokens = directives[i]?.split(/\s+/) ?? [];
    const name = tokens[0]?.toLowerCase();
    if (name === "script-src" || name === "script-src-elem") {
      directives[i] = tokens.filter((token) => !/^'nonce-[^']+'$/i.test(token)).join(" ");
    }
  }

  const imageIndex = directives.findIndex((directive) => /^img-src(?:\s|$)/i.test(directive));
  if (imageIndex === -1) {
    directives.push("img-src betterx: https:");
  } else {
    const tokens = new Set(directives[imageIndex]?.split(/\s+/) ?? ["img-src"]);
    tokens.add("betterx:");
    tokens.add("https:");
    directives[imageIndex] = [...tokens].join(" ");
  }
  return `${directives.join("; ")};`;
}
