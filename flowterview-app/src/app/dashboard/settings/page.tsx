"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Moon,
  Sun,
  Monitor,
  Linkedin,
  Check,
  Loader2,
  Settings,
  Trash2,
  AlertTriangle,
  Building2,
  Edit3,
  Users,
  Crown,
  User,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Mail,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { authenticatedFetch, getUserContext } from "@/lib/auth-client";
import { useAuthStore } from "../../../../store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// LinkedIn integration types
interface LinkedInIntegrationStatus {
  is_connected: boolean;
  organization_id: string;
  linkedin_user_id?: string;
  expires_at?: string;
  scopes?: string;
  profile_data?: {
    name?: string;
    email?: string;
    picture?: string;
  };
}

// Organization member types
interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "recruiter" | "candidate";
  organization_id: string;
  created_at: string;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();

  // Auth store for organization data
  const { organization, user, fetchOrganization, setShowCompanySetupModal } =
    useAuthStore();

  const openCompanyEdit = searchParams.get("openCompanyEdit");

  // LinkedIn integration state
  const [linkedInStatus, setLinkedInStatus] =
    useState<LinkedInIntegrationStatus | null>(null);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInRemoving, setLinkedInRemoving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  // Organization members state
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [promotingUser, setPromotingUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Add members state
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newMemberEmails, setNewMemberEmails] = useState("");
  const [invitingMembers, setInvitingMembers] = useState(false);
  const themeOptions = [
    {
      value: "light",
      label: "Light",
      description: "Light mode",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Dark",
      description: "Dark mode",
      icon: Moon,
    },
    {
      value: "system",
      label: "System",
      description: "Use system preference",
      icon: Monitor,
    },
  ];

  // Get backend URL
  const backendUrl =
    process.env.NEXT_PUBLIC_SIVERA_BACKEND_URL || "https://api.sivera.io";

  useEffect(() => {
    if (openCompanyEdit) {
      setShowCompanySetupModal(true);
    }
  }, [openCompanyEdit]);

  // Fetch organization members
  const fetchOrganizationMembers = async () => {
    if (!organizationId) return;

    setMembersLoading(true);
    try {
      // Fetch all users and filter by organization_id
      const response = await authenticatedFetch(`${backendUrl}/api/v1/users`);

      if (response.ok) {
        const allUsers = await response.json();
        // Filter users by organization_id
        const orgMembers = allUsers.filter(
          (user: OrganizationMember) => user.organization_id === organizationId
        );

        // Sort: admins first, then by creation date
        const sortedMembers = orgMembers.sort(
          (a: OrganizationMember, b: OrganizationMember) => {
            if (a.role === "admin" && b.role !== "admin") return -1;
            if (a.role !== "admin" && b.role === "admin") return 1;
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          }
        );

        setMembers(sortedMembers);
      } else {
        throw new Error("Failed to fetch organization members");
      }
    } catch (error) {
      console.error("Error fetching organization members:", error);
      toast.error("Error", {
        description: "Failed to load organization members",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  // Add members functionality
  const validateEmailDomain = (email: string): boolean => {
    if (!organization?.domain || !email.includes("@")) {
      return false;
    }

    const emailDomain = email.split("@")[1].toLowerCase();
    const orgDomain = organization.domain.toLowerCase();

    // Handle cases where organization domain might be just the domain name
    // or might include the full domain (e.g., "company" vs "company.com")
    return (
      emailDomain === orgDomain ||
      emailDomain === `${orgDomain}.com` ||
      emailDomain.endsWith(`.${orgDomain}`) ||
      orgDomain.endsWith(`.${emailDomain}`)
    );
  };

  const handleAddMembers = async () => {
    if (!organization?.id || !newMemberEmails.trim()) {
      toast.error("Error", {
        description: "Please enter email addresses",
      });
      return;
    }

    // Parse and validate emails
    const emailList = newMemberEmails
      .split(/[,\n\s]+/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailList.length === 0) {
      toast.error("Error", {
        description: "Please enter valid email addresses",
      });
      return;
    }

    // Validate email domains
    const invalidEmails = emailList.filter(
      (email) => !validateEmailDomain(email)
    );
    if (invalidEmails.length > 0) {
      toast.error("Invalid Email Domain", {
        description: `The following emails don't match your organization domain (${
          organization.domain
        }): ${invalidEmails.join(", ")}`,
      });
      return;
    }

    setInvitingMembers(true);
    try {
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/organizations/${organization.id}/invite-recruiters`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: emailList }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success("Invitations Sent", {
          description: `Successfully sent invitations to ${result.emails_count} member(s)`,
        });

        // Reset and close add members UI
        setNewMemberEmails("");
        setShowAddMembers(false);

        // Refresh members list after a short delay to allow for processing
        setTimeout(() => {
          fetchOrganizationMembers();
        }, 2000);
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to send invitations");
      }
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to send invitations",
      });
    } finally {
      setInvitingMembers(false);
    }
  };

  // Promote user to admin
  const promoteToAdmin = async (userId: string) => {
    if (!user || user.role !== "admin") {
      toast.error("Access Denied", {
        description: "Only admins can promote other users",
      });
      return;
    }

    setPromotingUser(userId);
    try {
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/users/${userId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin" }),
        }
      );

      if (response.ok) {
        toast.success("User Promoted", {
          description: "User has been promoted to admin successfully",
        });
        fetchOrganizationMembers();
      }
    } catch (error) {
      console.error("Error promoting user:", error);
      toast.error("Error", {
        description: "Failed to promote user",
      });
    } finally {
      setPromotingUser(null);
    }
  };

  // Check LinkedIn integration status on component mount
  useEffect(() => {
    const initializeLinkedInStatus = async () => {
      try {
        const userContext = getUserContext();
        if (!userContext?.organization_id) {
          console.warn("No organization ID found in user context");
          setCheckingStatus(false);
          return;
        }

        setOrganizationId(userContext.organization_id);
        await checkLinkedInStatus(userContext.organization_id);

        // Check if user just returned from OAuth flow
        const linkedinConnected = searchParams.get("linkedin_connected");
        if (linkedinConnected === "true") {
          toast.success("LinkedIn Connected", {
            description:
              "Your LinkedIn integration has been successfully activated.",
          });

          // Clean up URL parameters
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("linkedin_connected");
            window.history.replaceState({}, "", url.toString());
          }
        }
      } catch (error) {
        console.error("Error initializing LinkedIn status:", error);
        toast.error("Error", {
          description: "Failed to check LinkedIn integration status",
        });
      } finally {
        setCheckingStatus(false);
      }
    };

    initializeLinkedInStatus();
  }, [toast, searchParams]);

  // Fetch organization members when organizationId is available
  useEffect(() => {
    if (organizationId) {
      fetchOrganizationMembers();
    }
  }, [organizationId]);

  // Check LinkedIn integration status
  const checkLinkedInStatus = async (orgId: string) => {
    try {
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/linkedin/status/${orgId}`
      );

      if (response.ok) {
        const status: LinkedInIntegrationStatus = await response.json();
        setLinkedInStatus(status);
      } else {
        // If status check fails, assume not connected
        setLinkedInStatus({
          is_connected: false,
          organization_id: orgId,
        });
      }
    } catch (error) {
      console.error("Error checking LinkedIn status:", error);
      setLinkedInStatus({
        is_connected: false,
        organization_id: orgId,
      });
    }
  };

  // Handle LinkedIn connect
  const handleLinkedInConnect = async () => {
    if (!organizationId) {
      toast.error("Error", {
        description: "Organization ID not found. Please refresh the page.",
      });
      return;
    }

    setLinkedInLoading(true);

    try {
      // Step 1: Initiate OAuth flow
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/linkedin/auth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_id: organizationId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to initiate LinkedIn OAuth"
        );
      }

      const { authorization_url } = await response.json();

      // Step 2: Redirect to LinkedIn authorization
      toast.info("Redirecting to LinkedIn", {
        description:
          "You will be redirected to LinkedIn to complete the connection.",
      });

      // Small delay to show the toast, then redirect
      setTimeout(() => {
        window.location.href = authorization_url;
      }, 1000);
    } catch (error) {
      console.error("LinkedIn connect error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Connection Failed", {
        description: `Failed to connect to LinkedIn: ${errorMessage}`,
      });
      setLinkedInLoading(false);
    }
  };

  // Handle LinkedIn disconnect
  const handleLinkedInDisconnect = async () => {
    if (!organizationId) {
      toast.error("Error", {
        description: "Organization ID not found. Please refresh the page.",
      });
      return;
    }

    setLinkedInLoading(true);

    try {
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/linkedin/disconnect/${organizationId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to disconnect LinkedIn");
      }

      const result = await response.json();

      toast.success("LinkedIn Disconnected", {
        description:
          result.message || "Successfully disconnected from LinkedIn",
      });

      // Update status
      setLinkedInStatus({
        is_connected: false,
        organization_id: organizationId,
      });
    } catch (error) {
      console.error("LinkedIn disconnect error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Disconnect Failed", {
        description: `Failed to disconnect from LinkedIn: ${errorMessage}`,
      });
    } finally {
      setLinkedInLoading(false);
    }
  };

  // Handle LinkedIn complete removal
  const handleLinkedInRemove = async () => {
    if (!organizationId) {
      toast.error("Error", {
        description: "Organization ID not found. Please refresh the page.",
      });
      return;
    }

    // Confirm removal with user
    const confirmed = window.confirm(
      "Are you sure you want to completely remove the LinkedIn integration? This will permanently delete all stored data and cannot be undone. You can always reconnect later."
    );

    if (!confirmed) {
      return;
    }

    setLinkedInRemoving(true);

    try {
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/linkedin/remove/${organizationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to remove LinkedIn integration"
        );
      }

      const result = await response.json();

      toast.success("LinkedIn Integration Removed", {
        description:
          result.message || "LinkedIn integration has been completely removed",
      });

      // Update status
      setLinkedInStatus({
        is_connected: false,
        organization_id: organizationId,
      });
    } catch (error) {
      console.error("LinkedIn remove error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Remove Failed", {
        description: `Failed to remove LinkedIn integration: ${errorMessage}`,
      });
    } finally {
      setLinkedInRemoving(false);
    }
  };

  // Test LinkedIn integration
  const testLinkedInIntegration = async () => {
    if (!organizationId) {
      toast.error("Error", {
        description: "Organization ID not found. Please refresh the page.",
      });
      return;
    }

    try {
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/linkedin/test/integration/${organizationId}`
      );

      const result = await response.json();

      if (response.ok) {
        toast.success("LinkedIn Test Successful", {
          description: `Integration is working correctly. Profile: ${
            result.test_api_call?.profile_name || "N/A"
          }`,
        });
      } else {
        toast.error("LinkedIn Test Failed", {
          description: result.error || "Integration test failed",
        });
      }
    } catch (error) {
      console.error("LinkedIn test error:", error);
      toast.error("Test Failed", {
        description: "Failed to test LinkedIn integration",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-row justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Customize your application preferences and integrations.
        </p>
        <Button className="invisible" variant="outline">
          This button is to make the text aligned for all the pages
        </Button>
      </div>

      {/* Company Details */}
      <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">Company Details</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Manage your organization profile and company information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
            {/* Company Name and Branding */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {organization?.logo_url ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      <img
                        src={organization.logo_url}
                        alt="Company logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-2 bg-app-blue-100 dark:bg-app-blue-900/30 rounded-lg">
                      <Building2 className="h-6 w-6 text-app-blue-600 dark:text-app-blue-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-[1rem] font-medium text-gray-900 dark:text-white">
                    {organization?.name || "Company Name Not Set"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {organization?.name
                      ? "Your organization name and branding settings"
                      : "Complete your company profile to get started"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => setShowCompanySetupModal(true)}
                  className="cursor-pointer text-xs"
                  variant="outline"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  {organization?.name ? "Edit" : "Setup"}
                </Button>
              </div>
            </div>

            {/* Company Members */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-10 h-10"></div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-white">
                    Company Members
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {members.length > 0
                      ? `${members.length} ${
                          members.length === 1 ? "member" : "members"
                        } in your organization`
                      : "View and manage organization members"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => {
                    if (members.length === 0) {
                      fetchOrganizationMembers();
                    }
                    setMembersDialogOpen(true);
                  }}
                  className="cursor-pointer text-xs"
                  variant="outline"
                  disabled={membersLoading}
                >
                  {membersLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3 mr-1" />
                      View / Add Members
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">Application Theme</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Choose how the application looks and feels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`cursor-pointer relative flex items-center space-x-3 rounded-lg border p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  theme === option.value
                    ? "border-app-blue-500 bg-app-blue-50 dark:bg-app-blue-900/40 dark:border-app-blue-400"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex-shrink-0">
                  <option.icon
                    className={`h-5 w-5 ${
                      theme === option.value
                        ? "text-app-blue-600 dark:text-app-blue-300"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      theme === option.value
                        ? "text-app-blue-900 dark:text-app-blue-100"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {option.label}
                  </p>
                  <p
                    className={`text-xs ${
                      theme === option.value
                        ? "text-app-blue-700 dark:text-app-blue-200"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {option.description}
                  </p>
                </div>
                {theme === option.value && (
                  <div className="flex-shrink-0">
                    <Check className="h-4 w-4 text-app-blue-600 dark:text-app-blue-300" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* App Integrations */}
      <Card className="bg-white dark:bg-gray-900 border dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">App Integrations</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Connect with external services to enhance your workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* LinkedIn Integration */}
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Linkedin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  LinkedIn
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Connect to import candidate profiles and job postings
                </p>

                {/* Show LinkedIn profile info when connected */}
                {linkedInStatus?.is_connected &&
                  linkedInStatus.profile_data && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        <strong>Connected as:</strong>{" "}
                        {linkedInStatus.profile_data.name ||
                          linkedInStatus.profile_data.email}
                      </p>
                      {linkedInStatus.expires_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <strong>Expires:</strong>{" "}
                          {new Date(
                            linkedInStatus.expires_at
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {checkingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <>
                  {/* Settings Button (when connected) */}
                  {linkedInStatus?.is_connected && (
                    <Drawer
                      open={settingsDrawerOpen}
                      onOpenChange={setSettingsDrawerOpen}
                    >
                      <DrawerTrigger asChild>
                        <Button
                          className="cursor-pointer text-xs"
                          variant="outline"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <div className="mx-auto w-full max-w-sm">
                          <DrawerHeader>
                            <DrawerTitle>
                              LinkedIn Integration Settings
                            </DrawerTitle>
                            <DrawerDescription>
                              Advanced options for managing your LinkedIn
                              integration.
                            </DrawerDescription>
                          </DrawerHeader>
                          <div className="p-6 space-y-6">
                            {/* Test Integration */}
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Test Integration
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Verify that your LinkedIn integration is
                                  working correctly
                                </p>
                              </div>
                              <Button
                                onClick={() => {
                                  testLinkedInIntegration();
                                  setSettingsDrawerOpen(false);
                                }}
                                className="cursor-pointer text-xs"
                                variant="outline"
                              >
                                Test Connection
                              </Button>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-200 dark:border-gray-700"></div>

                            {/* Reset Integration */}
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Reset Integration
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Remove this LinkedIn connection to connect a
                                  different account or start fresh. This will
                                  clear stored job postings and candidate data.
                                </p>
                              </div>
                              <Button
                                onClick={() => {
                                  handleLinkedInRemove();
                                  setSettingsDrawerOpen(false);
                                }}
                                variant="outline"
                                disabled={linkedInRemoving || linkedInLoading}
                                className="cursor-pointer text-xs"
                              >
                                {linkedInRemoving && (
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                )}
                                <Trash2 className="h-3 w-3 mr-2" />
                                Remove Integration
                              </Button>
                            </div>
                          </div>
                          <DrawerFooter>
                            <DrawerClose asChild>
                              <Button
                                className="cursor-pointer text-xs"
                                variant="outline"
                              >
                                Close
                              </Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  )}

                  {/* Connect/Disconnect Button */}
                  <Button
                    onClick={
                      linkedInStatus?.is_connected
                        ? handleLinkedInDisconnect
                        : handleLinkedInConnect
                    }
                    variant="outline"
                    disabled={linkedInLoading}
                    className={`${
                      linkedInStatus?.is_connected
                        ? "text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:border-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-300"
                        : "text-app-blue-600 border-app-blue-300 hover:bg-app-blue-50 hover:text-app-blue-700 dark:text-app-blue-400 dark:border-app-blue-600 dark:hover:bg-app-blue-900/20 dark:hover:text-app-blue-300"
                    } cursor-pointer text-xs`}
                  >
                    {linkedInLoading && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {linkedInStatus?.is_connected ? "Disconnect" : "Connect"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Placeholder for future integrations */}
          <div className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              More integrations coming soon...
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Organization Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-app-blue-600 dark:text-app-blue-400" />
              Company Members
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
              {organization?.name && `Members of ${organization.name}`}
              {members.length > 0 &&
                ` • ${members.length} ${
                  members.length === 1 ? "member" : "members"
                }`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Search bar */}
            <div className="flex items-center space-x-2 mb-4 py-2 px-1">
              <Input
                placeholder="Search members"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                onClick={() => setShowAddMembers(true)}
                variant="outline"
                className="cursor-pointer text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Members
              </Button>
            </div>

            {/* Add Members UI */}
            {showAddMembers ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between mb-0">
                  <h3 className="text-sm font-medium">Add Team Members</h3>
                  <Button
                    onClick={() => {
                      setShowAddMembers(false);
                      setNewMemberEmails("");
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 mt-0">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Enter email addresses separated by commas, spaces, or new
                    lines.
                  </p>
                  <div className="px-1">
                    <Textarea
                      className="w-full min-h-[120px]"
                      placeholder={`Enter email addresses...${
                        organization?.domain
                          ? `\ne.g., johndoe@${organization.domain}, jane@${organization.domain}`
                          : ""
                      }`}
                      value={newMemberEmails}
                      onChange={(e) => setNewMemberEmails(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleAddMembers}
                      disabled={invitingMembers || !newMemberEmails.trim()}
                      className="flex-1 cursor-pointer text-xs"
                      variant="outline"
                    >
                      {invitingMembers ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending Invitations...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitations
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddMembers(false);
                        setNewMemberEmails("");
                      }}
                      variant="outline"
                      className="cursor-pointer text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : membersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-app-blue-600 dark:text-app-blue-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Loading organization members...
                  </p>
                </div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No members found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  There are no members in your organization yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {members
                  .filter((member) =>
                    (member.name || member.email || "")
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                  )
                  .map((member, index) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                        member.role === "admin"
                          ? "border-app-blue-200 bg-app-blue-50 dark:border-app-blue-700/50 dark:bg-app-blue-900/10"
                          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback
                            className={`text-sm font-medium ${
                              member.role === "admin"
                                ? "bg-app-blue-100 text-app-blue-700 dark:bg-app-blue-900/30 dark:text-app-blue-400"
                                : "bg-app-blue-100 text-app-blue-700 dark:bg-app-blue-900/30 dark:text-app-blue-400"
                            }`}
                          >
                            {member.name
                              ? member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : member.email
                              ? member.email.substring(0, 2).toUpperCase()
                              : "?"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {member.name || member.email || "Unknown User"}
                            </h4>
                            {member.role === "admin" && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-app-blue-100 text-app-blue-700 border-app-blue-300 dark:bg-app-blue-900/20 dark:text-app-blue-400 dark:border-app-blue-600"
                              >
                                Admin
                              </Badge>
                            )}
                            {member.id === user?.id && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-app-blue-100 text-app-blue-700 border-app-blue-300 dark:bg-app-blue-900/20 dark:text-app-blue-400 dark:border-app-blue-600"
                              >
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {member.email}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Joined{" "}
                            {new Date(member.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Admin Actions */}
                      {user?.role === "admin" &&
                        member.id !== user?.id &&
                        member.role !== "admin" && (
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => promoteToAdmin(member.id)}
                              disabled={promotingUser === member.id}
                              variant="outline"
                              size="sm"
                              className="cursor-pointer text-xs"
                            >
                              Make Admin
                            </Button>
                          </div>
                        )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user?.role === "admin" &&
                members.length > 1 &&
                "Only admins can promote other members"}
            </div>
            <Button
              onClick={() => setMembersDialogOpen(false)}
              variant="outline"
              className="cursor-pointer text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
