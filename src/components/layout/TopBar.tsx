// ... [Imports remain the same]

const TopBar = ({ userRole, onLogout }: TopBarProps) => {
  const { balanceData, isLoading } = useSynapseCredits();
  const synapseCredits = balanceData?.available_credits ?? 0;
  const navigate = useNavigate();
  const { user, piiData } = useAuth();

  // 1. Normalize role for internal checks
  const isInternalMaster = userRole === "super-admin" || userRole === "god_guid" || userRole === "csuite";

  const getUserName = () => {
    // PII from in-memory bridge (Anti-PII compliance)
    if (piiData?.displayName) return piiData.displayName;

    // Internal Master branding override
    if (isInternalMaster) return "System Architect";

    // Fallback: platform GUID prefix
    if (user?.user_id && !user.user_id.startsWith("mock-")) {
      return user.user_id.slice(0, 8).toUpperCase();
    }

    // Contextual Fallbacks
    switch (userRole) {
      case "organization-admin":
        return "Org Admin";
      case "team-lead":
        return "Team Lead";
      case "team-member":
        return "Team Member";
      default:
        return "IDIA User";
    }
  };

  const getOrganization = () => {
    // If you are internal, the header MUST reflect the Platform, not an email domain
    if (isInternalMaster) return "IDIA Data Inc.";

    const email = piiData?.email || user?.email;
    if (email) {
      const domain = email.split("@")[1];
      if (domain) return domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
    }
    return "Organization";
  };

  const displayName = getUserName();

  return (
    <header className="sticky top-0 z-40 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
        <SidebarTrigger className="flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-sm md:text-lg font-semibold text-foreground truncate">Welcome back, {displayName}</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">{getOrganization()}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
        <IdentityStatusPills />

        {/* Internal Masters do not need the purchase modal; they use Platform Credits */}
        {!isInternalMaster && (
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
        )}

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
                {/* Visual Role Normalization */}
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
