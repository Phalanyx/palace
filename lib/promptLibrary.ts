export type PromptCategory = "Medical" | "Law" | "STEM" | "History" | "Business" | "Arts & Humanities" | "Fun"

export interface PromptTemplate {
  id: string
  title: string
  description: string
  category: PromptCategory
  prompt: string
  coverImage: string
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  "Medical",
  "Law",
  "STEM",
  "History",
  "Business",
  "Arts & Humanities",
  "Fun",
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const coverUrl = (id: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/palace-models/prompt-covers/${id}.jpg`

export const PROMPT_LIBRARY: PromptTemplate[] = [
  // ── Medical (3) ──────────────────────────────────────────────────────────────
  {
    id: "anatomy-skeletal-system",
    title: "The Skeletal System",
    description: "Master every bone in the human body with spatial memory anchors.",
    category: "Medical",
    prompt: "Create a memory palace for the human skeletal system. Cover the axial and appendicular skeleton, major bone groups, key landmarks, and articulation types. Use vivid room-based imagery to anchor each region.",
    coverImage: coverUrl("anatomy-skeletal-system"),
  },
  {
    id: "pharmacology-essentials",
    title: "Pharmacology Essentials",
    description: "Drug classes, mechanisms of action, and side effects made memorable.",
    category: "Medical",
    prompt: "Build a memory palace covering essential pharmacology: major drug classes (antibiotics, antihypertensives, analgesics, SSRIs), their mechanisms of action, common side effects, and key drug interactions. Each room should represent a drug class.",
    coverImage: coverUrl("pharmacology-essentials"),
  },
  {
    id: "cardiovascular-system",
    title: "The Cardiovascular System",
    description: "Heart anatomy, blood flow pathways, and cardiac physiology.",
    category: "Medical",
    prompt: "Design a memory palace for the cardiovascular system. Include heart chambers and valves, the cardiac cycle, blood flow through pulmonary and systemic circuits, major vessels, and key ECG landmarks. Use spatial storytelling to connect each concept.",
    coverImage: coverUrl("cardiovascular-system"),
  },

  // ── Law (2) ──────────────────────────────────────────────────────────────────
  {
    id: "constitutional-amendments",
    title: "Constitutional Amendments",
    description: "All 27 amendments with vivid mnemonic anchors.",
    category: "Law",
    prompt: "Create a memory palace for the 27 amendments to the U.S. Constitution. Group them into the Bill of Rights, Reconstruction Amendments, and modern amendments. Each room should encode the amendment number, core right or change, and landmark case associations.",
    coverImage: coverUrl("constitutional-amendments"),
  },
  {
    id: "contract-law-fundamentals",
    title: "Contract Law Fundamentals",
    description: "Offer, acceptance, consideration, and defenses in one palace.",
    category: "Law",
    prompt: "Build a memory palace for contract law fundamentals. Cover formation (offer, acceptance, consideration), capacity, legality, the Statute of Frauds, breach types, remedies (damages, specific performance), and common defenses (duress, unconscionability, mistake).",
    coverImage: coverUrl("contract-law-fundamentals"),
  },

  // ── STEM (3) ─────────────────────────────────────────────────────────────────
  {
    id: "organic-chemistry-reactions",
    title: "Organic Chemistry Reactions",
    description: "Key reaction mechanisms and functional group transformations.",
    category: "STEM",
    prompt: "Design a memory palace for core organic chemistry reactions. Include SN1/SN2, E1/E2, electrophilic aromatic substitution, aldol condensation, Grignard reactions, and oxidation/reduction of alcohols. Each room should visualize the mechanism and key reagents.",
    coverImage: coverUrl("organic-chemistry-reactions"),
  },
  {
    id: "data-structures-algorithms",
    title: "Data Structures & Algorithms",
    description: "Arrays, trees, graphs, sorting, and Big-O at a glance.",
    category: "STEM",
    prompt: "Create a memory palace for fundamental data structures and algorithms. Cover arrays, linked lists, stacks, queues, hash tables, binary trees, heaps, graphs, and key algorithms (binary search, merge sort, quicksort, BFS, DFS, Dijkstra). Anchor Big-O complexities to each room.",
    coverImage: coverUrl("data-structures-algorithms"),
  },
  {
    id: "newtonian-mechanics",
    title: "Newtonian Mechanics",
    description: "Forces, motion, energy, and momentum in vivid spatial form.",
    category: "STEM",
    prompt: "Build a memory palace for Newtonian mechanics. Cover Newton's three laws, kinematics equations, friction, circular motion, work-energy theorem, conservation of energy, impulse-momentum theorem, and rotational dynamics. Use intuitive physical scenarios in each room.",
    coverImage: coverUrl("newtonian-mechanics"),
  },

  // ── History (2) ──────────────────────────────────────────────────────────────
  {
    id: "ancient-rome-republic-empire",
    title: "Ancient Rome: Republic to Empire",
    description: "Key events, figures, and transitions from 509 BC to 476 AD.",
    category: "History",
    prompt: "Design a memory palace spanning Roman history from the founding of the Republic to the fall of the Western Empire. Include key events (Punic Wars, crossing the Rubicon, Pax Romana), pivotal figures (Cicero, Caesar, Augustus, Constantine), and structural shifts (Senate to Principate to Dominate).",
    coverImage: coverUrl("ancient-rome-republic-empire"),
  },
  {
    id: "french-revolution",
    title: "The French Revolution",
    description: "From the Estates-General to Napoleon's rise, in chronological rooms.",
    category: "History",
    prompt: "Create a memory palace for the French Revolution (1789–1799). Cover the Estates-General, storming of the Bastille, Declaration of the Rights of Man, Reign of Terror, Thermidorian Reaction, and the rise of Napoleon. Anchor key dates, figures, and causes in each room.",
    coverImage: coverUrl("french-revolution"),
  },

  // ── Business (2) ─────────────────────────────────────────────────────────────
  {
    id: "microeconomics-principles",
    title: "Microeconomics Principles",
    description: "Supply, demand, elasticity, and market structures.",
    category: "Business",
    prompt: "Build a memory palace for microeconomics principles. Cover supply and demand curves, equilibrium, price elasticity, consumer and producer surplus, market structures (perfect competition, monopoly, oligopoly, monopolistic competition), and externalities. Visualize each concept as a distinct room.",
    coverImage: coverUrl("microeconomics-principles"),
  },
  {
    id: "marketing-frameworks",
    title: "Marketing Frameworks",
    description: "The 4Ps, STP, SWOT, and Porter's Five Forces in one palace.",
    category: "Business",
    prompt: "Design a memory palace for key marketing frameworks. Include the 4Ps (Product, Price, Place, Promotion), STP (Segmentation, Targeting, Positioning), SWOT analysis, Porter's Five Forces, the customer journey funnel, and brand equity models. Each room should embody one framework.",
    coverImage: coverUrl("marketing-frameworks"),
  },

  // ── Arts & Humanities (2) ────────────────────────────────────────────────────
  {
    id: "renaissance-art-movements",
    title: "Renaissance Art Movements",
    description: "From Early Renaissance to Mannerism — artists, works, and techniques.",
    category: "Arts & Humanities",
    prompt: "Create a memory palace for Renaissance art movements. Cover Early Renaissance (Giotto, Brunelleschi), High Renaissance (da Vinci, Michelangelo, Raphael), and Mannerism (Pontormo, Parmigianino). Each room should feature a key work, the artist, and the defining technique or innovation.",
    coverImage: coverUrl("renaissance-art-movements"),
  },
  {
    id: "classical-music-eras",
    title: "Classical Music Eras",
    description: "Baroque through Romantic — composers, forms, and defining works.",
    category: "Arts & Humanities",
    prompt: "Build a memory palace for classical music eras. Cover Baroque (Bach, Handel), Classical (Mozart, Haydn, Beethoven), and Romantic (Chopin, Tchaikovsky, Wagner). Each room should anchor a composer, a signature work, and the stylistic hallmarks of the era.",
    coverImage: coverUrl("classical-music-eras"),
  },

  // ── Fun (3) ──────────────────────────────────────────────────────────────────
  {
    id: "world-capitals-challenge",
    title: "World Capitals Challenge",
    description: "Memorize every world capital with geographic memory hooks.",
    category: "Fun",
    prompt: "Design a memory palace for world capitals. Organize by continent (Europe, Asia, Africa, Americas, Oceania) with each room representing a region. Use vivid geographic and cultural imagery to anchor each country-capital pair. Aim to cover at least 50 countries.",
    coverImage: coverUrl("world-capitals-challenge"),
  },
  {
    id: "mythology-creatures",
    title: "Mythology Creatures",
    description: "Dragons, chimeras, and krakens from myths around the world.",
    category: "Fun",
    prompt: "Create a memory palace for mythological creatures from world cultures. Include Greek (Minotaur, Hydra, Cerberus), Norse (Fenrir, Jörmungandr), Egyptian (Sphinx, Ammit), Asian (Dragon Kings, Kitsune), and others. Each room should capture the creature's origin myth, abilities, and cultural significance.",
    coverImage: coverUrl("mythology-creatures"),
  },
  {
    id: "solar-system",
    title: "The Solar System",
    description: "Planets, moons, and key facts in an orbital memory palace.",
    category: "Fun",
    prompt: "Build a memory palace for the solar system. Cover the eight planets in order, their key moons, distinguishing features (size, atmosphere, rings), dwarf planets (Pluto, Ceres, Eris), and the asteroid and Kuiper belts. Each room should represent one celestial body with vivid spatial imagery.",
    coverImage: coverUrl("solar-system"),
  },
]
