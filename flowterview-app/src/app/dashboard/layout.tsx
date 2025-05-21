"use client";

import { useState, ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "react-hot-toast";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Check for authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        // Not authenticated, redirect to login
        router.push("/auth/login");
        return;
      }

      // Set user name/email
      setUserName(data.session.user?.email || "User");
    };

    checkAuth();
  }, [router]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Interviews", href: "/dashboard/interviews", icon: FileText },
    { name: "Candidates", href: "/dashboard/candidates", icon: Users },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
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
          <div className="text-2xl font-medium tracking-widest bg-gradient-to-br from-indigo-400/50 via-indigo-600/70 to-indigo-800 text-transparent bg-clip-text dark:from-indigo-200 dark:via-blue-400 dark:to-white">
            FLOWTERVIEW
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
                    ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                } group mb-1 flex items-center rounded-md p-4 text-sm font-medium`}
              >
                <item.icon
                  className={`${
                    pathname === item.href
                      ? "text-indigo-600 dark:text-indigo-300"
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
                <div className="flex-shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900 p-3">
                  <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm font-light text-gray-800 dark:text-gray-200">{userName}</p>
                </div>
              </div>
            </Card>
            <Button
              onClick={handleSignOut}
              className="flex w-full h-13 items-center px-2 py-2 text-sm font-medium cursor-pointer border-l-none border-r-none border-b-none border-t rounded-none p-3 hover:bg-red-50 dark:hover:bg-red-900 dark:text-gray-200"
              variant="outline"
            >
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
