import HubstaffUserManagement from '@/components/hubstaff-user-management';
import HubstaffTokenStatus from '@/components/hubstaff-token-status';
import HubstaffTokenHelp from '@/components/hubstaff-token-help';

export default function HubstaffManagementPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HubstaffUserManagement />
        </div>
        <div className="space-y-6">
          <HubstaffTokenStatus />
          <HubstaffTokenHelp />
        </div>
      </div>
    </div>
  );
}
