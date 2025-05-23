'use server';

import { getPayload, type Where, type PaginatedDocs } from 'payload';
import configPromise from '@payload-config';
import { UIMessageSchema } from '@/database/schemas/ui-message-schema';

const getPayloadClient = async () => {
  const payload = await getPayload({
    config: configPromise,
  });
  return payload;
};

// Define a TypeScript type that matches the UIMessageSchema
type UIMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: Array<any>; // Using any for simplicity, but this should match UIMessagePartSchema
  metadata?: Record<string, unknown>;
};

export const createMessage = async (data: Omit<UIMessage, 'id'> & { project_session: string | number }): Promise<any | null> => {
  try {
    const payload = await getPayloadClient();
    
    // Validate against UIMessageSchema
    const validationResult = UIMessageSchema.safeParse({
      id: crypto.randomUUID(), // Generate ID if not provided
      role: data.role,
      parts: data.parts,
      metadata: data.metadata
    });
    
    if (!validationResult.success) {
      console.error('Invalid message data:', validationResult.error.flatten());
      return null;
    }
    
    const validMessage = validationResult.data;
    
    // Create the message data object with validated data plus project_session
    const messageData: {
      id: string;
      role: 'system' | 'user' | 'assistant';
      parts: Array<any>;
      project_session: string | number;
      metadata?: Record<string, unknown>;
    } = {
      id: validMessage.id,
      role: validMessage.role,
      parts: validMessage.parts,
      project_session: data.project_session,
    };
    
    // Add metadata if it exists in the validated message
    if (validMessage.metadata !== undefined) {
      messageData.metadata = validMessage.metadata;
    }
    
    const newMessage = await payload.create({
      collection: 'session_messages',
      data: messageData as any,
    });
    return newMessage;
  } catch (error) {
    console.error('Error creating message:', error);
    return null;
  }
};

export const getMessageById = async (id: string | number): Promise<any | null> => {
  try {
    const payload = await getPayloadClient();
    const message = await payload.findByID({
      collection: 'session_messages',
      id: id,
    });
    return message;
  } catch (error) {
    console.error(`Error fetching message with ID ${id}:`, error);
    return null;
  }
};

export const updateMessage = async (id: string | number, data: Partial<UIMessage>): Promise<any | null> => {
  try {
    const payload = await getPayloadClient();
    
    // Get the existing message first
    const existingMessage = await payload.findByID({
      collection: 'session_messages',
      id: id,
    });
    
    if (!existingMessage) {
      console.error(`Message with ID ${id} not found`);
      return null;
    }
    
    // Prepare update data
    const updateData: Record<string, any> = {};
    
    // Only include fields that are in the UIMessageSchema
    if (data.role !== undefined) updateData.role = data.role;
    if (data.parts !== undefined) updateData.parts = data.parts;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    
    const updatedMessage = await payload.update({
      collection: 'session_messages',
      id: id,
      data: updateData,
    });
    return updatedMessage;
  } catch (error) {
    console.error(`Error updating message with ID ${id}:`, error);
    return null;
  }
};

export const deleteMessage = async (id: string | number): Promise<boolean> => {
  try {
    const payload = await getPayloadClient();
    await payload.delete({
      collection: 'session_messages',
      id: id,
    });
    return true;
  } catch (error) {
    console.error(`Error deleting message with ID ${id}:`, error);
    return false;
  }
};

interface FindMessagesArgs {
  where?: Where;
  sort?: string;
  limit?: number;
  page?: number;
  depth?: number;
}

export const findMessages = async ({ where, sort = 'createdAt', limit, page, depth }: FindMessagesArgs = {}): Promise<PaginatedDocs<any> | null> => {
  try {
    const payload = await getPayloadClient();
    const results = await payload.find({
      collection: 'session_messages',
      where,
      sort,
      limit,
      page,
      depth,
    });
    return results;
  } catch (error) {
    console.error('Error finding messages:', error);
    return null;
  }
};
