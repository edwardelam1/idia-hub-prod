import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronDown, Coins, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import SynapsePurchaseModal from "@/components/billing/SynapsePurchaseModal";
import IdentityStatusPills from "@/components/layout/IdentityStatusPills";
import NotificationsCenter from "@/components/notifications/NotificationsCenter";

interface TopBarProps {
  userRole: string;
  onLogout: () => void;
}

const TopBar = ({ userRole, onLogout }: TopBarProps) => {
  const { balanceData, isLoading } = useSynapseCredits();
  const synapseCredits = balanceData?.available_credits ?? 0;
  const navigate = useNavigate();
  const { user, piiData } = useAuth();

  // Internal Master check (Global Override)
  const isInternalMaster = userRole === "super-admin" || userRole === "god_guid" || userRole === "csuite";

  const getUserName = () => {
    console.log("[IdentityGate] >>> START: Resolving Identity Label");

    // 1. Check PII Bridge first (Anti-PII Primary)
    if (piiData?.displayName) {
      console.log("[IdentityGate] --- SUCCESS: Identity verified via PII Bridge.");
      return piiData.displayName;
    }

    // 2. Master Authority Override
    if (isInternalMaster) {
      console.log("[IdentityGate] --- ELEVATION: System Architect status confirmed.");
      return "System Architect";
    }

    // 3. STRICT ROLE ENFORCEMENT
    // No fallbacks. No generic "User" labels. Match or Die.
    switch (userRole) {
      case "organization-admin":
        return "Org Admin";
      case "team-lead":
        return "Team Lead";
      case "team-member":
        return "Team Member";
      case "enterprise":
        return "Institutional Sovereign";
      case "professional":
        return "Professional Trader";
      case "analyst":
        return "Data Analyst";
      case "individual":
        return "Verified User";
      default:
        console.error(`[IdentityGate] !!! FATAL: Unidentified userRole [${userRole}]. Stalling detected.`);
        throw new Error(`IDENTITY_RESOLUTION_FAILURE: Unidentified Role [${userRole}]. Access Denied.`);
    }
  };

  const getOrganization = () => {
    console.log("[IdentityGate] >>> START: Resolving Organization Border");

    // Masters represent the Platform
    if (isInternalMaster) return "IDIA Data Inc.";

    // Logic: Extract organization from verified PII or Email
    const email = piiData?.email || user?.email;
    if (email) {
      const domain = email.split("@")[1];
      if (domain) {
        console.log(`[IdentityGate] --- SUCCESS: Organization resolved via domain [${domain}].`);
        return domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
      }
    }

    // Soft fallback — avoid crashing the entire app shell when org cannot be resolved.
    console.warn(`[IdentityGate] --- WARN: Organization unresolved for userRole [${userRole}]. Using fallback.`);
    return "IDIA Hub";
  };

  const displayName = getUserName();

  return (
    <header className="sticky top-0 z-40 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
        <SidebarTrigger className="flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-sm md:text-lg font-semibold text-foreground truncate">Welcome Back, {displayName}</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">{getOrganization()}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
        <IdentityStatusPills />

        <div className="hidden sm:flex items-center space-x-2">
          <SynapsePurchaseModal
            trigger={
              <button className="flex items-center space-x-2 bg-primary/10 hover:bg-primary/20 transition-colors px-2 md:px-3 py-1 rounded-full cursor-pointer">
                <Coins className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <span className="text-xs md:text-sm font-medium text-primary">
                  {isLoading ? "..." : Math.floor(synapseCredits)}
                </span>
                <span className="text-xs text-primary/70">Cr</span>
              </button>
            }
          />
        </div>

        <NotificationsCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-1 md:space-x-2 h-8 md:h-9">
              <Avatar className="h-6 w-6 md:h-8 md:w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs md:text-sm">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3 md:h-4 md:w-4 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 md:w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium text-sm">{displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userRole.replace("-", " ").replace("_", " ")}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm" onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive text-sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export { TopBar };
