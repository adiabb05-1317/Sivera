"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart,
  LogOut,
  X,
  Loader,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "react-hot-toast";
import { ModeToggle } from "@/components/dark-mode-toggle";
import { useAuth, useAppLoadingState } from "@/hooks/useStores";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Use auth for authentication state and user data
  const { user, logout } = useAuth();

  // Use comprehensive app loading state that accounts for all stores
  const { isLoading, stage } = useAppLoadingState();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Interviews", href: "/dashboard/interviews", icon: FileText },
    { name: "Candidates", href: "/dashboard/candidates", icon: Users },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart },
  ];

  const handleSignOut = async () => {
    console.log("User clicked sign out");

    try {
      // 1. Supabase logout
      const { logout: supabaseLogout } = await import("@/lib/auth-client");
      await supabaseLogout();

      // 2. Clear our auth store
      logout();

      // 3. Redirect
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even on error
      router.push("/auth/login");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster
        position="top-right"
        toastOptions={{
          success: { duration: 3000 },
          error: { duration: 4000 },
          style: {
            background: "#F9FAFB",
            color: "#111827",
            border: "1px solid #E5E7EB",
          },
        }}
      />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white dark:bg-gray-950 shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-center border-b border-gray-200 dark:border-gray-800 px-4">
          <div
            className="text-2xl font-medium tracking-widest bg-gradient-to-br from-app-blue-400/50 via-app-blue-600/70 to-app-blue-8/00 text-transparent bg-clip-text dark:from-app-blue-2/00 dark:via-blue-400 dark:to-white font-kyiv"
            style={{
              fontFamily: "KyivType Sans",
            }}
          >
            SIVERA
          </div>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6 text-gray-500 dark:text-gray-300" />
          </button>
        </div>
        <div className="flex h-[calc(100%-4rem)] flex-col justify-between">
          <nav className="flex flex-col mt-5 px-2 gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  pathname === item.href
                    ? "bg-app-blue-50 dark:bg-app-blue-900/40 text-app-blue-6/00 dark:text-app-blue-3/00"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                } group mb-1 flex items-center rounded-md p-4 text-sm font-medium`}
              >
                <item.icon
                  className={`${
                    pathname === item.href
                      ? "text-app-blue-6/00 dark:text-app-blue-3/00"
                      : "text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                  } mr-3 h-5 w-5 flex-shrink-0`}
                />
                {item.name}
              </Link>
            ))}
          </nav>
          <div>
            <Card className="flex items-center p-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl border-b-0 border-r-0 border-l-0 rounded-br-none rounded-bl-none m-0">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 rounded-full bg-app-blue-1/00 dark:bg-app-blue-9/00 p-3">
                  <Users className="h-6 w-6 text-app-blue-6/00 dark:text-app-blue-3/00" />
                </div>
                <div>
                  <p className="text-sm font-light text-gray-800 dark:text-gray-200">
                    {user?.email || "Loading..."}
                  </p>
                </div>
              </div>
            </Card>
            <div className="flex w-full">
              <Button
                onClick={handleSignOut}
                className="flex-1 h-13 items-center px-2 py-2 text-sm font-medium cursor-pointer border-l-none border-r-none border-b-none border-t rounded-none p-3 hover:bg-red-50 dark:hover:bg-red-900 dark:text-gray-200"
                variant="outline"
              >
                <LogOut />
                <span className="ml-2">Sign out</span>
              </Button>
              <div className="flex-shrink-0">
                {/* Theme toggle button */}
                <ModeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-app-blue-300" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stage === "auth"
                  ? "Authenticating..."
                  : "Loading dashboard data..."}
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
