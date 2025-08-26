import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <div className="lg:ml-64 bg-white border-b border-gray-200 lg:hidden" data-testid="navbar">
      {/* This component is primarily for mobile view since sidebar handles desktop navigation */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Welcome back, {user?.firstName || 'User'}
          </div>
        </div>
      </div>
    </div>
  );
}
