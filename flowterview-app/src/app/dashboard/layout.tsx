"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "react-hot-toast";
import { useAuthStore, useInterviewsStore } from "../../../store";
import CompanySetupModal from "@/components/CompanySetupModal";
import { Loader2 } from "lucide-react";

import { useAuth, useAppLoadingState } from "@/hooks/useStores";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Use auth for authentication state and user data
  const { user, organization, isLoading: authLoading } = useAuth();
  const { stage, isLoading: appLoading } = useAppLoadingState();
  const isLoading = authLoading || appLoading;
  const { showCompanySetupModal, setShowCompanySetupModal } = useAuthStore();
  const { getInterviewDetails, fetchInterviewDetails } = useInterviewsStore();

  // Fetch interview details if we're on an interview page
  useEffect(() => {
    const pathSegments = pathname.split("/").filter(Boolean);
    if (pathSegments[1] === "interviews" && pathSegments[2]) {
      const interviewId = pathSegments[2];
      // Only fetch if it's a valid UUID (actual interview ID)
      if (isValidUUID(interviewId)) {
        fetchInterviewDetails(interviewId);
      }
    }
  }, [pathname, fetchInterviewDetails]);

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Generate breadcrumb items based on pathname - memoized to update when data changes
  const breadcrumbs = useMemo(() => {
    const pathSegments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [];

    // Always start with Dashboard
    breadcrumbs.push({
      label: "Dashboard",
      href: "/dashboard",
      isCurrent: pathname === "/dashboard",
    });

    // Add subsequent segments
    if (pathSegments.length > 1) {
      let currentPath = "";
      for (let i = 1; i < pathSegments.length; i++) {
        currentPath += `/${pathSegments[i]}`;
        const fullPath = `/dashboard${currentPath}`;
        const isLast = i === pathSegments.length - 1;

        let label = pathSegments[i]
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // Special handling for interview details page
        if (pathSegments[i - 1] === "interviews" && isLast) {
          // Check if this is a UUID (interview ID) or a route path
          if (isValidUUID(pathSegments[i])) {
            // This is an interview ID, try to get the interview title
            const interviewDetails = getInterviewDetails(pathSegments[i]);
            if (interviewDetails?.job?.title) {
              label = interviewDetails.job.title;
            } else {
              // Fallback to a more user-friendly format of the ID
              label = "Interview";
            }
          } else {
            // This is a route path, format it nicely
            label = pathSegments[i]
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
          }
        }

        breadcrumbs.push({
          label,
          href: fullPath,
          isCurrent: isLast,
        });
      }
    }

    return breadcrumbs;
  }, [pathname, getInterviewDetails(pathname.split("/")[2] || "")]);

  const handleCompanySetupCompleted = async () => {
    setShowCompanySetupModal(false);
    // Refresh organization data after setup
    if (user?.organization_id) {
      // Organization will be refetched automatically through auth hooks
    }
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
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white dark:bg-gray-950">
          <SidebarTrigger className="-ml-1 cursor-pointer" />
          <Separator orientation="vertical" className="!h-6 mx-2" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  <BreadcrumbItem>
                    {crumb.isCurrent ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && (
                    <BreadcrumbSeparator key={`separator-${index}`} />
                  )}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
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
