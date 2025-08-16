"use client";

import { useEffect, useMemo } from "react";
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
import UserSetupModal from "@/components/UserSetupModal";
import { Loader2 } from "lucide-react";

import {
  useAuth,
  useInterviewDetails,
  useCandidates,
  useJobs,
} from "@/hooks/useStores";
import { invalidateRelatedQueries } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Use TanStack Query auth for authentication state and user data
  const { user, organization, isLoading: authLoading, isAuthenticated } = useAuth();
  const isLoading = authLoading;
  const queryClient = useQueryClient();
  const {
    showCompanySetupModal,
    setShowCompanySetupModal,
    showUserSetupModal,
    setShowUserSetupModal,
  } = useAuthStore();

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (str: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Extract IDs for use in breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean);
  const interviewId =
    pathSegments[1] === "interviews" &&
    pathSegments[2] &&
    isValidUUID(pathSegments[2])
      ? pathSegments[2]
      : undefined;

  // Extract candidate analytics IDs
  const candidateAnalyticsJobId =
    pathSegments[1] === "analytics" &&
    pathSegments[2] &&
    isValidUUID(pathSegments[2])
      ? pathSegments[2]
      : undefined;

  const candidateAnalyticsCandidateId =
    pathSegments[1] === "analytics" &&
    pathSegments[3] &&
    isValidUUID(pathSegments[3])
      ? pathSegments[3]
      : undefined;

  // Use TanStack Query for interview details when needed
  const { interviewDetails } = useInterviewDetails(interviewId || "");

  // Use hooks for candidate and job details when needed for breadcrumbs
  const { getCandidateById, isLoading: candidatesLoading } = useCandidates();
  const { getJobById, isLoading: jobsLoading } = useJobs();

  // Always try to get the details if we have IDs, regardless of loading state
  const candidateDetails = getCandidateById(
    candidateAnalyticsCandidateId ?? ""
  );
  const jobDetails = getJobById(candidateAnalyticsJobId ?? "");

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

        let label = pathSegments[i]
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // Special handling for interview details page
        if (pathSegments[1] === "interviews") {
          // Check if this is a UUID (interview ID) or a route path
          if (isValidUUID(pathSegments[i])) {
            // This is an interview ID, try to get the interview title
            if (interviewDetails?.job.title) {
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

        if (pathSegments[1] === "analytics") {
          if (i === 2 && isValidUUID(pathSegments[i])) {
            // Job ID segment - use actual job title if available
            if (jobDetails?.title) {
              label = jobDetails.title;
            } else {
              label = "Job"; // Fallback while loading
            }
          } else if (i === 3 && isValidUUID(pathSegments[i])) {
            console.log(candidateDetails);
            if (candidateDetails?.name) {
              label = candidateDetails.name;
            } else {
              label = "Candidate"; // Fallback while loading
            }
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
  }, [pathname, pathSegments, interviewDetails, candidateDetails, jobDetails]);


  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Dashboard Layout: Middleware handles auth, client-side check disabled');
  }

  useEffect(() => {
    // Only redirect candidates to /dashboard/candidate if they're on the main dashboard page
    // This prevents breaking deep links to specific pages like interviews/[id]
    if (user && user.role === "candidate" && pathname === "/dashboard") {
      router.push("/dashboard/candidate");
    }
  }, [user, router, pathname]);

  // Show company setup modal if organization name is empty
  useEffect(() => {
    if (user && organization && !organization.name && !showCompanySetupModal) {
      setShowCompanySetupModal(true);
    }
  }, [user, organization, showCompanySetupModal, setShowCompanySetupModal]);

  // Show user setup modal if user name is empty and company setup is complete
  useEffect(() => {
    if (
      user &&
      organization &&
      organization.name && // Company setup is complete
      (!user.name || user.name.trim() === "") && // User name is empty
      !showCompanySetupModal && // Company setup modal is not showing
      !showUserSetupModal // User setup modal is not already showing
    ) {
      setShowUserSetupModal(true);
    } else if (
      user &&
      user.name &&
      user.name.trim() !== "" &&
      showUserSetupModal
    ) {
      // Close modal if user now has a name
      setShowUserSetupModal(false);
    }
  }, [
    user,
    organization,
    showCompanySetupModal,
    showUserSetupModal,
    setShowUserSetupModal,
  ]);

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

  // Helper function to handle user setup completion
  const handleUserSetupCompleted = async () => {
    // Refetch user data to get latest info first
    await invalidateRelatedQueries(queryClient, "update", "auth");

    // The modal will close automatically via useEffect when user data updates
    // and the user now has a name
  };

  // Helper function to handle user setup cancel
  const handleUserSetupCancel = () => {
    setShowUserSetupModal(false);
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
      defaultOpen={true}
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
              <SidebarTrigger className="cursor-pointer z-100" />
              <Separator orientation="vertical" className="h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs
                    .map((breadcrumb, index) => [
                      index > 0 && <BreadcrumbSeparator key={`sep-${index}`} />,
                      <BreadcrumbItem key={breadcrumb.href}>
                        {breadcrumb.isCurrent ? (
                          <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link href={breadcrumb.href}>
                              {breadcrumb.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>,
                    ])
                    .flat()
                    .filter(Boolean)}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5.5 pt-0 overflow-x-hidden">
          {children}
        </div>
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
      {showUserSetupModal && user?.id && (
        <UserSetupModal
          open={showUserSetupModal}
          userId={user.id}
          onCompleted={handleUserSetupCompleted}
          onCancel={handleUserSetupCancel}
          existingName={user.name || ""}
          existingLogoUrl={user.logo_url || ""}
        />
      )}
      <Toaster />
    </SidebarProvider>
  );
}
