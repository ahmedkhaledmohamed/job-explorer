export type PlanFeatures = {
  intros_per_week: number;
  advanced_analytics: boolean;
  interview_prep: boolean;
  priority_matching: boolean;
  ai_generations: number;
  case_studies: number;
};

export const CANDIDATE_PLANS: Record<string, { name: string; price: number; features: PlanFeatures; stripe_price_id?: string }> = {
  free: {
    name: "Free",
    price: 0,
    features: {
      intros_per_week: 3,
      advanced_analytics: false,
      interview_prep: false,
      priority_matching: false,
      ai_generations: 5,
      case_studies: 3,
    },
  },
  pro: {
    name: "Pro",
    price: 19,
    stripe_price_id: process.env.STRIPE_CANDIDATE_PRO_PRICE_ID || "",
    features: {
      intros_per_week: -1,
      advanced_analytics: true,
      interview_prep: true,
      priority_matching: true,
      ai_generations: -1,
      case_studies: -1,
    },
  },
};

export const COMPANY_PLANS: Record<string, { name: string; price: number; features: { active_roles: number; intro_credits: number; analytics: boolean; api_access: boolean }; stripe_price_id?: string }> = {
  free: {
    name: "Free",
    price: 0,
    features: { active_roles: 1, intro_credits: 0, analytics: false, api_access: false },
  },
  pro: {
    name: "Pro",
    price: 99,
    stripe_price_id: process.env.STRIPE_COMPANY_PRO_PRICE_ID || "",
    features: { active_roles: 5, intro_credits: 20, analytics: true, api_access: false },
  },
  enterprise: {
    name: "Enterprise",
    price: 499,
    stripe_price_id: process.env.STRIPE_COMPANY_ENTERPRISE_PRICE_ID || "",
    features: { active_roles: -1, intro_credits: -1, analytics: true, api_access: true },
  },
};

export function formatLimit(n: number): string {
  return n === -1 ? "Unlimited" : String(n);
}
