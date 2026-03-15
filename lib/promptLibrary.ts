export type PromptCategory = "Medical" | "Law" | "STEM" | "History" | "Business" | "Arts & Humanities" | "Fun"

export interface PromptTemplate {
  id: string
  title: string
  description: string
  category: PromptCategory
  prompt: string
  topicContext: string
  sourceAssetPath?: string
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

function coverSvg(label: string, emoji: string, start: string, end: string, accent: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="675" rx="42" fill="url(#bg)" />
      <circle cx="955" cy="122" r="164" fill="${accent}" opacity="0.18" />
      <circle cx="196" cy="590" r="210" fill="#ffffff" opacity="0.08" />
      <rect x="72" y="74" width="1056" height="527" rx="34" fill="#0b1117" opacity="0.18" />
      <text x="98" y="208" font-size="132"> ${emoji} </text>
      <text x="98" y="328" fill="#f8fafc" font-size="60" font-family="Georgia, serif" font-weight="700">${label}</text>
      <text x="98" y="388" fill="#dbe4ee" font-size="22" font-family="Arial, sans-serif" letter-spacing="4">MEMORY PALACE PROMPT</text>
      <path d="M98 448 C 286 388, 392 520, 552 470 S 866 386, 1084 502" fill="none" stroke="#ffffff" stroke-opacity="0.34" stroke-width="10" stroke-linecap="round"/>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const PROMPT_LIBRARY: PromptTemplate[] = [
  // ── Medical (3) ──────────────────────────────────────────────────────────────
  {
    id: "anatomy-skeletal-system",
    title: "The Skeletal System",
    description: "Master every bone in the human body with spatial memory anchors.",
    category: "Medical",
    prompt: "Create a memory palace for the human skeletal system. Cover the axial and appendicular skeleton, major bone groups, key landmarks, and articulation types. Use vivid room-based imagery to anchor each region.",
    topicContext: "The skeletal system has 206 bones in the adult body. The axial skeleton includes the skull, vertebral column, ribs, and sternum; the appendicular skeleton includes the shoulder girdle, pelvic girdle, and limb bones. Major bone landmarks include processes, foramina, condyles, tubercles, and fossae. Joint types include fibrous, cartilaginous, and synovial, with synovial joints subdivided into hinge, pivot, saddle, condyloid, plane, and ball-and-socket.",
    sourceAssetPath: "prompt-sources/anatomy-skeletal-system.pdf",
    coverImage: coverSvg("Skeletal System", "🦴", "#1f3b4d", "#5f8f7b", "#f1c27d"),
  },
  {
    id: "pharmacology-essentials",
    title: "Pharmacology Essentials",
    description: "Drug classes, mechanisms of action, and side effects made memorable.",
    category: "Medical",
    prompt: "Build a memory palace covering essential pharmacology: major drug classes (antibiotics, antihypertensives, analgesics, SSRIs), their mechanisms of action, common side effects, and key drug interactions. Each room should represent a drug class.",
    topicContext: "Antibiotics can be organized by target such as cell wall synthesis, protein synthesis, or DNA replication. Antihypertensives include ACE inhibitors, ARBs, beta blockers, calcium channel blockers, and diuretics. Analgesics include NSAIDs, acetaminophen, and opioids. SSRIs inhibit serotonin reuptake and are commonly used for depression and anxiety. Important study points include mechanism, classic adverse effects, contraindications, and high-yield interactions such as serotonergic toxicity, QT prolongation, nephrotoxicity, or bleeding risk.",
    sourceAssetPath: "prompt-sources/pharmacology-essentials.pdf",
    coverImage: coverSvg("Pharmacology", "💊", "#19324a", "#346b8c", "#f59e0b"),
  },
  {
    id: "cardiovascular-system",
    title: "The Cardiovascular System",
    description: "Heart anatomy, blood flow pathways, and cardiac physiology.",
    category: "Medical",
    prompt: "Design a memory palace for the cardiovascular system. Include heart chambers and valves, the cardiac cycle, blood flow through pulmonary and systemic circuits, major vessels, and key ECG landmarks. Use spatial storytelling to connect each concept.",
    topicContext: "Blood enters the right atrium from the venae cavae, passes through the tricuspid valve to the right ventricle, then moves through the pulmonary valve to the lungs. Oxygenated blood returns to the left atrium, crosses the mitral valve into the left ventricle, and exits via the aortic valve into systemic circulation. The cardiac cycle includes ventricular filling, isovolumetric contraction, ejection, and isovolumetric relaxation. Core ECG landmarks are the P wave, QRS complex, and T wave.",
    sourceAssetPath: "prompt-sources/cardiovascular-system.pdf",
    coverImage: coverSvg("Cardiovascular", "🫀", "#3b1220", "#9f1239", "#fb7185"),
  },

  // ── Law (2) ──────────────────────────────────────────────────────────────────
  {
    id: "constitutional-amendments",
    title: "Constitutional Amendments",
    description: "All 27 amendments with vivid mnemonic anchors.",
    category: "Law",
    prompt: "Create a memory palace for the 27 amendments to the U.S. Constitution. Group them into the Bill of Rights, Reconstruction Amendments, and modern amendments. Each room should encode the amendment number, core right or change, and landmark case associations.",
    topicContext: "The first ten amendments are the Bill of Rights and focus on civil liberties such as speech, religion, arms, search and seizure, due process, jury rights, and reserved powers. The Reconstruction Amendments are the 13th, 14th, and 15th, abolishing slavery, defining citizenship and equal protection, and protecting voting rights against racial discrimination. Later amendments address income tax, direct election of senators, women's suffrage, presidential terms, voting age, and presidential succession.",
    sourceAssetPath: "prompt-sources/constitutional-amendments.pdf",
    coverImage: coverSvg("Amendments", "⚖️", "#1f2937", "#6b7280", "#fbbf24"),
  },
  {
    id: "contract-law-fundamentals",
    title: "Contract Law Fundamentals",
    description: "Offer, acceptance, consideration, and defenses in one palace.",
    category: "Law",
    prompt: "Build a memory palace for contract law fundamentals. Cover formation (offer, acceptance, consideration), capacity, legality, the Statute of Frauds, breach types, remedies (damages, specific performance), and common defenses (duress, unconscionability, mistake).",
    topicContext: "A valid contract generally requires offer, acceptance, consideration, and mutual assent. Capacity issues arise with minors, intoxication, or incapacity. Illegality and public policy can render agreements unenforceable. The Statute of Frauds requires certain contracts to be in writing, including land sales and agreements not performable within one year. Remedies include expectation damages, reliance damages, restitution, and specific performance in limited situations. Defenses include duress, undue influence, misrepresentation, mistake, and unconscionability.",
    sourceAssetPath: "prompt-sources/contract-law-fundamentals.pdf",
    coverImage: coverSvg("Contract Law", "📜", "#312e81", "#6366f1", "#fde68a"),
  },

  // ── STEM (3) ─────────────────────────────────────────────────────────────────
  {
    id: "organic-chemistry-reactions",
    title: "Organic Chemistry Reactions",
    description: "Key reaction mechanisms and functional group transformations.",
    category: "STEM",
    prompt: "Design a memory palace for core organic chemistry reactions. Include SN1/SN2, E1/E2, electrophilic aromatic substitution, aldol condensation, Grignard reactions, and oxidation/reduction of alcohols. Each room should visualize the mechanism and key reagents.",
    topicContext: "SN1 reactions proceed through carbocations and favor tertiary substrates and polar protic solvents, while SN2 reactions are concerted backside attacks favored by primary substrates and strong nucleophiles. E1 resembles SN1 and competes under carbocation-forming conditions; E2 is a single-step elimination favored by strong bases. Electrophilic aromatic substitution includes nitration, halogenation, sulfonation, Friedel-Crafts alkylation, and acylation. Grignard reagents act as carbon nucleophiles and require dry conditions.",
    sourceAssetPath: "prompt-sources/organic-chemistry-reactions.pdf",
    coverImage: coverSvg("Organic Chemistry", "⚗️", "#0f3d2e", "#15803d", "#86efac"),
  },
  {
    id: "data-structures-algorithms",
    title: "Data Structures & Algorithms",
    description: "Arrays, trees, graphs, sorting, and Big-O at a glance.",
    category: "STEM",
    prompt: "Create a memory palace for fundamental data structures and algorithms. Cover arrays, linked lists, stacks, queues, hash tables, binary trees, heaps, graphs, and key algorithms (binary search, merge sort, quicksort, BFS, DFS, Dijkstra). Anchor Big-O complexities to each room.",
    topicContext: "Arrays provide O(1) index access but costly middle insertions. Linked lists trade random access for flexible insertions. Stacks and queues enforce LIFO and FIFO ordering. Hash tables target average O(1) lookup through key hashing. Trees model hierarchy; heaps optimize priority access; graphs represent arbitrary relationships. Core algorithms include binary search on sorted arrays, divide-and-conquer sorting like merge sort and quicksort, graph traversals BFS and DFS, and shortest path search with Dijkstra on non-negative weighted graphs.",
    sourceAssetPath: "prompt-sources/data-structures-algorithms.pdf",
    coverImage: coverSvg("Data Structures", "🧠", "#111827", "#2563eb", "#7dd3fc"),
  },
  {
    id: "newtonian-mechanics",
    title: "Newtonian Mechanics",
    description: "Forces, motion, energy, and momentum in vivid spatial form.",
    category: "STEM",
    prompt: "Build a memory palace for Newtonian mechanics. Cover Newton's three laws, kinematics equations, friction, circular motion, work-energy theorem, conservation of energy, impulse-momentum theorem, and rotational dynamics. Use intuitive physical scenarios in each room.",
    topicContext: "Newton's first law states objects maintain constant velocity unless acted on by a net force. The second law relates net force to mass and acceleration. The third law pairs forces in equal and opposite interactions. Kinematics links displacement, velocity, acceleration, and time under constant acceleration. Friction includes static and kinetic forms. Circular motion requires centripetal acceleration. Work changes energy, impulse changes momentum, and rotational motion uses torque, angular acceleration, and moment of inertia.",
    sourceAssetPath: "prompt-sources/newtonian-mechanics.pdf",
    coverImage: coverSvg("Mechanics", "🪐", "#172554", "#1d4ed8", "#93c5fd"),
  },

  // ── History (2) ──────────────────────────────────────────────────────────────
  {
    id: "ancient-rome-republic-empire",
    title: "Ancient Rome: Republic to Empire",
    description: "Key events, figures, and transitions from 509 BC to 476 AD.",
    category: "History",
    prompt: "Design a memory palace spanning Roman history from the founding of the Republic to the fall of the Western Empire. Include key events (Punic Wars, crossing the Rubicon, Pax Romana), pivotal figures (Cicero, Caesar, Augustus, Constantine), and structural shifts (Senate to Principate to Dominate).",
    topicContext: "Roman history can be framed through political transformation. The Republic begins after the fall of the monarchy, expands through conflict with neighboring peoples, and becomes a Mediterranean power after the Punic Wars. Late Republican instability features Marius, Sulla, Pompey, Cicero, and Julius Caesar. Augustus establishes the Principate and ushers in the Pax Romana. Later imperial history includes the Crisis of the Third Century, Diocletian's reforms, Constantine's Christian turn, and the eventual fall of the Western Empire in 476 AD.",
    sourceAssetPath: "prompt-sources/ancient-rome-republic-empire.pdf",
    coverImage: coverSvg("Ancient Rome", "🏛️", "#4a2c1d", "#a16207", "#fcd34d"),
  },
  {
    id: "french-revolution",
    title: "The French Revolution",
    description: "From the Estates-General to Napoleon's rise, in chronological rooms.",
    category: "History",
    prompt: "Create a memory palace for the French Revolution (1789–1799). Cover the Estates-General, storming of the Bastille, Declaration of the Rights of Man, Reign of Terror, Thermidorian Reaction, and the rise of Napoleon. Anchor key dates, figures, and causes in each room.",
    topicContext: "The French Revolution grew out of fiscal crisis, social inequality, Enlightenment influence, and political conflict. Key turning points include the calling of the Estates-General in 1789, the Tennis Court Oath, the storming of the Bastille, abolition of feudal privileges, and the Declaration of the Rights of Man and of the Citizen. Radicalization led to war, the execution of Louis XVI, and the Reign of Terror under Robespierre. The Thermidorian Reaction weakened the Jacobins, the Directory proved unstable, and Napoleon rose through military and political power.",
    sourceAssetPath: "prompt-sources/french-revolution.pdf",
    coverImage: coverSvg("French Revolution", "🗼", "#1e3a8a", "#dc2626", "#f8fafc"),
  },

  // ── Business (2) ─────────────────────────────────────────────────────────────
  {
    id: "microeconomics-principles",
    title: "Microeconomics Principles",
    description: "Supply, demand, elasticity, and market structures.",
    category: "Business",
    prompt: "Build a memory palace for microeconomics principles. Cover supply and demand curves, equilibrium, price elasticity, consumer and producer surplus, market structures (perfect competition, monopoly, oligopoly, monopolistic competition), and externalities. Visualize each concept as a distinct room.",
    topicContext: "Microeconomics studies how households and firms allocate scarce resources. Supply and demand determine equilibrium price and quantity. Elasticity measures responsiveness to price or income changes. Consumer surplus reflects value above price paid, while producer surplus reflects revenue above minimum acceptable price. Market structures differ by number of firms, barriers to entry, and pricing power. Externalities create spillover costs or benefits that can justify taxes, subsidies, or regulation.",
    sourceAssetPath: "prompt-sources/microeconomics-principles.pdf",
    coverImage: coverSvg("Microeconomics", "📈", "#1f2937", "#059669", "#a7f3d0"),
  },
  {
    id: "marketing-frameworks",
    title: "Marketing Frameworks",
    description: "The 4Ps, STP, SWOT, and Porter's Five Forces in one palace.",
    category: "Business",
    prompt: "Design a memory palace for key marketing frameworks. Include the 4Ps (Product, Price, Place, Promotion), STP (Segmentation, Targeting, Positioning), SWOT analysis, Porter's Five Forces, the customer journey funnel, and brand equity models. Each room should embody one framework.",
    topicContext: "The 4Ps help structure go-to-market thinking across product design, pricing, distribution, and promotion. STP breaks strategy into segmentation, targeting, and positioning. SWOT reviews internal strengths and weaknesses against external opportunities and threats. Porter's Five Forces evaluates rivalry, supplier power, buyer power, threat of substitutes, and threat of new entrants. The funnel models awareness through conversion and retention, while brand equity captures how perception and loyalty create long-term value.",
    sourceAssetPath: "prompt-sources/marketing-frameworks.pdf",
    coverImage: coverSvg("Marketing", "📣", "#4c1d95", "#c026d3", "#f5d0fe"),
  },

  // ── Arts & Humanities (2) ────────────────────────────────────────────────────
  {
    id: "renaissance-art-movements",
    title: "Renaissance Art Movements",
    description: "From Early Renaissance to Mannerism — artists, works, and techniques.",
    category: "Arts & Humanities",
    prompt: "Create a memory palace for Renaissance art movements. Cover Early Renaissance (Giotto, Brunelleschi), High Renaissance (da Vinci, Michelangelo, Raphael), and Mannerism (Pontormo, Parmigianino). Each room should feature a key work, the artist, and the defining technique or innovation.",
    topicContext: "Renaissance art emphasizes realism, perspective, anatomy, and renewed interest in classical antiquity. Early Renaissance figures such as Giotto and Brunelleschi laid foundations in naturalism and linear perspective. The High Renaissance reaches a synthesis of balance and mastery in artists like Leonardo da Vinci, Michelangelo, and Raphael. Mannerism departs from harmony toward elongated forms, unusual space, and stylized tension, visible in painters such as Pontormo and Parmigianino.",
    sourceAssetPath: "prompt-sources/renaissance-art-movements.pdf",
    coverImage: coverSvg("Renaissance Art", "🎨", "#3f2a1d", "#b45309", "#fdba74"),
  },
  {
    id: "classical-music-eras",
    title: "Classical Music Eras",
    description: "Baroque through Romantic — composers, forms, and defining works.",
    category: "Arts & Humanities",
    prompt: "Build a memory palace for classical music eras. Cover Baroque (Bach, Handel), Classical (Mozart, Haydn, Beethoven), and Romantic (Chopin, Tchaikovsky, Wagner). Each room should anchor a composer, a signature work, and the stylistic hallmarks of the era.",
    topicContext: "Baroque music is characterized by ornate texture, basso continuo, and contrapuntal writing, with composers such as Bach and Handel. The Classical era emphasizes clarity, balance, and formal development in symphony, sonata, and string quartet, associated with Haydn, Mozart, and early Beethoven. Romantic music expands emotional intensity, orchestral color, and expressive range, with composers including Chopin, Tchaikovsky, and Wagner.",
    sourceAssetPath: "prompt-sources/classical-music-eras.pdf",
    coverImage: coverSvg("Classical Music", "🎼", "#1f2937", "#7c3aed", "#c4b5fd"),
  },

  // ── Fun (3) ──────────────────────────────────────────────────────────────────
  {
    id: "world-capitals-challenge",
    title: "World Capitals Challenge",
    description: "Memorize every world capital with geographic memory hooks.",
    category: "Fun",
    prompt: "Design a memory palace for world capitals. Organize by continent (Europe, Asia, Africa, Americas, Oceania) with each room representing a region. Use vivid geographic and cultural imagery to anchor each country-capital pair. Aim to cover at least 50 countries.",
    topicContext: "A capitals study set works best when grouped by region. Europe includes examples like France-Paris, Italy-Rome, and Spain-Madrid. Asia includes Japan-Tokyo, China-Beijing, and India-New Delhi. Africa includes Egypt-Cairo, Kenya-Nairobi, and South Africa's administrative capitals. The Americas include Canada-Ottawa, the United States-Washington, D.C., Brazil-Brasilia, and Argentina-Buenos Aires. Oceania includes Australia-Canberra and New Zealand-Wellington.",
    sourceAssetPath: "prompt-sources/world-capitals-challenge.pdf",
    coverImage: coverSvg("World Capitals", "🌍", "#0f766e", "#0ea5e9", "#99f6e4"),
  },
  {
    id: "mythology-creatures",
    title: "Mythology Creatures",
    description: "Dragons, chimeras, and krakens from myths around the world.",
    category: "Fun",
    prompt: "Create a memory palace for mythological creatures from world cultures. Include Greek (Minotaur, Hydra, Cerberus), Norse (Fenrir, Jörmungandr), Egyptian (Sphinx, Ammit), Asian (Dragon Kings, Kitsune), and others. Each room should capture the creature's origin myth, abilities, and cultural significance.",
    topicContext: "Mythological creatures encode cultural fears, values, and cosmology. Greek myth includes the labyrinth-bound Minotaur, the multi-headed Hydra, and Cerberus guarding the underworld. Norse tradition includes Fenrir, the wolf tied to Ragnarok, and Jormungandr, the world serpent. Egyptian lore includes the Sphinx as guardian and Ammit as devourer of the unworthy dead. East Asian traditions include dragon rulers associated with water and fox spirits like kitsune with shapeshifting intelligence.",
    sourceAssetPath: "prompt-sources/mythology-creatures.pdf",
    coverImage: coverSvg("Mythology", "🐉", "#3f1d4f", "#7e22ce", "#f0abfc"),
  },
  {
    id: "solar-system",
    title: "The Solar System",
    description: "Planets, moons, and key facts in an orbital memory palace.",
    category: "Fun",
    prompt: "Build a memory palace for the solar system. Cover the eight planets in order, their key moons, distinguishing features (size, atmosphere, rings), dwarf planets (Pluto, Ceres, Eris), and the asteroid and Kuiper belts. Each room should represent one celestial body with vivid spatial imagery.",
    topicContext: "The solar system begins with the rocky inner planets Mercury, Venus, Earth, and Mars, followed by the gas and ice giants Jupiter, Saturn, Uranus, and Neptune. Distinguishing features include Mercury's cratered surface, Venus's dense atmosphere, Earth's liquid water, Mars's red iron-rich terrain, Jupiter's Great Red Spot, Saturn's rings, Uranus's axial tilt, and Neptune's strong winds. Important moons include Earth's Moon, the Galilean moons, Titan, and Triton. Dwarf planets and small-body regions include Ceres in the asteroid belt and Pluto and Eris in the Kuiper Belt region.",
    sourceAssetPath: "prompt-sources/solar-system.pdf",
    coverImage: coverSvg("Solar System", "☀️", "#422006", "#ea580c", "#fdba74"),
  },
]
