"use client";

import { Loader2Icon, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useChatInputActions, useChatInputState } from "@/hooks/use-chat-input";
import { useChatNav } from "@/hooks/use-chat-nav";
import { UserProfileButton } from "../auth/user-avatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export function ChatSidebar() {
  const { openNewChat } = useChatNav();
  const handleNewChat = () => openNewChat();
  // TODO: debug
  const inputActions = useChatInputActions();
  const inputState = useChatInputState();

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
        <Button className="w-full" onClick={inputActions.focus} size="sm">
          Focus Input
        </Button>
        <Button
          className="w-full"
          disabled={inputState.isSaveDraftPending}
          onClick={inputActions.saveDraft}
          size="sm"
        >
          {inputState.isSaveDraftPending ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            "Save Draft"
          )}
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
