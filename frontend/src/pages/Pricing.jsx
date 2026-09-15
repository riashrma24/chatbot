import { useEffect, useState } from "react";
import { getPageContent } from "../api";

function formatPrice(plan) {
  if (plan.isCustomPricing) return "Custom";
  return `$${(plan.priceCents / 100).toFixed(0)}/${plan.billingPeriod}`;
}

function formatQuota(plan) {
  if (plan.messagesPerMonth == null) return "Unlimited messages";
  return `${plan.messagesPerMonth.toLocaleString()} messages/${plan.billingPeriod}`;
}

function Pricing() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    getPageContent("pricing").then((data) => setPlans(data.plans || []));
  }, []);

  return (
    <section>
      <h1>Pricing</h1>
      <ul>
        {plans.map((plan) => (
          <li key={plan.name}>
            <strong>{plan.name}</strong> — {formatPrice(plan)}, {formatQuota(plan)}
            {plan.features && <> ({plan.features})</>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Pricing;
