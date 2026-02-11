import { DashboardView } from "@/features/admin/components/DashboardView";

export default function AdminPage() {
    return (
        <div className="hidden flex-col md:flex">
            <div className="border-b">
                <div className="flex h-16 items-center px-4">
                    <h1 className="text-lg font-bold">Admin Panel</h1>
                </div>
            </div>
            <DashboardView />
        </div>
    );
}
