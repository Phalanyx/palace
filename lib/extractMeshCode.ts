/**
 * Extracts executable Three.js mesh-creation code from either raw JS or a full HTML page.
 * Used both server-side (mesh validation) and client-side (runtime mesh building).
 */
export function extractMeshCode(raw: string): string {
  let text = raw.replace(/^```(?:html|javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();

  // If the response contains HTML, extract inline <script> content (skip CDN script tags)
  if (text.includes('<script') || text.includes('<!DOCTYPE') || text.includes('<html')) {
    const scripts: string[] = [];
    const re = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(text)) !== null) scripts.push(m[1].trim());
    text = scripts.join('\n');
  }

  // Strategy 1: Use MESH_START / MESH_END markers (most reliable)
  const markerMatch = text.match(
    /\/\/\s*={2,}\s*MESH_START\s*={0,}\s*\n([\s\S]*?)\n\s*\/\/\s*={2,}\s*MESH_END/
  );
  if (markerMatch) {
    let code = markerMatch[1].trim();
    if (!/return\s+(mainObject|group|mesh)\b/.test(code)) {
      code += '\nreturn mainObject;';
    }
    return code;
  }

  // Strategy 2: Fallback — strip boilerplate line-by-line (for legacy or non-compliant responses)
  const boilerplatePatterns = [
    /^\s*(const|let|var)\s+(scene|camera|renderer|controls|canvas)\s*=/,
    /^\s*renderer[\s.]/,
    /^\s*scene\.(add|background|fog)\b/,
    /^\s*camera\.(position|lookAt|aspect|updateProjectionMatrix)\b/,
    /^\s*document\./,
    /^\s*window\./,
    /^\s*(function\s+)?(animate|render|onWindowResize)\s*\(/,
    /^\s*requestAnimationFrame\b/,
    /^\s*new\s+THREE\.OrbitControls\b/,
    /^\s*new\s+THREE\.(Ambient|Directional|Point|Spot|Hemisphere)Light\b/,
    /^\s*controls[\s.]/,
  ];

  const lines = text.split('\n');
  const kept: string[] = [];
  let skipDepth = 0;

  for (const line of lines) {
    if (skipDepth > 0) {
      const opens = (line.match(/{/g) || []).length;
      const closes = (line.match(/}/g) || []).length;
      skipDepth += opens - closes;
      if (skipDepth < 0) skipDepth = 0;
      continue;
    }

    const isBoilerplate = boilerplatePatterns.some(p => p.test(line));
    if (isBoilerplate) {
      const opens = (line.match(/{/g) || []).length;
      const closes = (line.match(/}/g) || []).length;
      skipDepth = opens - closes;
      if (skipDepth < 0) skipDepth = 0;

      // Also skip continuation lines (multiline function calls/constructors)
      // by checking if the line ends without a semicolon or closing paren+semicolon
      if (skipDepth === 0 && !line.trimEnd().endsWith(';') && !line.trimEnd().endsWith(')')) {
        skipDepth = 1; // Assume at least one more continuation line
      }

      continue;
    }

    // Skip lines that are just closing parens/braces/semicolons (orphans from stripped multiline stmts)
    if (/^\s*[)}\];,]+\s*$/.test(line)) {
      continue;
    }

    // Skip lines with only numbers, booleans, or trailing args (orphaned from multiline calls)
    if (/^\s*[\d.]+\s*,?\s*$/.test(line)) {
      continue;
    }

    kept.push(line);
  }

  text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  if (!/return\s+(mainObject|group|mesh)\b/.test(text)) {
    text += '\nreturn mainObject;';
  }

  return text.trim();
}
