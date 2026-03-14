import { Type } from "@google/genai"
import { ai } from "./gemini"
import * as THREE from "three"

export interface GeneratedMesh {
  code: string;
}

const FALLBACK_CODE = `
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 2.5,
    roughness: 0.1,
    metalness: 0.7,
    flatShading: true
  });
  return new THREE.Mesh(geometry, material);
`;

async function generateSingleMesh(
  obj: { id: string; itemType: string; label: string; description: string }
): Promise<string> {
  const maxRetries = 3;
  let previousErrors = "";

  const basePrompt = `You are a Master 3D Artist and Three.js Expert. Your task is to generate a STANDALONE PREVIEW HTML FILE for a 3D mnemonic object.

OBJECT TO REPRESENT:
"${obj.label}" — ${obj.description}

PHYSICAL METAPHOR: "${obj.itemType}"

DESIGN REQUIREMENTS:
1. AESTHETIC: High-end LOW-POLY / NEON style. Flat shading is mandatory.
2. GEOMETRY: Use sophisticated Three.js techniques (LatheGeometry, ExtrudeGeometry with custom shapes, TubeGeometry, or complex Boolean-like assemblies). NO BLABS. The silhouette must be sharp and recognizable.
3. SEGMENTS: For all curved geometries, use 3-8 radial segments.
4. MATERIALS: MeshPhysicalMaterial with neon emissive colors (emissiveIntensity: 2.5).
5. COLORS: Pick from {0xff00ff, 0x00ffff, 0xccff00, 0xff6600, 0x00ff88, 0xff0088, 0xaa00ff, 0xffff00}.

THE CONTRACT:
Your response must be a COMPLETE, VALID HTML FILE that someone could open in a browser to see the model.
CRITICAL: Inside the <script> block, you MUST define a global function:
window.createMnemonicModel = function(THREE) {
  // your construction logic here...
  return groupOrMesh;
};

The HTML must also include a full setup (Scene, Camera, Renderer, OrbitControls via CDN, Lights) so the model is actually visible when opened.

OUTPUT ONLY THE HTML CODE. No markdown fences.`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const prompt = previousErrors 
      ? basePrompt + `\n\nLAST ATTEMPT FAILED WITH THESE ERRORS:\n${previousErrors}\n\nPlease fix the errors and output valid JavaScript.`
      : basePrompt;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      let html = response.text || "";
      // Strip markdown
      if (html.includes("```html")) {
        html = html.split("```html")[1].split("```")[0];
      } else if (html.includes("```")) {
        html = html.split("```")[1].split("```")[0];
      }
      html = html.trim();

      // VALIDATION: Check if createMnemonicModel exists in string
      if (!html.includes("createMnemonicModel")) {
         throw new Error("Missing 'createMnemonicModel' function in HTML.");
      }

      console.log(`Successfully generated HTML blueprint for "${obj.label}" on attempt ${attempt}`);
      return html; 
    } catch (err: any) {
      console.warn(`Generation failed for "${obj.label}" on attempt ${attempt}:`, err.message);
      previousErrors = err.message;
    }
  }

  // Fallback to minimal HTML with the legacy FALLBACK_CODE behavior
  return `<!DOCTYPE html><html><body><script>window.createMnemonicModel = function(THREE) { ${FALLBACK_CODE} };</script></body></html>`;
}

export async function generateAllMeshes(
  objects: { id: string; itemType: string; label: string; description: string }[]
): Promise<Record<string, GeneratedMesh>> {
  const result: Record<string, GeneratedMesh> = {};

  if (objects.length === 0) return result;

  // Run all mesh generation in parallel with individual prompts
  const promises = objects.map(async (obj) => {
    const code = await generateSingleMesh(obj);
    result[obj.id] = { code };
  });

  await Promise.all(promises);

  return result;
}
