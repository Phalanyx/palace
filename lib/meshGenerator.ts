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

function suggestGeometry(itemType: string): string {
  const t = itemType.toLowerCase();
  if (/sword|blade|knife|dagger|axe/.test(t)) return "ExtrudeGeometry (use a 2D blade shape path)";
  if (/book|textbook|notebook/.test(t)) return "BoxGeometry (use multiple flat boxes for cover, spine, pages)";
  if (/ring|torus|donut|circle/.test(t)) return "TorusGeometry (use low tubularSegments=4, radialSegments=6)";
  if (/bottle|vase|cup|mug|jar|flask/.test(t)) return "LatheGeometry (define a 2D profile curve)";
  if (/tree|plant|mushroom/.test(t)) return "ConeGeometry (stacked cones for canopy, CylinderGeometry for trunk, low segments=5)";
  if (/gem|crystal|diamond/.test(t)) return "OctahedronGeometry or ConeGeometry (use low detail=0)";
  if (/scroll|roll|paper/.test(t)) return "CylinderGeometry (4 sides, then BoxGeometry for unrolled portion)";
  if (/arrow|bolt/.test(t)) return "ConeGeometry + CylinderGeometry (tip + shaft, 4 sides each)";
  if (/key/.test(t)) return "ExtrudeGeometry (use a 2D silhouette of a key shape)";
  if (/shield|crest/.test(t)) return "ExtrudeGeometry (use a 2D shield shape path)";
  if (/star/.test(t)) return "ExtrudeGeometry (use a Shape with moveTo/lineTo to define a star silhouette)";
  if (/brain|heart|organ/.test(t)) return "SphereGeometry (low segments=5, then displace vertices)";
  if (/hourglass|funnel/.test(t)) return "LatheGeometry (use an hourglass profile)";
  if (/flame|fire|torch/.test(t)) return "ConeGeometry (3 sides, tapered, stacked for flame layers)";
  if (/chain/.test(t)) return "TorusGeometry (multiple small tori linked together in a line)";
  if (/coin|medal|disc/.test(t)) return "CylinderGeometry (height=0.05, radialSegments=8)";
  if (/spear|lance/.test(t)) return "CylinderGeometry (shaft) + ConeGeometry (tip), both 4 sides";
  if (/feather|quill/.test(t)) return "ExtrudeGeometry (use a leaf-style 2D outline path)";
  return "THREE.Group with multiple combined geometries to build the recognizable shape";
}

async function generateSingleMesh(
  obj: { id: string; itemType: string; label: string; description: string }
): Promise<string> {
  const maxRetries = 3;
  let previousErrors = "";
  const geometrySuggestion = suggestGeometry(obj.itemType);

  const basePrompt = `You are a 3D artist building a memory palace — a mnemonic learning tool where physical objects help someone REMEMBER academic concepts. Your job: write raw JavaScript (for Three.js) that returns a THREE.Object3D.

THE CONCEPT TO REMEMBER:
"${obj.label}" — ${obj.description}

THE PHYSICAL OBJECT CHOSEN AS A METAPHOR: "${obj.itemType}"

RECOMMENDED GEOMETRY: ${geometrySuggestion}

THREE.JS RULES (CRITICAL):
1. \`THREE\` is a global. Do NOT use import/require/export.
2. Low-poly aesthetic: use low segment counts (3-8) on all circular geometries. Always set \`flatShading: true\` on materials.
3. Use \`THREE.MeshPhysicalMaterial\` with neon emissive glow (emissiveIntensity 2.0-3.0). Colors: 0xff00ff, 0x00ffff, 0xccff00, 0xff6600, 0x00ff88, 0xff0088, 0xaa00ff, 0xffff00.
4. Keep the object within a 1.5×1.5×1.5 bounding box centered at origin.
5. For THREE.Shape: use .moveTo(), .lineTo(), .absarc(), .bezierCurveTo(), .quadraticCurveTo(). Do NOT use .arcTo() or .extractPoints() — they do not exist.
6. Return ONLY raw JavaScript code — no HTML, no markdown, no comments outside the code. Executed via \`new Function('THREE', code)\`.
7. The final line must be \`return group;\` or \`return mesh;\`.`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const prompt = previousErrors
      ? basePrompt + `\n\nLAST ATTEMPT FAILED:\n${previousErrors}\n\nFix these errors and output valid JavaScript only.`
      : basePrompt;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      let code = response.text || "";
      // Strip markdown fences
      code = code.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();

      // VALIDATION: execute in Node.js to catch syntax/runtime errors
      try {
        const createMeshFn = new Function('THREE', code);
        const testObj = createMeshFn(THREE);
        if (!testObj || !(testObj instanceof THREE.Object3D)) {
          throw new Error("Returned value is not a THREE.Object3D.");
        }
        console.log(`Mesh OK for "${obj.label}" on attempt ${attempt}`);
        return code;
      } catch (execError: any) {
        throw new Error(`Execution error: ${execError.message}`);
      }
    } catch (err: any) {
      console.warn(`Attempt ${attempt} failed for "${obj.label}":`, err.message);
      previousErrors = err.message;
    }
  }

  console.error(`All retries failed for "${obj.label}", using fallback.`);
  return FALLBACK_CODE;
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
