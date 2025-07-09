import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart,
  Settings,
  LogOut,
  Brain,
  User,
  ChevronsUpDown,
  Building2,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useStores";
import { useTheme } from "next-themes";
import { Separator } from "./ui/separator";
import { useAuthStore } from "../../store";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Interviews", href: "/dashboard/interviews", icon: FileText },
  { name: "Candidates", href: "/dashboard/candidates", icon: Users },
  { name: "Analytics", href: "/dashboard/analytics", icon: Brain },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setShowCompanySetupModal } = useAuthStore();

  const handleSignOut = async () => {
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

  const handleCompanySetup = () => {
    // Properly trigger the company setup modal using auth store
    setShowCompanySetupModal(true);
  };

  const handleThemeToggle = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getThemeIcon = () => {
    if (theme === "light") return Sun;
    if (theme === "dark") return Moon;
    return Monitor;
  };

  const getThemeLabel = () => {
    if (theme === "light") return "Dark Mode";
    if (theme === "dark") return "System Theme";
    return "Light Mode";
  };

  // Get user initials for avatar
  const getUserInitials = (email: string) => {
    if (!email) return "U";
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const username = user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "Loading...";

  return (
    <Sidebar
      collapsible="icon"
      className="[&[data-state=collapsed]]:w-[4.5rem]"
      style={
        {
          "--sidebar-width-icon": "4.5rem",
        } as React.CSSProperties
      }
    >
      <SidebarHeader className="h-[3.95rem] flex items-center justify-center px-4">
        <div
          className="text-[1.3rem] font-medium tracking-widest bg-gradient-to-br from-app-blue-500 via-app-blue-600 to-app-blue-700 text-transparent bg-clip-text dark:from-app-blue-300 dark:via-app-blue-400 dark:to-app-blue-500 font-kyiv group-data-[collapsible=icon]:hidden"
          style={{
            fontFamily: "KyivType Sans",
          }}
        >
          SIVERA
        </div>
        <div className="group-data-[collapsible=icon]:flex hidden items-center justify-center w-full">
          <img
            src={`/Sivera${theme === "dark" ? "Dark" : ""}.png`}
            alt="Sivera"
            width={34}
            height={34}
            style={{
              mixBlendMode: "normal",
              backgroundColor: "rgb(248, 250, 251)",
            }}
          />
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3 pt-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem
                    key={item.name}
                    className="h-[2.5rem]"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={`
                        ${
                          isActive
                            ? "bg-app-blue-200 dark:bg-app-blue-700 text-app-blue-800 dark:text-app-blue-100 font-semibold"
                            : "text-gray-600 dark:text-gray-300 hover:bg-app-blue-50 dark:hover:bg-app-blue-900/50 hover:text-app-blue-600 dark:hover:text-app-blue-300"
                        }
                        transition-all duration-200 p-5
                      `}
                      style={{
                        border: isActive
                          ? "0.35px solid rgba(20, 138, 181, 0.45)"
                          : "",
                        padding: "1.45rem",
                      }}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-3.5 pl-[1.1rem] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-fit group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:p-[1.45rem] p-5"
                      >
                        <item.icon
                          className={`h-5 w-5 flex-shrink-0 ${
                            isActive
                              ? "text-app-blue-700 dark:text-app-blue-200"
                              : ""
                          }`}
                        />
                        <span className="font-medium group-data-[collapsible=icon]:sr-only">
                          {item.name}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="w-full px-2 pb-4 pl-[1.22rem] pr-[1.22rem]">
        <SidebarMenu className="w-full">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="group w-full py-2 rounded-xl transition-colors hover:bg-muted data-[state=open]:bg-muted
             !group-data-[collapsible=icon]:justify-center
             !group-data-[collapsible=icon]:items-center
             !group-data-[collapsible=icon]:ml-[0.5rem]
             !group-data-[collapsible=icon]:mb-[0.5rem]
             !group-data-[collapsible=icon]:p-[1.45rem]
             !group-data-[collapsible=icon]:h-12 cursor-pointer"
                >
                  <div className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-fit group-data-[collapsible=icon]:gap-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-app-blue-500 via-app-blue-600 to-app-blue-700 text-white font-semibold">
                        {getUserInitials(userEmail)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Hide text in collapsed */}
                    <div className="flex flex-col text-left text-sm leading-tight truncate group-data-[collapsible=icon]:hidden">
                      <span className="font-semibold truncate">{username}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {userEmail}
                      </span>
                    </div>

                    <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl shadow-xl"
                side="top"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-app-blue-500 via-app-blue-600 to-app-blue-700 text-white font-semibold">
                        {getUserInitials(userEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm leading-tight">
                      <p className="font-semibold">{username}</p>
                      <p className="text-xs text-muted-foreground">
                        {userEmail}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleThemeToggle}
                  className="cursor-pointer"
                >
                  {(() => {
                    const ThemeIcon = getThemeIcon();
                    return <ThemeIcon className="mr-2 h-4 w-4" />;
                  })()}
                  {getThemeLabel()}
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Account Details
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleCompanySetup}
                  className="cursor-pointer"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Organization Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
