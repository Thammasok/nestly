"use client"

import * as React from "react"

import { NavMain } from "@/components/layout/nav-main"
import { Link, useLocation } from "react-router"

import { NestlyLogo } from "@/components/brand/nestly-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, AirVentIcon, RefrigeratorIcon, ZapIcon, WorkflowIcon, SettingsIcon } from "lucide-react"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: <LayoutDashboardIcon />,
      isActive: true,
    },
    {
      title: "Climate",
      url: "#",
      icon: <AirVentIcon />,
      items: [
        { title: "Devices", url: "#" },
        { title: "Energy", url: "#" },
      ],
    },
    {
      title: "Food",
      url: "#",
      icon: <RefrigeratorIcon />,
      items: [
        { title: "Inventory", url: "#" },
        { title: "Expiring soon", url: "#" },
        { title: "Shopping list", url: "#" },
      ],
    },
    {
      title: "Electricity",
      url: "#",
      icon: <ZapIcon />,
      items: [
        { title: "Bills", url: "#" },
        { title: "Meter readings", url: "#" },
      ],
    },
    {
      title: "Automations",
      url: "#",
      icon: <WorkflowIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                {/* Name is shown as text beside it, so the mark is decorative here. */}
                <NestlyLogo aria-hidden size={48} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Nestly</span>
                  <span className="truncate text-xs">Home platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" isActive={pathname.startsWith("/settings")}>
              <Link to="/settings">
                <SettingsIcon />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
