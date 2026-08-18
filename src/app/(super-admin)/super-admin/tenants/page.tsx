import { getTenants, getPlansForDropdown } from './actions';
import { TenantsClient } from './tenants-client';

export default async function TenantsPage() {
  const [{ tenants }, plans] = await Promise.all([
    getTenants(),
    getPlansForDropdown(),
  ]);

  return <TenantsClient tenants={tenants} plans={plans} />;
}
