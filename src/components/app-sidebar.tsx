import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  House,
  Users,
  Stethoscope,
  Receipt,
  ListChecks,
  GearIcon,
  PiggyBankIcon
} from "@phosphor-icons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Dashboard", to: "/", icon: House },
  { title: "Patienten", to: "/patients", icon: Users },
  { title: "Sitzungen", to: "/sessions", icon: Stethoscope },
  { title: "Finanzen", to: "/finances", icon: Receipt },
  { title: "Finanzen Gesamt", to: "/financesGeneral", icon: PiggyBankIcon },
  { title: "Todos", to: "/todos", icon: ListChecks },
] as const;

function AppSidebar() {
  const matchRoute = useMatchRoute();

  return (
    <Sidebar collapsible="icon">
      {/*<SidebarHeader className="px-3 py-2"></SidebarHeader>*/}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = !!matchRoute({
                  to: item.to,
                  fuzzy: item.to !== "/",
                });
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={!!matchRoute({ to: "/settings", fuzzy: true })}
              tooltip="Einstellungen"
            >
              <Link to="/settings">
                <GearIcon />
                <span>Einstellungen</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
