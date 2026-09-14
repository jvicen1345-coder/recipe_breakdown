export interface DetectedTimer {
  minutes: number;
  label: string;
}

// Looks for a duration mentioned in an instruction step ("cook for 6-7 minutes",
// "simmer for 20 minutes", "bake for 1 hour") so Cook Mode can offer to start a
// timer for it. A range averages its two ends; hours convert to minutes.
export function detectTimer(stepText: string): DetectedTimer | null {
  const rangeMatch = stepText.match(/(\d+)\s*(?:-|–|to)\s*(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    const unit = rangeMatch[3].toLowerCase();
    const avgMinutes = Math.round((a + b) / 2);
    return { minutes: unit.startsWith("h") ? avgMinutes * 60 : avgMinutes, label: rangeMatch[0] };
  }

  const singleMatch = stepText.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (singleMatch) {
    const n = Number(singleMatch[1]);
    const unit = singleMatch[2].toLowerCase();
    return { minutes: unit.startsWith("h") ? n * 60 : n, label: singleMatch[0] };
  }

  return null;
}
