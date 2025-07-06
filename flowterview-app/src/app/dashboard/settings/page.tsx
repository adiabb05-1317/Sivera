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
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch, getUserContext } from "@/lib/auth-client";
import { useAuthStore } from "../../../../store";

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

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Auth store for organization data
  const { organization, fetchOrganization, setShowCompanySetupModal } =
    useAuthStore();

  // LinkedIn integration state
  const [linkedInStatus, setLinkedInStatus] =
    useState<LinkedInIntegrationStatus | null>(null);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInRemoving, setLinkedInRemoving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

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
          toast({
            title: "LinkedIn Connected",
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
        toast({
          title: "Error",
          description: "Failed to check LinkedIn integration status",
          variant: "destructive",
        });
      } finally {
        setCheckingStatus(false);
      }
    };

    initializeLinkedInStatus();
  }, [toast, searchParams]);

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
      toast({
        title: "Error",
        description: "Organization ID not found. Please refresh the page.",
        variant: "destructive",
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
      toast({
        title: "Redirecting to LinkedIn",
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
      toast({
        title: "Connection Failed",
        description: `Failed to connect to LinkedIn: ${errorMessage}`,
        variant: "destructive",
      });
      setLinkedInLoading(false);
    }
  };

  // Handle LinkedIn disconnect
  const handleLinkedInDisconnect = async () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization ID not found. Please refresh the page.",
        variant: "destructive",
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

      toast({
        title: "LinkedIn Disconnected",
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
      toast({
        title: "Disconnect Failed",
        description: `Failed to disconnect from LinkedIn: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLinkedInLoading(false);
    }
  };

  // Handle LinkedIn complete removal
  const handleLinkedInRemove = async () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization ID not found. Please refresh the page.",
        variant: "destructive",
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

      toast({
        title: "LinkedIn Integration Removed",
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
      toast({
        title: "Remove Failed",
        description: `Failed to remove LinkedIn integration: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLinkedInRemoving(false);
    }
  };

  // Test LinkedIn integration
  const testLinkedInIntegration = async () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization ID not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await authenticatedFetch(
        `${backendUrl}/api/v1/linkedin/test/integration/${organizationId}`
      );

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "LinkedIn Test Successful",
          description: `Integration is working correctly. Profile: ${
            result.test_api_call?.profile_name || "N/A"
          }`,
        });
      } else {
        toast({
          title: "LinkedIn Test Failed",
          description: result.error || "Integration test failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("LinkedIn test error:", error);
      toast({
        title: "Test Failed",
        description: "Failed to test LinkedIn integration",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Manage your application preferences and integrations.
        </p>
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
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
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
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
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
                variant="outline"
                className="text-app-blue-600 border-app-blue-300 hover:bg-app-blue-50 hover:text-app-blue-700 dark:text-app-blue-400 dark:border-app-blue-600 dark:hover:bg-app-blue-900/20 dark:hover:text-app-blue-300 cursor-pointer"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                {organization?.name ? "Edit" : "Setup"}
              </Button>
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
                          variant="outline"
                          size="sm"
                          className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-900/20 dark:hover:text-gray-300"
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
                                variant="outline"
                                size="sm"
                                className="text-app-blue-600 border-app-blue-200 hover:bg-app-blue-50 hover:text-app-blue-700 hover:border-app-blue-300 dark:text-app-blue-400 dark:border-app-blue-600 dark:hover:bg-app-blue-900/20 dark:hover:text-app-blue-300 transition-colors w-full"
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
                                size="sm"
                                disabled={linkedInRemoving || linkedInLoading}
                                className="text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-400 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors w-full"
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
                              <Button variant="outline">Close</Button>
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
                    } cursor-pointer`}
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
    </div>
  );
}
