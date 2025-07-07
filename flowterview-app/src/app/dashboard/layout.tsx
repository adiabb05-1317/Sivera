"use client";

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast";
import CompanySetupModal from "@/components/CompanySetupModal";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { useAuth, useAppLoadingState } from "@/hooks/useStores";
import { useAuthStore } from "../../../store";
import { Separator } from "@/components/ui/separator";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();

  // Use auth for authentication state and user data
  const { user } = useAuth();

  // Get auth store for modal state and organization data
  const {
    organization,
    showCompanySetupModal,
    setShowCompanySetupModal,
    fetchOrganization,
  } = useAuthStore();

  // Use comprehensive app loading state that accounts for all stores
  const { isLoading, stage } = useAppLoadingState();

  const handleCompanySetupCompleted = async () => {
    // Refresh organization data
    await fetchOrganization();
    // Hide the modal
    setShowCompanySetupModal(false);
  };

  const handleCompanySetupCancel = () => {
    // Simply hide the modal without refreshing data
    setShowCompanySetupModal(false);
  };

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "4.5rem",
        } as React.CSSProperties
      }
    >
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

      {/* Company Setup Modal */}
      {showCompanySetupModal && user?.organization_id && (
        <CompanySetupModal
          open={showCompanySetupModal}
          organizationId={user.organization_id}
          onCompleted={handleCompanySetupCompleted}
          onCancel={handleCompanySetupCancel}
          isEditing={!!organization?.name}
          existingName={organization?.name || ""}
          existingLogoUrl={organization?.logo_url || ""}
        />
      )}

      <AppSidebar />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 cursor-pointer" />
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          {isLoading ? (
            <div
              className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4 gap-2"
              style={{
                fontFamily: "KyivType Sans",
              }}
            >
              <Loader2 className="h-8 w-8 animate-spin text-app-blue-300 opacity-70" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {stage === "auth"
                  ? "Authenticating..."
                  : "Loading dashboard data..."}
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
