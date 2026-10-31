"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, AirVentIcon, RefrigeratorIcon, ZapIcon, Settings2Icon, HouseIcon } from "lucide-react"

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
      icon: <Settings2Icon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <HouseIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Nestly</span>
                  <span className="truncate text-xs">Home platform</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
    </Sidebar>
  )
}
