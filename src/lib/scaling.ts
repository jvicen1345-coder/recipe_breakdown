// Scales an ingredient quantity string (e.g. "2 cups", "1/2 tsp", "1.5 lb") by a
// ratio for the servings adjuster. Best-effort: quantities with no leading number
// ("a pinch", "to taste") are returned unchanged.

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const NICE_FRACTIONS: [number, string][] = [
  [0.125, "1/8"],
  [0.25, "1/4"],
  [1 / 3, "1/3"],
  [0.375, "3/8"],
  [0.5, "1/2"],
  [0.625, "5/8"],
  [2 / 3, "2/3"],
  [0.75, "3/4"],
  [0.875, "7/8"],
];

function parseLeadingNumber(text: string): { value: number; rest: string } | null {
  const unicodeFractionChars = Object.keys(UNICODE_FRACTIONS).join("");

  let match = text.match(new RegExp(`^(\\d+)?\\s*([${unicodeFractionChars}])(.*)$`));
  if (match) {
    const whole = match[1] ? parseInt(match[1], 10) : 0;
    const frac = UNICODE_FRACTIONS[match[2]] ?? 0;
    return { value: whole + frac, rest: match[3] };
  }

  match = text.match(/^(\d+)\s+(\d+)\/(\d+)(.*)$/);
  if (match) {
    const whole = parseInt(match[1], 10);
    const num = parseInt(match[2], 10);
    const den = parseInt(match[3], 10);
    return { value: whole + num / den, rest: match[4] };
  }

  match = text.match(/^(\d+)\/(\d+)(.*)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    const den = parseInt(match[2], 10);
    return { value: num / den, rest: match[3] };
  }

  match = text.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (match) {
    return { value: parseFloat(match[1]), rest: match[2] };
  }

  return null;
}

function formatScaledNumber(value: number): string {
  if (value <= 0) return "0";
  const whole = Math.floor(value);
  const frac = value - whole;

  if (frac < 0.02) {
    return whole > 0 ? `${whole}` : value.toFixed(2).replace(/\.?0+$/, "");
  }

  for (const [fracValue, label] of NICE_FRACTIONS) {
    if (Math.abs(frac - fracValue) < 0.03) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }

  const rounded = Math.round(value * 100) / 100;
  return rounded.toString();
}

export function scaleQuantity(quantity: string | null, ratio: number): string | null {
  if (!quantity || ratio === 1 || !Number.isFinite(ratio)) return quantity;
  const trimmed = quantity.trim();

  const range = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)(.*)$/);
  if (range) {
    const low = formatScaledNumber(parseFloat(range[1]) * ratio);
    const high = formatScaledNumber(parseFloat(range[2]) * ratio);
    return `${low}-${high}${range[3]}`;
  }

  const parsed = parseLeadingNumber(trimmed);
  if (!parsed) return quantity;
  return `${formatScaledNumber(parsed.value * ratio)}${parsed.rest}`;
}
