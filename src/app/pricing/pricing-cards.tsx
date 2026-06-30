"use client";

import { useState, useEffect } from "react";

type BillingInfo = {
  plan: string;
  status: string;
};

const CANDIDATE_TIERS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Get started with your job search",
    features: [
      "Public profile & case studies",
      "3 express interests per week",
      "5 AI generations",
      "3 case studies",
      "Basic match scoring",
      "Application pipeline",
    ],
    cta: "Current Plan",
  },
  {
    id: "pro",
    name: "Pro",
    price: 19,
    description: "Serious job seekers who want every advantage",
    features: [
      "Everything in Free",
      "Unlimited express interests",
      "Unlimited AI generations",
      "Unlimited case studies",
      "Advanced analytics & insights",
      "AI interview prep",
      "Priority in matching",
      "Fit narrative generation",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
];

const COMPANY_TIERS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Claim your company page",
    features: [
      "Company profile page",
      "1 structured role",
      "View candidate interest",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    description: "Active hiring teams",
    features: [
      "Everything in Free",
      "5 active structured roles",
      "20 introduction credits/mo",
      "Company analytics",
      "Team case studies",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    description: "Scale your hiring pipeline",
    features: [
      "Everything in Pro",
      "Unlimited roles",
      "Unlimited introductions",
      "API access",
      "Priority support",
    ],
  },
];

export function PricingCards() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((d) => { setBilling(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleUpgrade(plan: string) {
    setUpgrading(true);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const data = await res.json();
      setBilling({ plan: data.plan, status: data.status });
    }
    setUpgrading(false);
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>;

  return (
    <div className="space-y-12">
      {/* Candidate Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">For Candidates</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
          {CANDIDATE_TIERS.map((tier) => {
            const isCurrent = billing?.plan === tier.id;
            return (
              <div
                key={tier.id}
                className={`rounded-lg border-2 p-6 ${
                  tier.highlighted ? "border-blue-500 shadow-lg" : "border-gray-200"
                }`}
              >
                {tier.highlighted && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 mb-3">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">${tier.price}</span>
                  {tier.price > 0 && <span className="text-gray-500">/month</span>}
                </div>
                <p className="text-sm text-gray-500 mt-2">{tier.description}</p>
                <ul className="mt-6 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && handleUpgrade(tier.id)}
                  disabled={isCurrent || upgrading}
                  className={`mt-6 w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                    isCurrent
                      ? "bg-gray-100 text-gray-500 cursor-default"
                      : tier.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "bg-gray-900 text-white hover:bg-gray-700"
                  } disabled:opacity-50`}
                >
                  {isCurrent ? "Current Plan" : upgrading ? "..." : tier.cta || `Get ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Company Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">For Companies</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
          {COMPANY_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-lg border-2 p-6 ${
                tier.highlighted ? "border-blue-500 shadow-lg" : "border-gray-200"
              }`}
            >
              {tier.highlighted && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 mb-3">
                  Recommended
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">${tier.price}</span>
                {tier.price > 0 && <span className="text-gray-500">/month</span>}
              </div>
              <p className="text-sm text-gray-500 mt-2">{tier.description}</p>
              <ul className="mt-6 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="mt-6 w-full rounded-md bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-500"
              >
                Contact Sales
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
