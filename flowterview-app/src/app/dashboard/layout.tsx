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
import { useAuthStore } from "../../../store";
import CompanySetupModal from "@/components/CompanySetupModal";
import { Loader2 } from "lucide-react";

import { useAuth, useInterviewDetails } from "@/hooks/useStores";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Use TanStack Query auth for authentication state and user data
  const { user, organization, isLoading: authLoading } = useAuth();
  const isLoading = authLoading;
  const { showCompanySetupModal, setShowCompanySetupModal } = useAuthStore();

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Extract interviewId for use in breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean);
  const interviewId =
    pathSegments[1] === "interviews" &&
    pathSegments[2] &&
    isValidUUID(pathSegments[2])
      ? pathSegments[2]
      : undefined;

  // Use TanStack Query for interview details when needed
  const { interviewDetails } = useInterviewDetails(interviewId || "");

  // Generate breadcrumb items based on pathname - memoized to update when data changes
  const breadcrumbs = useMemo(() => {
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
            if (interviewDetails?.title) {
              label = interviewDetails.title;
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
          isCurrent: pathname === fullPath,
        });
      }
    }

    return breadcrumbs;
  }, [pathname, pathSegments, interviewDetails]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && user.role === "candidate") {
      router.push("/dashboard/candidate");
    }
  }, [user, router]);

  // Helper function to handle organization update completion
  const handleCompanySetupCompleted = async () => {
    // Close the modal
    setShowCompanySetupModal(false);

    // Refetch user and organization data to get latest info
    // This will be handled automatically by TanStack Query
  };

  // Helper function to handle organization setup cancel
  const handleCompanySetupCancel = () => {
    setShowCompanySetupModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div
          className="flex flex-col items-center gap-2"
          style={{
            fontFamily: "KyivType Sans",
          }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-app-blue-300" />
          <p className="text-xs text-app-blue-600 dark:text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width-icon": "4.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <div>
          <header className="flex h-15 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-15">
            <div className="flex items-center gap-1 px-4">
              <SidebarTrigger className="-ml-1 cursor-pointer z-100" />
              <Separator orientation="vertical" className="h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((breadcrumb, index) => (
                    <div key={breadcrumb.href} className="flex items-center">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {breadcrumb.isCurrent ? (
                          <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link href={breadcrumb.href}>
                              {breadcrumb.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
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
      <Toaster />
    </SidebarProvider>
  );
}
