/**
 * Risk scoring thresholds and constants
 */

export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 70,
} as const;

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type RiskLevel = typeof RISK_LEVELS[keyof typeof RISK_LEVELS];

/**
 * Get risk level based on risk score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score < RISK_THRESHOLDS.LOW) return RISK_LEVELS.LOW;
  if (score < RISK_THRESHOLDS.MEDIUM) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.HIGH;
}

/**
 * Get risk level color
 */
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case RISK_LEVELS.LOW:
      return 'hsl(142, 76%, 36%)'; // green
    case RISK_LEVELS.MEDIUM:
      return 'hsl(48, 96%, 53%)'; // yellow
    case RISK_LEVELS.HIGH:
      return 'hsl(0, 84%, 60%)'; // red
    default:
      return 'hsl(var(--muted))';
  }
}

/**
 * Filter value range constants
 */
export const VALUE_RANGE = {
  MIN: 0,
  MAX: 10000000, // 10M RON
  STEP: 100000,  // 100K RON
} as const;
