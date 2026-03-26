export const DAILY_RATE_LIMITS = {
  FREE: 50,
  PRO: 1000,
  PREMIUM: 5000,
} as const;

export type PlanName = keyof typeof DAILY_RATE_LIMITS;
