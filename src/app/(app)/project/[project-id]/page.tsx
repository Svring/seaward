'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getUserProjectById } from '@/database/actions/user-projects-actions';
import type { UserProject } from '@/payload-types';
import ProjectInfoDisplay from '@/components/ui/project-info-display';

export default function ProjectDetailsPage() {
  const params = useParams<{ 'project-id': string }>();
  const projectId = params['project-id'];
  const [project, setProject] = useState<UserProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      const fetchProject = async () => {
        try {
          setLoading(true);
          const projectData = await getUserProjectById(projectId);
          if (projectData) {
            setProject(projectData);
          } else {
            setError('Project not found.');
          }
        } catch (err) {
          setError('Failed to load project details.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchProject();
    }
  }, [projectId]);

  return <ProjectInfoDisplay project={project} loading={loading} error={error} />;
}
