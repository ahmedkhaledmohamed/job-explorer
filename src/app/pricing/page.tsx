import { Nav } from "@/components/nav";
import { PricingCards } from "./pricing-cards";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Pricing</h1>
          <p className="text-gray-500 mt-2">
            Free to start. Upgrade when you need more.
          </p>
        </div>
        <PricingCards />
      </main>
    </div>
  );
}
