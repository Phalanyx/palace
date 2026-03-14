import { GoogleGenAI } from "@google/genai"
import * as THREE from "three"
import { extractMeshCode } from "./extractMeshCode"

const meshAi = new GoogleGenAI({
  apiKey: process.env.VERTEX_AI_KEY,
});

export interface GeneratedMesh {
  code: string;
  html: string;
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

const FALLBACK_HTML = `<!DOCTYPE html>
<html>
<head><script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r158/three.min.js"></script></head>
<body><script>
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhysicalMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 2.5, flatShading: true });
const mainObject = new THREE.Mesh(geometry, material);
scene.add(mainObject);
camera.position.z = 3;
function animate() { requestAnimationFrame(animate); mainObject.rotation.y += 0.01; renderer.render(scene, camera); }
animate();
</script></body>
</html>`;

async function generateSingleMesh(
  obj: { id: string; itemType: string; label: string; description: string }
): Promise<{ code: string; html: string }> {
  const maxRetries = 3;
  let previousErrors = "";

  const basePrompt = `You are a world-class low-poly 3D artist and Three.js expert. Your task: create a stunning, detailed LOW-POLY 3D model of a "${obj.itemType}" that visually represents the concept "${obj.label}" (${obj.description}).

Write a complete standalone HTML page using Three.js.

MODELING GUIDELINES — make it DETAILED and RECOGNIZABLE:
- Do NOT just use a single primitive. Build a multi-part model from 5-15+ combined meshes.
- Use a THREE.Group as the root container (\`mainObject\`). Add child meshes with precise positions/rotations.
- Think like a 3D modeler: break the object into logical parts. For example:
  • A telescope = cylindrical tube body + smaller eyepiece cylinder + cone lens hood + ring details + tripod legs
  • A book = box cover + thinner box pages + small box spine + bookmark ribbon (thin box)
  • A tree = cylinder trunk + 3 stacked cones for canopy at different scales + small sphere fruits
  • A rocket = cone nose + cylinder body + 3-4 fin shapes (ExtrudeGeometry or boxes) + exhaust cone
- Add small accent details: rivets (tiny spheres), bands (thin cylinders/tori), edges (thin boxes), etc.
- Vary the scale and rotation of parts to create visual interest and asymmetry where appropriate.
- Position sub-meshes carefully using mesh.position.set(x, y, z) and mesh.rotation.set(x, y, z).

GEOMETRY RULES:
- Use ONLY Three.js built-in classes: BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, TorusKnotGeometry, ExtrudeGeometry, LatheGeometry, RingGeometry, PlaneGeometry, OctahedronGeometry, IcosahedronGeometry, DodecahedronGeometry, TetrahedronGeometry.
- LOW-POLY look: use low segment counts (3-8) on ALL geometries. This is the signature style.
- ALWAYS set flatShading: true — this gives the faceted crystalline look.
- For THREE.Shape paths: use ONLY .moveTo(), .lineTo(), .absarc(), .bezierCurveTo(), .quadraticCurveTo(). Do NOT use .arcTo() or .extractPoints() — they do not exist.

MATERIAL & COLOR RULES:
- Use THREE.MeshPhysicalMaterial on every mesh.
- Set a bright neon \`emissive\` color with emissiveIntensity between 2.0 and 3.0 for a glowing look.
- Use 2-3 contrasting neon colors across the model's parts for visual pop. Pick from: 0xff00ff (magenta), 0x00ffff (cyan), 0xccff00 (lime), 0xff6600 (orange), 0x00ff88 (green), 0xff0088 (pink), 0xaa00ff (purple), 0xffff00 (yellow).
- Set roughness: 0.15, metalness: 0.6 for a sleek, slightly reflective surface.
- The main body should be one color, with accent parts in a contrasting color.

SIZE & POSITION:
- The entire assembled model must fit within a 1.5 × 1.5 × 1.5 bounding box centered at the origin (0, 0, 0).
- Center the model so it looks good when rotating.

CRITICAL CODE STRUCTURE — you MUST follow this exact layout in your <script> tag:

\`\`\`
// === MESH_START ===
// All object-creation code here: geometries, materials, meshes, groups
// Final line: const mainObject = group;  (or whatever your root group is)
// === MESH_END ===

// Scene boilerplate AFTER MESH_END
const scene = new THREE.Scene();
scene.add(mainObject);
// camera, renderer, animate ...
\`\`\`

The markers \`// === MESH_START ===\` and \`// === MESH_END ===\` are REQUIRED. Everything between them must be self-contained — only use the \`THREE\` global. No references to scene, camera, renderer, document, or window between the markers.

HTML page requirements:
- Load Three.js: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r158/three.min.js"></script>
- ONE inline <script> block with ALL code

Output ONLY the complete HTML page. No markdown fences, no explanation.`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const prompt = previousErrors
      ? basePrompt + `\n\nLAST ATTEMPT FAILED:\n${previousErrors}\n\nFix these errors and output valid HTML only.`
      : basePrompt;

    try {
      const response = await meshAi.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          maxOutputTokens: 65535,
          temperature: 1,
          topP: 0.95,
          thinkingConfig: { thinkingLevel: "high" as any },
        },
      });

      const html = (response.text || "").trim();
      const code = extractMeshCode(html);

      // VALIDATION: execute extracted JS in Node.js to catch syntax/runtime errors
      try {
        const createMeshFn = new Function('THREE', code);
        const testObj = createMeshFn(THREE);
        if (!testObj || !(testObj instanceof THREE.Object3D)) {
          throw new Error("Returned value is not a THREE.Object3D.");
        }
        console.log(`Mesh OK for "${obj.label}" on attempt ${attempt}`);
        return { code, html };
      } catch (execError: any) {
        throw new Error(`Execution error: ${execError.message}`);
      }
    } catch (err: any) {
      console.warn(`Attempt ${attempt} failed for "${obj.label}":`, err.message);
      previousErrors = err.message;
    }
  }

  console.error(`All retries failed for "${obj.label}", using fallback.`);
  return { code: FALLBACK_CODE, html: FALLBACK_HTML };
}

export async function generateAllMeshes(
  objects: { id: string; itemType: string; label: string; description: string }[]
): Promise<Record<string, GeneratedMesh>> {
  const result: Record<string, GeneratedMesh> = {};

  if (objects.length === 0) return result;

  // Run all mesh generation in parallel with individual prompts
  const promises = objects.map(async (obj) => {
    const { code, html } = await generateSingleMesh(obj);
    result[obj.id] = { code, html };
  });

  await Promise.all(promises);

  return result;
}
