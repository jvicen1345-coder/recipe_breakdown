// The hardcoded "girl dinner energy" staples — always shown in Girl Dinner mode
// regardless of how many saved recipes match, per the spec.
export interface GirlDinnerStaple {
  emoji: string;
  name: string;
  line: string;
}

const ONE_LINERS = ["no explanation needed", "girlies know", "it just makes sense"];

const STAPLE_NAMES: { emoji: string; name: string }[] = [
  { emoji: "🧀", name: "Charcuterie board" },
  { emoji: "🫙", name: "Crackers and hummus" },
  { emoji: "🐟", name: "Smoked salmon on cream cheese" },
  { emoji: "🍇", name: "Frozen grapes and brie" },
  { emoji: "🥒", name: "Pickles, olives, deli meat situation" },
  { emoji: "🥚", name: "A single perfect soft boiled egg" },
  { emoji: "🌸", name: "That random leftover situation" },
  { emoji: "🥣", name: "Cereal but make it aesthetic" },
];

export const GIRL_DINNER_STAPLES: GirlDinnerStaple[] = STAPLE_NAMES.map((s, i) => ({
  ...s,
  line: ONE_LINERS[i % ONE_LINERS.length],
}));
