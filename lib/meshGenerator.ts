import { GoogleGenAI, Type } from "@google/genai"

export type Primitive = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'icosahedron' | 'octahedron';

export interface MeshPart {
  primitive: Primitive;
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
}

const VALID_PRIMITIVES = new Set<string>(['box', 'sphere', 'cylinder', 'cone', 'torus', 'icosahedron', 'octahedron']);

const FALLBACK_PARTS: MeshPart[] = [
  { primitive: 'sphere', color: '#ff00ff', position: [0, 0, 0], scale: [1.4, 1.4, 1.4] }
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" })

function validateParts(raw: unknown): MeshPart[] {
  if (!Array.isArray(raw)) throw new Error('Expected array');
  if (raw.length < 2 || raw.length > 6) throw new Error(`Expected 2-6 parts, got ${raw.length}`);
  return raw.map((p: any) => {
    if (!VALID_PRIMITIVES.has(p.primitive)) throw new Error(`Invalid primitive: ${p.primitive}`);
    if (typeof p.color !== 'string') throw new Error('Missing color');
    if (!Array.isArray(p.position) || p.position.length !== 3) throw new Error('Invalid position');
    if (!Array.isArray(p.scale) || p.scale.length !== 3) throw new Error('Invalid scale');
    return {
      primitive: p.primitive as Primitive,
      color: p.color,
      position: p.position.map(Number) as [number, number, number],
      scale: p.scale.map(Number) as [number, number, number],
    };
  });
}

// Schema for Gemini structured output: { "1": [...parts], "2": [...parts] }
const meshPartSchema = {
  type: Type.OBJECT,
  properties: {
    primitive: { type: Type.STRING, enum: ["box", "sphere", "cylinder", "cone", "torus", "icosahedron", "octahedron"] },
    color: { type: Type.STRING },
    position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
    scale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
  },
  required: ["primitive", "color", "position", "scale"],
}

function buildResponseSchema(count: number) {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (let i = 1; i <= count; i++) {
    const key = String(i);
    properties[key] = { type: Type.ARRAY, items: meshPartSchema };
    required.push(key);
  }
  return { type: Type.OBJECT, properties, required };
}

export async function generateAllMeshes(
  objects: { id: string; itemType: string; label: string; description: string }[]
): Promise<Record<string, MeshPart[]>> {
  const result: Record<string, MeshPart[]> = {};

  if (objects.length === 0) return result;

  const indexToId = new Map<string, string>();
  const itemList = objects
    .map((obj, i) => {
      const key = String(i + 1);
      indexToId.set(key, obj.id);
      return `${key}. Item type: ${obj.itemType}, Label: ${obj.label}, Description: ${obj.description}`;
    })
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: 'user',
        parts: [{ text: `You are a 3D mesh designer. For each item below, generate 3–5 primitives that assemble into its shape. Return a JSON object where each key is the item's number (e.g. "1", "2") and each value is an array of MeshPart objects.

PRIMITIVES (and what they look like):
  box       — rectangular block, slab, blade, wall, platform
  sphere    — ball, orb, globe, bubble
  cylinder  — rod, pipe, column, beam, pole
  cone      — spike, tip, flame, funnel, horn
  torus     — ring, halo, loop, donut, band
  icosahedron — gem, crystal, jagged rock, rough sphere
  octahedron  — diamond, faceted gem, angular jewel

SCALE RULES:
  Main body:   [1.4–2.0] on dominant axis
  Secondary:   [0.6–1.0]
  Detail:      [0.3–0.5]

POSITION RULES:
  y=0 is center. Stack vertically with y offsets.
  Small x/z offsets (±0.3–0.8) for asymmetry.

COLOR RULES — pick from these neons, different color per part:
  #ff00ff  #00ffff  #ccff00  #ff6600  #00ff88  #ff0088  #aa00ff  #ffff00

WORKED EXAMPLES:

Book (knowledge):
[{"primitive":"box","color":"#ff6600","position":[0,0,0],"scale":[1.4,1.8,0.3]},{"primitive":"box","color":"#00ffff","position":[0,0,0.2],"scale":[1.3,1.7,0.05]},{"primitive":"box","color":"#ccff00","position":[-0.7,0,0],"scale":[0.08,1.8,0.4]}]

Telescope (exploration):
[{"primitive":"cylinder","color":"#00ffff","position":[0,0,0],"scale":[0.4,2.0,0.4]},{"primitive":"cylinder","color":"#ff00ff","position":[0,1.1,0],"scale":[0.55,0.6,0.55]},{"primitive":"torus","color":"#ccff00","position":[0,1.4,0],"scale":[0.55,0.55,0.1]}]

Anchor (stability):
[{"primitive":"cylinder","color":"#00ffff","position":[0,0.3,0],"scale":[0.15,1.8,0.15]},{"primitive":"torus","color":"#ff00ff","position":[0,1.2,0],"scale":[0.4,0.4,0.4]},{"primitive":"box","color":"#ff6600","position":[0,-0.6,0],"scale":[1.4,0.15,0.15]},{"primitive":"cone","color":"#ccff00","position":[-0.6,-0.8,0],"scale":[0.25,0.5,0.25]},{"primitive":"cone","color":"#ccff00","position":[0.6,-0.8,0],"scale":[0.25,0.5,0.25]}]

Airplane (flight):
[{"primitive":"cylinder","color":"#ff00ff","position":[0,0,0],"scale":[0.35,2.0,0.35]},{"primitive":"box","color":"#00ffff","position":[0,0,0],"scale":[2.0,0.08,0.5]},{"primitive":"box","color":"#ccff00","position":[0,-0.8,0],"scale":[0.8,0.08,0.3]},{"primitive":"cone","color":"#ff6600","position":[0,1.2,0],"scale":[0.3,0.5,0.3]}]

Popcorn (burst of ideas):
[{"primitive":"sphere","color":"#ffff00","position":[0,0.3,0],"scale":[0.6,0.6,0.6]},{"primitive":"sphere","color":"#ff6600","position":[0.4,0.6,0.2],"scale":[0.5,0.5,0.5]},{"primitive":"sphere","color":"#ccff00","position":[-0.3,0.7,-0.1],"scale":[0.45,0.45,0.45]},{"primitive":"cylinder","color":"#ff0088","position":[0,-0.5,0],"scale":[0.6,0.8,0.6]},{"primitive":"cone","color":"#ff00ff","position":[0,-1.0,0],"scale":[0.7,0.3,0.7]}]

Umbrella (protection):
[{"primitive":"sphere","color":"#ff0088","position":[0,0.6,0],"scale":[1.6,0.6,1.6]},{"primitive":"cylinder","color":"#00ffff","position":[0,-0.3,0],"scale":[0.1,1.8,0.1]},{"primitive":"cone","color":"#ccff00","position":[0,-1.2,0],"scale":[0.2,0.3,0.2]}]

Lighthouse (guidance):
[{"primitive":"cylinder","color":"#00ffff","position":[0,0,0],"scale":[0.6,1.8,0.6]},{"primitive":"cone","color":"#ff6600","position":[0,1.2,0],"scale":[0.7,0.6,0.7]},{"primitive":"sphere","color":"#ffff00","position":[0,1.5,0],"scale":[0.4,0.4,0.4]}]

Trophy (achievement):
[{"primitive":"cylinder","color":"#ffff00","position":[0,0.5,0],"scale":[0.8,0.8,0.8]},{"primitive":"cylinder","color":"#ff6600","position":[0,-0.2,0],"scale":[0.15,0.8,0.15]},{"primitive":"cylinder","color":"#00ffff","position":[0,-0.7,0],"scale":[0.6,0.15,0.6]},{"primitive":"torus","color":"#ff00ff","position":[0,0.9,0],"scale":[0.5,0.5,0.1]}]

Mushroom (growth):
[{"primitive":"sphere","color":"#ff0088","position":[0,0.5,0],"scale":[1.4,0.8,1.4]},{"primitive":"cylinder","color":"#00ff88","position":[0,-0.3,0],"scale":[0.35,1.2,0.35]},{"primitive":"torus","color":"#ccff00","position":[0,0.1,0],"scale":[0.5,0.5,0.1]}]

NOW GENERATE for each item below, using the examples above AS REFERENCE ONLY, PLEASE COME UP WITH BETTER ITEMS GIVEN THE PROMPT:

Items:
${itemList}` }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(objects.length),
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    for (const [key, id] of indexToId) {
      const obj = objects.find(o => o.id === id)!;
      try {
        result[id] = validateParts(parsed[key]);
      } catch (err) {
        console.error(`Mesh validation failed for "${obj.label}" (${obj.itemType}):`, err);
        result[id] = FALLBACK_PARTS;
      }
    }
  } catch (err) {
    console.error('Batch mesh generation failed:', err);
    for (const obj of objects) {
      result[obj.id] = FALLBACK_PARTS;
    }
  }

  return result;
}
