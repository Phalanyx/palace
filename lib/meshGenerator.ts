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

function suggestGeometry(itemType: string): string {
  const t = itemType.toLowerCase();
  
  if (t.includes('sword') || t.includes('blade') || t.includes('knife') || t.includes('key')) {
    return 'ExtrudeGeometry (to create a specific silhouette profile) or BoxGeometry (stacked carefully)';
  }
  if (t.includes('book') || t.includes('box') || t.includes('chest') || t.includes('block') || t.includes('scale')) {
    return 'BoxGeometry (multiple boxes scaled and positioned inside a Group)';
  }
  if (t.includes('ring') || t.includes('halo') || t.includes('donut') || t.includes('band') || t.includes('magnet')) {
    return 'TorusGeometry or TubeGeometry with low radial segments (e.g. 4-6)';
  }
  if (t.includes('tube') || t.includes('pipe') || t.includes('telescope') || t.includes('pole') || t.includes('pillar') || t.includes('lighthouse') || t.includes('funnel')) {
    return 'CylinderGeometry with low radial segments (e.g. 5-8)';
  }
  if (t.includes('sphere') || t.includes('ball') || t.includes('orb') || t.includes('globe') || t.includes('bubble') || t.includes('sprout')) {
    return 'IcosahedronGeometry (to get a low poly sphere) or DodecahedronGeometry';
  }
  if (t.includes('spike') || t.includes('horn') || t.includes('cone') || t.includes('parachute')) {
    return 'ConeGeometry or CylinderGeometry (with a top radius of 0) with low radial segments (e.g. 4-6)';
  }
  if (t.includes('crystal') || t.includes('gem') || t.includes('diamond')) {
    return 'OctahedronGeometry or IcosahedronGeometry (detail: 0)';
  }

  // Default fallback suggestion
  return 'LatheGeometry, ExtrudeGeometry, or an assembly of primitive geometries';
}

async function generateSingleMesh(
  obj: { id: string; itemType: string; label: string; description: string }
): Promise<string> {
  const maxRetries = 3;
  let previousErrors = "";

  const recommendedGeometry = suggestGeometry(obj.itemType);

  const basePrompt = `You are an expert 3D mesh designer writing raw, executable JavaScript for Three.js.
Your task is to generate the inner body of a JavaScript function that returns a \`THREE.Object3D\` (such as a \`THREE.Group\` or \`THREE.Mesh\`) representing the following concept.

OBJECT TO MODEL:
Label: ${obj.label}
Description: ${obj.description}
Physical METAPHOR / Item Type: ${obj.itemType}

RECOMMENDED GEOMETRY APPROACH:
${recommendedGeometry}

IMPORTANT INSTRUCTIONS FOR THE CODE:
1. You have access to the global \`THREE\` object. DO NOT import or require Three.js.
2. Build expressive LOW-POLY shapes. DO NOT just stack primitive boxes and spheres! Choose geometries that perfectly represent the item's silhouette.
3. CRITICAL: For circular geometries (CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, TubeGeometry, LatheGeometry), you MUST specify extremely low segment counts (e.g., 3, 4, 5, 6, 8 max!) to emphasize distinct flat faces. NEVER use 32, 16, or 24 segments. E.g., \`new THREE.CylinderGeometry(radius, radius, height, 6)\`.
4. Keep the object roughly contained within a 2x2x2 bounding box around the origin (0, 0, 0).
5. Apply expressive materials. Use \`THREE.MeshPhysicalMaterial\` with neon colors, high emissive values (\`emissive: new THREE.Color(...)\`, \`emissiveIntensity: 2.5\`), roughness, and metalness, so the objects glow beautifully in a dark scene. Use these colors as HEX (e.g. 0xff00ff). 
6. CRITICAL: ALWAYS include \`flatShading: true\` in ALL \`THREE.MeshPhysicalMaterial\` options to enforce the low-poly aesthetic.
7. Create an overarching \`THREE.Group\` to combine multiple meshes if needed, and finally \`return group;\` or \`return mesh;\` at the end of your code snippet.
8. RETURN ONLY NAKED JAVASCRIPT CODE. DO NOT wrap your response in markdown (\`\`\`javascript) or any other formatting. We run the code exactly as you output it. No explanations.

COLOR RULES — pick from these neons, or mix them contextually:
  0xff00ff, 0x00ffff, 0xccff00, 0xff6600, 0x00ff88, 0xff0088, 0xaa00ff, 0xffff00
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
