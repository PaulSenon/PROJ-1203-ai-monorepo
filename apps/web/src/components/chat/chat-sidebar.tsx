"use client";

import { Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { UserProfileButton } from "../auth/user-avatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export function ChatSidebar() {
  const handleNewChat = () => console.log("TODO: new chat");

  return (
    <Sidebar>
      <SidebarHeader className="space-y-3 p-4 pb-0">
        <div className="flex items-center justify-center">
          <h1 className="font-semibold text-lg tracking-tight">
            T3 Chat Clone
          </h1>
        </div>

        <Button className="w-full" onClick={handleNewChat} size="sm">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Separator />
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 p-1 font-medium text-xs">
            Previous Threads
          </SidebarGroupLabel>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <UserProfileButton className="rounded-lg border" />
      </SidebarFooter>
    </Sidebar>
  );
}
