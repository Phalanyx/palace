import { GoogleGenAI, Type } from "@google/genai"
import * as THREE from "three"

export interface GeneratedMesh {
  code: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" })

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

  const basePrompt = `You are a 3D artist building a memory palace — a mnemonic learning tool where physical objects help someone REMEMBER academic concepts. Your job: write raw JavaScript (for Three.js) that returns a THREE.Object3D.

THE CONCEPT TO REMEMBER:
"${obj.label}" — ${obj.description}

THE PHYSICAL OBJECT CHOSEN AS A METAPHOR: "${obj.itemType}"

YOUR CREATIVE GOAL:
A person walks into a 3D room and sees this object. They should IMMEDIATELY think: "Ah, that's about ${obj.label}!"
Think about WHY "${obj.itemType}" represents "${obj.label}". What visual features of a ${obj.itemType} echo the concept? Lean into those features:
- If the metaphor is about STRUCTURE (e.g. a Zipper for DNA Replication), emphasize the interlocking/parallel structure.
- If the metaphor is about TRANSFORMATION (e.g. a Cocoon for Metamorphosis), show the transitional form.
- If the metaphor is about FLOW or DIRECTION (e.g. a Funnel for Data Pipeline), make the directional shape clear.
- If the metaphor is about BALANCE or TENSION (e.g. a Scale for Supply & Demand), show opposing forces.
Build a recognizable, detailed silhouette of "${obj.itemType}" — not a generic blob. Use multiple parts in a THREE.Group to capture the distinct features (handle, blade, pages, teeth, petals, etc.).

THREE.JS RULES:
1. \`THREE\` is a global. Do NOT import/require anything.
2. Low-poly aesthetic: use low segment counts (3-8) on all circular geometries. Always set \`flatShading: true\` on materials.
3. Use \`THREE.MeshPhysicalMaterial\` with neon emissive glow (emissiveIntensity ~2.0-3.0). Pick colors that feel thematically right for the concept — warm tones for energy/life, cool tones for logic/structure, etc. Available neons: 0xff00ff, 0x00ffff, 0xccff00, 0xff6600, 0x00ff88, 0xff0088, 0xaa00ff, 0xffff00.
4. Keep the object within a 1.5×1.5×1.5 bounding box centered at origin.
5. Return ONLY raw JavaScript code — no markdown fences, no comments, no explanations. The code is executed directly via \`new Function('THREE', code)\`.
6. The final line must be \`return group;\` or \`return mesh;\`.
`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const prompt = previousErrors 
      ? basePrompt + `\n\nLAST ATTEMPT FAILED WITH THESE ERRORS:\n${previousErrors}\n\nPlease fix the errors and output valid JavaScript.`
      : basePrompt;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      let code = response.text || "";
      // Strip markdown if the LLM ignores instructions
      if (code.startsWith("```javascript")) {
        code = code.substring(13);
        if (code.endsWith("```")) {
           code = code.substring(0, code.length - 3);
        }
      } else if (code.startsWith("```js")) {
        code = code.substring(5);
        if (code.endsWith("```")) {
           code = code.substring(0, code.length - 3);
        }
      } else if (code.startsWith("```")) {
        code = code.substring(3);
        if (code.endsWith("```")) {
           code = code.substring(0, code.length - 3);
        }
      }
      code = code.trim();

      // VALIDATION LOOP
      try {
        const createMeshFn = new Function('THREE', code);
        const testObj = createMeshFn(THREE);
        
        if (!testObj || !(testObj instanceof THREE.Object3D)) {
            throw new Error("The returned object is not a valid THREE.Object3D.");
        }

        console.log(`Successfully generated mesh for "${obj.label}" on attempt ${attempt}`);
        return code; // Return the working code
      } catch (execError: any) {
        console.warn(`Execution failed for "${obj.label}" on attempt ${attempt}:`, execError.message);
        previousErrors = execError.message;
        // Proceed to next loop iteration
      }
    } catch (apiError: any) {
      console.warn(`Gemini API failed for "${obj.label}" on attempt ${attempt}:`, apiError.message);
      // Let it naturally retry or return fallback
    }
  }

  console.error(`All ${maxRetries} attempts failed for "${obj.label}". Using fallback.`);
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
