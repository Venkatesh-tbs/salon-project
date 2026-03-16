import { StaffManager } from "@/components/admin/StaffManager";

export default function AdminStaffPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight glow-text pb-1">Staff Management</h2>
        <p className="text-sm text-zinc-400 mt-1">Manage staff members and their profiles.</p>
      </div>

      <StaffManager />
    </div>
  );
}
