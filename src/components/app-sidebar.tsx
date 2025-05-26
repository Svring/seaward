'use client'

import { useState } from 'react'
import { Calendar, Home, Inbox, Search, Settings, MessageSquare, ChevronsUpDown, User, Link, ExternalLink, Plus, Trash } from "lucide-react"
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar"
import { SidebarToggle } from "@/components/admin-panel/sidebar-toggle";
import { usePathname, useRouter } from 'next/navigation';
import { toast } from "sonner"
import useSWR from "swr"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { InfoCard, InfoCardAction, InfoCardContent, InfoCardDescription, InfoCardDismiss, InfoCardFooter, InfoCardMedia, InfoCardTitle } from "./info-card";

import { getCurrentUser } from "@/database/actions/users-actions";
import { findUserProjects, getUserProjectById } from "@/database/actions/user-projects-actions";
import { createSessionForProject, deleteSession, updateSession } from "@/database/actions/project-sessions-actions";
import { User as UserType, UserProject, ProjectSession } from "@/payload-types";

// Chat items
const chatItems = [
  {
    title: "New Chat",
    url: "/chat",
    icon: MessageSquare,
  }
]

export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar()
  const pathname = usePathname();
  const router = useRouter();

  // Extract projectId from pathname
  const projectPathRegex = /^\/project\/([^\/]+)(?:\/[^\/]+)?$/;
  const match = pathname.match(projectPathRegex);
  const projectId = match ? match[1] : null;

  // Fetch user
  const { data: user, isLoading: userLoading } = useSWR('currentUser', getCurrentUser);

  // Fetch projects (only if user exists)
  const { data: projectsData, isLoading: projectsLoading } = useSWR(
    user ? ['userProjects', user.id] : null,
    () => findUserProjects({})
  );
  const projects = projectsData?.docs || [];

  // Fetch current project (with sessions)
  const {
    data: currentProject,
    isLoading: projectLoading,
    mutate: mutateProject
  } = useSWR(
    typeof projectId === 'string' ? ['userProject', projectId] : null,
    () => projectId ? getUserProjectById(projectId, 1) : undefined
  );

  const currentProjectSessions = currentProject?.project_sessions?.filter(
    (session) => typeof session === 'object' && session !== null && 'id' in session
  ) || [];

  // Map projects to menu items
  const projectItems = projects.map(project => ({
    title: project.name || 'Unnamed Project',
    url: `/project/${project.id}`,
    icon: Home
  }))

  // Check if we are on a project page
  const isProjectPage = !!currentProject;

  // Handler to create a new session
  const [creatingSession, setCreatingSession] = useState(false);
  const handleCreateSession = async () => {
    if (!currentProject) return;
    setCreatingSession(true);
    try {
      const newSession = await createSessionForProject(currentProject.id);
      await mutateProject(); // Refresh project and sessions
      if (newSession && newSession.id) {
        router.push(`/project/${currentProject.id}/${newSession.id}`);
      } else {
        // Fallback or error if newSession or its ID is not returned
        toast.info("Session created, but navigation failed. Please refresh or select from sidebar.");
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error("Failed to create session. Please try again.");
    } finally {
      setCreatingSession(false);
    }
  };

  // Handler to delete a session
  const handleDeleteSession = async (sessionId: string) => {
    setCreatingSession(true);
    try {
      await deleteSession(sessionId);
      await mutateProject(); // Refresh project and sessions
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error("Failed to delete session. Please try again.");
    } finally {
      setCreatingSession(false);
    }
  };

  // Handler to rename a session
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renamingSessionName, setRenamingSessionName] = useState<string>("");
  const [renamingLoading, setRenamingLoading] = useState(false);

  const handleStartRename = (session: any) => {
    setRenamingSessionId(session.id);
    setRenamingSessionName(session.name || "");
  };

  const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRenamingSessionName(e.target.value);
  };

  const handleRenameBlurOrSubmit = async (session: any) => {
    if (!renamingSessionId) return;
    if (renamingSessionName.trim() && renamingSessionName !== session.name) {
      setRenamingLoading(true);
      try {
        await updateSession(renamingSessionId, { name: renamingSessionName.trim() });
        await mutateProject();
      } catch (error) {
        toast.error("Failed to rename session. Please try again.");
      } finally {
        setRenamingLoading(false);
        setRenamingSessionId(null);
      }
    } else {
      setRenamingSessionId(null);
    }
  };

  if (isProjectPage) {
    return (
      <Sidebar collapsible="icon">
        <SidebarToggle isOpen={open} setIsOpen={toggleSidebar} />
        <SidebarContent className='gap-0'>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/">
                    <Home className="mr-2" size={16} />
                    <span>Back To Home</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>
              {currentProject?.name || 'Project'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href={`/project/${currentProject?.id}`}>
                      <span>Overview</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Sessions</span>
                <button
                  type="button"
                  onClick={handleCreateSession}
                  disabled={creatingSession}
                  style={{ background: 'none', border: 'none', padding: 0, marginLeft: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  aria-label="Create new session"
                >
                  <Plus size={16} className={creatingSession ? 'animate-spin' : ''} />
                </button>
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectLoading ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled>
                      <span>Loading sessions...</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : currentProjectSessions.length > 0 ? (
                  currentProjectSessions.map((session) => {
                    const isSelected = pathname === `/project/${currentProject?.id}/${session.id}`;
                    return (
                      <SidebarMenuItem key={session.id} className="flex items-center justify-between">
                        <SidebarMenuButton asChild className="flex-1 min-w-0">
                          <a
                            href={`/project/${currentProject?.id}/${session.id}`}
                            className="flex items-center min-w-0"
                            onClick={e => {
                              if (isSelected) {
                                e.preventDefault();
                                handleStartRename(session);
                              }
                            }}
                          >
                            <MessageSquare className="mr-2" size={16} />
                            {renamingSessionId === session.id ? (
                              <input
                                className="truncate bg-background border rounded px-1 py-0.5 text-sm min-w-0 w-full"
                                value={renamingSessionName}
                                autoFocus
                                disabled={renamingLoading}
                                onChange={handleRenameChange}
                                onBlur={() => handleRenameBlurOrSubmit(session)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRenameBlurOrSubmit(session);
                                  } else if (e.key === 'Escape') {
                                    setRenamingSessionId(null);
                                  }
                                }}
                              />
                            ) : (
                              <span className="truncate">{session.name || 'Unnamed Session'}</span>
                            )}
                          </a>
                        </SidebarMenuButton>
                        <button
                          type="button"
                          className="ml-2 p-1 text-muted-foreground hover:text-destructive"
                          aria-label="Delete session"
                          disabled={creatingSession}
                          onClick={async (e) => {
                            e.preventDefault();
                            await handleDeleteSession(session.id);
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      </SidebarMenuItem>
                    );
                  })
                ) : (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled>
                      <span>No sessions</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarToggle isOpen={open} setIsOpen={toggleSidebar} />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chat</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chatItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userLoading || projectsLoading ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <span>Loading projects...</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : projectItems.length > 0 ? (
                projectItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="/project/new">
                      <Plus className="mr-2" size={16} />
                      <span>Create a project</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <InfoCard>
          <InfoCardContent>
            <InfoCardTitle>Introducing New Dashboard</InfoCardTitle>
            <InfoCardDescription>
              New Feature. New Platform. Same Feel.
            </InfoCardDescription>
            <InfoCardMedia
              media={[
                {
                  src: "https://cd-misc.s3.us-east-2.amazonaws.com/sidebar/third.webp",
                },
                {
                  src: "https://cd-misc.s3.us-east-2.amazonaws.com/sidebar/second.webp",
                },
                {
                  src: "https://cd-misc.s3.us-east-2.amazonaws.com/sidebar/first.webp",
                },
              ]}
            />
            <InfoCardFooter>
              <InfoCardDismiss>Dismiss</InfoCardDismiss>
              <InfoCardAction>
                <Link
                  href="#"
                  className="flex flex-row items-center gap-1 underline"
                >
                  Try it out <ExternalLink size={12} />
                </Link>
              </InfoCardAction>
            </InfoCardFooter>
          </InfoCardContent>
        </InfoCard>
        <SidebarGroup>
          <SidebarMenuButton className="w-full justify-between gap-3 h-12">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 rounded-md" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{user ? user.email.substring(0, 2).toUpperCase() : 'KL'}</span>
                <span className="text-xs text-muted-foreground">
                  {user ? user.email : 'kl@example.com'}
                </span>
              </div>
            </div>
            <ChevronsUpDown className="h-5 w-5 rounded-md" />
          </SidebarMenuButton>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  )
}
