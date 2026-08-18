import { getPlans } from './actions';
import PlansClient from './plans-client';

export default async function PlansPage() {
  const { plans, error } = await getPlans();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Subscription Plans</h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage pricing tiers, per-platform message limits, and AI feature toggles.
          </p>
        </div>
        <span className="text-xs text-gray-500 font-mono">{plans.length} plans</span>
      </div>

      {error ? (
        <div className="p-4 text-center text-rose-400 text-sm bg-rose-950/20 border border-rose-900/30 rounded-lg">
          Failed to load plans: {error}
        </div>
      ) : (
        <PlansClient plans={plans} />
      )}
    </div>
  );
}
