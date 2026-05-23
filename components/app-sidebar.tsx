"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

import { logout } from "@/app/auth-actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Calendário", url: "/calendario", icon: CalendarDays },
  { title: "Visão Anual", url: "/anual", icon: CalendarRange },
  { title: "Funcionários", url: "/funcionarios", icon: Users },
  { title: "Eventos", url: "/eventos", icon: ListChecks },
  { title: "Rotinas", url: "/rotinas", icon: ClipboardList },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg text-sm font-bold">
            P&E
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Planejamento</span>
            <span className="text-muted-foreground text-xs">& Escalas</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/configuracoes" />}
              isActive={pathname.startsWith("/configuracoes")}
              tooltip="Configurações"
            >
              <Settings />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logout} className="w-full">
              <SidebarMenuButton type="submit" tooltip="Sair">
                <LogOut />
                <span>Sair</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
