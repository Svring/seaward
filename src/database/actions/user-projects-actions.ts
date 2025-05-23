'use server';

import { getPayload, type Where, type PaginatedDocs } from 'payload';
import configPromise from '@payload-config';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { UserProject, ProjectSession } from '@/payload-types';

const getPayloadClient = async () => {
  const payload = await getPayload({
    config: configPromise,
  });
  return payload;
};

/**
 * Create a new user project and automatically associate it with the current user
 */
export const createUserProject = async (data: Omit<UserProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProject | null> => {
  try {
    const payload = await getPayloadClient();
    
    // Get the current authenticated user
    const headersList = await headers();
    const { user } = await payload.auth({ headers: headersList });
    
    if (!user) {
      throw new Error('You must be logged in to create a project');
    }
    
    // Create the project
    const newProject = await payload.create({
      collection: 'user_projects',
      data: data as any,
    });

    if (!newProject) {
      throw new Error('Failed to create the project');
    }
    
    // Get the user's current projects
    const currentUser = await payload.findByID({
      collection: 'users',
      id: user.id,
    });
    
    if (!currentUser) {
      throw new Error('Failed to find the current user');
    }
    
    // Associate the new project with the user
    const existingProjects = currentUser.projects || [];
    const projectIds = Array.isArray(existingProjects) 
      ? existingProjects.map(p => typeof p === 'object' && p !== null ? p.id : p)
        .filter(id => id !== undefined && id !== null)
      : [];
      
    // Add the new project ID if it's not already in the list
    if (!projectIds.includes(newProject.id)) {
      // Update the user with the new project
      await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          projects: [...projectIds, newProject.id]
        }
      });
    }
    
    // Revalidate related pages
    revalidatePath('/projects');
    revalidatePath('/');
    
    return newProject;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error; // Re-throw to allow form to handle the error
  }
};

export const getUserProjectById = async (id: string | number, depth?: number): Promise<UserProject | null> => {
  try {
    const payload = await getPayloadClient();
    const project = await payload.findByID({
      collection: 'user_projects',
      id: id,
      depth: depth,
    });
    return project;
  } catch (error) {
    console.error(`Error fetching project with ID ${id}:`, error);
    return null;
  }
};

/**
 * Update an existing user project.
 * @param projectId - The ID of the project to update.
 * @param data - The partial data to update (e.g., { name: 'New Name' }).
 * @returns The updated project or null if there's an error.
 */
export const updateUserProject = async (projectId: string | number, data: Partial<Omit<UserProject, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserProject | null> => {
  try {
    const payload = await getPayloadClient();
    const updatedProject = await payload.update({
      collection: 'user_projects',
      id: projectId,
      data: data as any,
    });

    if (updatedProject) {
      // Revalidate the specific project page and the projects list page
      revalidatePath(`/projects/${projectId}`);
      revalidatePath('/projects');
    }

    return updatedProject;
  } catch (error) {
    console.error(`Error updating project with ID ${projectId}:`, error);
    return null;
  }
};

export const deleteUserProject = async (id: string | number): Promise<boolean> => {
  try {
    const payload = await getPayloadClient();
    await payload.delete({
      collection: 'user_projects',
      id: id,
    });
    return true;
  } catch (error) {
    console.error(`Error deleting project with ID ${id}:`, error);
    return false;
  }
};

interface FindUserProjectsArgs {
  where?: Where;
  sort?: string;
  limit?: number;
  page?: number;
  depth?: number;
}

export const findUserProjects = async ({ where, sort, limit, page, depth }: FindUserProjectsArgs = {}): Promise<PaginatedDocs<UserProject> | null> => {
  try {
    const payload = await getPayloadClient();
    const results = await payload.find({
      collection: 'user_projects',
      where,
      sort,
      limit,
      page,
      depth,
    });
    return results;
  } catch (error) {
    console.error('Error finding projects:', error);
    return null;
  }
};
