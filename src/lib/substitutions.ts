export interface Substitution {
  name: string;
  note: string;
  dietTag?: string;
}

interface SubstitutionEntry {
  keywords: string[];
  subs: Substitution[];
}

const SUBSTITUTION_TABLE: SubstitutionEntry[] = [
  {
    keywords: ["heavy cream"],
    subs: [
      { name: "Coconut cream", note: "Adds a subtle coconut flavor, still rich", dietTag: "Dairy-free" },
      { name: "Half and half", note: "Slightly lighter, less rich" },
      { name: "Greek yogurt", note: "Tangier, adds a protein boost" },
    ],
  },
  {
    keywords: ["butter"],
    subs: [
      { name: "Olive oil", note: "Lighter and more savory" },
      { name: "Coconut oil", note: "Hint of coconut flavor", dietTag: "Dairy-free" },
      { name: "Vegan butter", note: "Nearly identical texture and taste", dietTag: "Vegan" },
    ],
  },
  {
    keywords: ["chicken"],
    subs: [
      { name: "Tofu", note: "Soaks up marinade well — press it dry first", dietTag: "Vegan" },
      { name: "Chickpeas", note: "Heartier bite, adds fiber", dietTag: "Vegan" },
      { name: "Cauliflower", note: "Milder flavor, roasts up nicely", dietTag: "Vegan" },
    ],
  },
  {
    keywords: ["parmesan"],
    subs: [
      { name: "Nutritional yeast", note: "Nutty, cheesy flavor with no dairy", dietTag: "Vegan" },
      { name: "Pecorino", note: "Sharper, saltier bite" },
      { name: "Grana Padano", note: "Milder and slightly sweeter" },
    ],
  },
  {
    keywords: ["pasta"],
    subs: [
      { name: "Zucchini noodles", note: "Lighter, lower carb" },
      { name: "Gluten-free pasta", note: "Same texture, no gluten" },
      { name: "Rice", note: "Different texture, still a great base" },
    ],
  },
  {
    keywords: ["egg"],
    subs: [
      { name: "Flax egg", note: "1 tbsp ground flax + 3 tbsp water — great binder", dietTag: "Vegan" },
      { name: "Applesauce", note: "Adds moisture and a touch of sweetness", dietTag: "Vegan" },
      { name: "Aquafaba", note: "Chickpea brine — whips up like egg whites", dietTag: "Vegan" },
    ],
  },
  {
    keywords: ["milk"],
    subs: [
      { name: "Oat milk", note: "Naturally sweet, creamy texture", dietTag: "Dairy-free" },
      { name: "Almond milk", note: "Lighter with a nutty flavor", dietTag: "Dairy-free" },
      { name: "Soy milk", note: "Closest protein content to dairy milk", dietTag: "Dairy-free" },
    ],
  },
  {
    keywords: ["all-purpose flour", "all purpose flour", "flour"],
    subs: [
      { name: "Almond flour", note: "Denser crumb, lower carb" },
      { name: "Oat flour", note: "Slightly sweet, soft texture" },
      { name: "Gluten-free blend", note: "Closest 1:1 swap for texture" },
    ],
  },
];

export function findSubstitutions(ingredientItem: string): Substitution[] | null {
  const norm = ingredientItem.toLowerCase();
  for (const entry of SUBSTITUTION_TABLE) {
    if (entry.keywords.some((keyword) => norm.includes(keyword))) {
      return entry.subs;
    }
  }
  return null;
}
