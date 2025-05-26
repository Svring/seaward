'use client';

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CircleAlert,
  Clock,
  Code,
  FileText,
  Github,
  Globe,
  Info,
  Layers,
  LayoutGrid,
  LineChart,
  Settings,
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";
import type { UserProject } from '@/payload-types'; // Added UserProject import
import { HoverPeek } from "@/components/ui/link-preview"
import { Button } from "./button";
import { activateGalateaForSSHDevice } from "@/providers/galatea-provider/galatea-provider";
import { useTransition } from "react";
import { updateUserProject } from '@/database/actions/user-projects-actions';

interface ProjectStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

interface TeamMember {
  name: string;
  role: string;
  avatar: string;
}

// Modified to accept props as requested
interface ProjectInfoDisplayProps {
  project: UserProject | null;
  loading: boolean;
  error: string | null;
}

// Helper function to format date
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


const ProjectInfoDisplay: React.FC<ProjectInfoDisplayProps> = ({ project, loading, error }) => {
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Project not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Dummy data for sections not covered by UserProject, can be removed or adapted
  const projectStats: ProjectStat[] = [
    { label: "Components", value: project.project_sessions?.length || 0, icon: <Layers size={18} /> },
    // Add more relevant stats if available from UserProject or related data
    { label: "Status", value: "Active", icon: <Info size={18} /> }, // Placeholder
  ];

  const teamMembers: TeamMember[] = [
    // This section would typically come from related data, not directly in UserProject
    // { name: "Alex Johnson", role: "Lead Developer", avatar: "https://i.pravatar.cc/100?img=1" },
  ];

  // Health check state
  const [healthStatus, setHealthStatus] = useState<'controlled' | 'uncontrolled' | 'unknown'>('unknown');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Editable project name state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(project?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let interval: number | null = null;
    const checkHealth = async () => {
      if (!project?.public_address) {
        setHealthStatus('unknown');
        return;
      }
      try {
        const res = await fetch(`${project.public_address.replace(/\/$/, '')}/galatea/api/health`, { method: 'GET' });
        if (res.status === 200) {
          setHealthStatus('controlled');
        } else {
          setHealthStatus('uncontrolled');
        }
      } catch {
        setHealthStatus('uncontrolled');
      }
    };
    if (project?.public_address) {
      checkHealth(); // Initial check
      interval = window.setInterval(checkHealth, 10000); // Check every 10 seconds
    } else {
      setHealthStatus('unknown');
    }
    return () => {
      if (interval !== null) window.clearInterval(interval);
    };
  }, [project?.public_address]);

  useEffect(() => {
    setNameInput(project?.name || '');
  }, [project?.name]);

  const handleNameSave = async () => {
    if (!project) return;
    setNameLoading(true);
    setNameError(null);
    try {
      const updated = await updateUserProject(project.id, { name: nameInput });
      if (!updated) throw new Error('Failed to update project name');
      setEditingName(false);
    } catch (err: any) {
      setNameError(err?.message || 'Failed to update project name');
    } finally {
      setNameLoading(false);
    }
  };

  async function handleUploadGalatea(formData?: FormData) {
    if (!project?.ssh_credentials || project.ssh_credentials.length === 0) return;
    setUploadError(null);
    setUploadSuccess(false);
    const cred = project.ssh_credentials[0];
    const sshConfig = {
      host: cred.address ?? '',
      port: cred.port ?? undefined,
      username: cred.username ?? '',
      password: cred.password ?? undefined,
    };
    try {
      await activateGalateaForSSHDevice(sshConfig);
      setUploadSuccess(true);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to activate Galatea.');
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl bg-background text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-2">
            {editingName ? (
              <>
                <input
                  className="text-3xl font-bold bg-background border rounded px-2 py-1 mr-2 focus:outline-none focus:ring"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  disabled={nameLoading}
                  autoFocus
                />
                <button
                  className="text-primary font-semibold mr-1"
                  onClick={handleNameSave}
                  disabled={nameLoading || !nameInput.trim()}
                >
                  {nameLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="text-muted-foreground"
                  onClick={() => { setEditingName(false); setNameInput(project?.name || ''); }}
                  disabled={nameLoading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <button
                  className="ml-2 text-muted-foreground hover:text-primary underline text-sm"
                  onClick={() => setEditingName(true)}
                  title="Edit project name"
                >
                  Edit
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock size={14} />
              <span>Updated {formatDate(project.updatedAt)}</span>
            </Badge>
            {/* project.status is not in UserProject, add if available */}
            {/* <Badge variant={"default"}>Active</Badge> */}
          </div>
        </div>
        {nameError && <div className="text-red-600 text-xs mt-1">{nameError}</div>}

        {/* Quick Stats - Adapted to UserProject */}
        {projectStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projectStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Project Details</h2>
                  {/* project.version is not in UserProject, add if available */}
                  {/* <Badge variant="outline">v{project.version}</Badge> */}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground flex items-center gap-2">Public Address:
                    {healthStatus === 'controlled' && (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                        <CheckCircle size={14} className="text-green-600" /> Controlled
                      </span>
                    )}
                    {healthStatus === 'uncontrolled' && (
                      <span className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                        <XCircle size={14} className="text-red-600" /> Uncontrolled
                        <Button
                          className="ml-2 bg-transparent text-foreground rounded ring-1 ring-foreground/10"
                          onClick={() => startTransition(() => handleUploadGalatea())}
                          disabled={isPending}
                        >
                          {isPending ? 'Activating...' : 'Activate Galatea'}
                        </Button>
                      </span>
                    )}
                    {healthStatus === 'unknown' && (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs font-semibold">
                        <Clock size={12} /> Checking...
                      </span>
                    )}
                  </h3>
                  {/* Feedback for upload */}
                  {uploadError && (
                    <div className="text-red-600 text-xs mt-1">{uploadError}</div>
                  )}
                  {uploadSuccess && (
                    <div className="text-green-600 text-xs mt-1">Galatea activated and started successfully.</div>
                  )}
                  <HoverPeek url={project.public_address || 'N/A'}>
                    <a
                      href={project.public_address || 'N/A'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {project.public_address || 'N/A'}
                    </a>
                  </HoverPeek>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground">Internal Vector Store Address:</h3>
                  <p>{project.internal_vector_store_address || 'N/A'}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground">Public Vector Store Address:</h3>
                  {project.public_vector_store_address ? (
                    <a
                      href={project.public_vector_store_address}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {project.public_vector_store_address}
                    </a>
                  ) : (
                    <p>N/A</p>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground">Created At:</h3>
                  <p>{formatDate(project.createdAt)}</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground">Last Updated:</h3>
                  <p>{formatDate(project.updatedAt)}</p>
                </div>


                {project.ssh_credentials && project.ssh_credentials.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">SSH Credentials</h3>
                      <div className="space-y-4">
                        {project.ssh_credentials.map((cred, index) => (
                          <Card key={cred.id || index} className="bg-muted/50">
                            <CardContent className="p-4 space-y-1">
                              <p><strong>Address:</strong> {cred.address || 'N/A'}</p>
                              {cred.port && <p><strong>Port:</strong> {cred.port}</p>}
                              {cred.username && <p><strong>Username:</strong> {cred.username}</p>}
                              {/* Password is intentionally not displayed */}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Example of other tabs/sections if more data becomes available */}
            {/* 
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Other Information</h2>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">More Details</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview">
                    <p>This is an overview tab.</p>
                  </TabsContent>
                  <TabsContent value="details">
                    <p>This tab contains more details.</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            */}
          </div>

          {/* Right Column (can be used for related actions, team members, etc.) */}
          <div className="space-y-6">
            {teamMembers.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Team</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Quick Actions</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <QuickActionButton icon={<LayoutGrid size={18} />} label="Dashboard" />
                  <QuickActionButton icon={<Settings size={18} />} label="Settings" />
                  {/* Add more actions relevant to the project */}
                </div>
              </CardContent>
            </Card>

            {/* Example: Technologies Used - if this data is available */}
            {/*
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">Technologies</h2>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Next.js</Badge>
                  <Badge variant="secondary">Payload CMS</Badge>
                  <Badge variant="secondary">Tailwind CSS</Badge>
                </div>
              </CardContent>
            </Card>
            */}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Simplified QuickActionButton, can be expanded
const QuickActionButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 rounded-lg border hover:bg-accent transition-colors"
    >
      <div className="text-primary mb-1">{icon}</div>
      <span className="text-sm">{label}</span>
    </button>
  );
};

export default ProjectInfoDisplay; 