'use server';

import { getPayload, type Where, type PaginatedDocs } from 'payload';
import configPromise from '@payload-config';
import { revalidatePath } from 'next/cache';
import { UIMessage } from 'ai';
import { UIMessageSchema } from '@/database/schemas/ui-message-schema';

const getPayloadClient = async () => {
  const payload = await getPayload({
    config: configPromise,
  });
  return payload;
};

/**
 * Create a new session and associate it with a project.
 */
export const createSessionForProject = async (projectId: string | number, sessionData: Partial<Omit<any, 'id' | 'createdAt' | 'updatedAt'>> = {}): Promise<any | null> => {
  try {
    const payload = await getPayloadClient();

    // 1. Create the new session
    const newSession = await payload.create({
      collection: 'project_sessions',
      data: {
        ...sessionData,
        name: sessionData.name || `Session ${new Date().toISOString()}`, // Default name
      } as any,
    });

    if (!newSession) {
      throw new Error('Failed to create session');
    }

    // 2. Get the project (type assertion might be needed after fetch)
    const project = await payload.findByID({
      collection: 'user_projects',
      id: projectId,
      depth: 0, // Don't need full depth here
    });

    if (!project) {
      // Optionally delete the orphaned session or just log an error
      console.error(`Project with ID ${projectId} not found after creating session ${newSession.id}`);
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    // 3. Update the project's sessions relationship
    const existingSessions = Array.isArray(project.project_sessions)
        ? project.project_sessions.map((s: any) => (typeof s === 'object' && s !== null ? s.id : s)).filter(Boolean)
        : [];

    await payload.update({
      collection: 'user_projects',
      id: projectId,
      data: {
        project_sessions: [...existingSessions, newSession.id],
      } as any,
    });

    // Revalidate project page
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/projects'); // Also revalidate the list page

    return newSession;
  } catch (error) {
    console.error('Error creating session for project:', error);
    return null;
  }
};

export const getSessionById = async (id: string | number): Promise<any | null> => {
  try {
    const payload = await getPayloadClient();
    const session = await payload.findByID({
      collection: 'project_sessions',
      id: id,
    });
    return session;
  } catch (error) {
    console.error(`Error fetching session with ID ${id}:`, error);
    return null;
  }
};

export const updateSession = async (id: string | number, data: Partial<Omit<any, 'id' | 'createdAt' | 'updatedAt'>>): Promise<any | null> => {
  try {
    const payload = await getPayloadClient();
    const updatedSession = await payload.update({
      collection: 'project_sessions',
      id: id,
      data: data as any,
    });
    return updatedSession;
  } catch (error) {
    console.error(`Error updating session with ID ${id}:`, error);
    return null;
  }
};

export const deleteSession = async (id: string | number): Promise<boolean> => {
  try {
    const payload = await getPayloadClient();
    await payload.delete({
      collection: 'project_sessions',
      id: id,
    });
    return true;
  } catch (error) {
    console.error(`Error deleting session with ID ${id}:`, error);
    return false;
  }
};

interface FindSessionsArgs {
  where?: Where;
  sort?: string;
  limit?: number;
  page?: number;
  depth?: number;
}

export const findSessions = async ({ where, sort, limit, page, depth }: FindSessionsArgs = {}): Promise<PaginatedDocs<any> | null> => {
  try {
    const payload = await getPayloadClient();
    const results = await payload.find({
      collection: 'project_sessions',
      where,
      sort,
      limit,
      page,
      depth,
    });
    return results;
  } catch (error) {
    console.error('Error finding sessions:', error);
    return null;
  }
};

/**
 * Fetch all messages for a specific session, formatted for chat initialization.
 * @param sessionId - The ID of the session to fetch messages for.
 * @returns An array of messages formatted according to MessageSchema, or null if there's an error.
 */
export const getSessionMessages = async (sessionId: string | number): Promise<any[] | null> => {
  try {
    const payload = await getPayloadClient();
    const messagesResult = await payload.find({
      collection: 'session_messages',
      where: {
        project_session: {
          equals: sessionId,
        },
      },
      sort: 'createdAt',
      depth: 0,
    });

    if (!messagesResult.docs || messagesResult.docs.length === 0) {
      return [];
    }

    // Format messages according to MessageSchema and validate
    const formattedMessages = messagesResult.docs
      .map((msg: any) => {
        // Create a formatted message object
        const formattedMessage = {
          id: msg.id || msg.id.toString(),
          content: msg.content || '',
          role: msg.role || 'assistant',
          parts: msg.parts || [],
          annotations: msg.annotations || [],
          // createdAt is now expected to always exist on msg from DB due to schema changes
          createdAt: new Date(msg.createdAt), 
          plan: msg.plan || undefined,
          metadata: msg.metadata || undefined,
        };

        // Try to use rawData if available as it already might be properly formatted
        if (msg.rawData) {
          // If rawData exists and is already validated by the schema (during save)
          // Ensure rawData.createdAt is a Date object if it comes from JSON
          if (typeof msg.rawData.createdAt === 'string') {
            msg.rawData.createdAt = new Date(msg.rawData.createdAt);
          }
          // Validate rawData against MessageSchema to ensure it conforms, especially createdAt
          const rawDataValidationResult = UIMessageSchema.safeParse(msg.rawData);
          if (rawDataValidationResult.success) {
            return rawDataValidationResult.data;
          } else {
            console.warn(`Message ${msg.id} (rawData) failed validation:`, rawDataValidationResult.error.flatten());
            // Fallback to formattedMessage if rawData is invalid
          }
        }

        // Validate against MessageSchema
        const validationResult = UIMessageSchema.safeParse(formattedMessage);
        if (!validationResult.success) {
          console.warn(`Message ${msg.id} (formatted) failed validation:`, validationResult.error.flatten());
          return null; // Skip invalid messages
        }

        return validationResult.data;
      })
      .filter(Boolean); // Remove null entries (failed validation)

    return formattedMessages;
  } catch (error) {
    console.error(`Error fetching messages for session ${sessionId}:`, error);
    return null;
  }
};

/**
 * Saves or updates messages for a specific session and updates the session's message list.
 * @param sessionId - The ID of the session.
 * @param messages - An array of messages conforming to the Message schema.
 * @returns True if successful, false otherwise.
 */
export const saveSessionMessages = async (sessionId: string, messages: UIMessage[]): Promise<boolean> => {
  let success = true;
  const processedMessageDbIds = new Set<string | number>();

  try {
    const payload = await getPayloadClient();

    console.log(`[DEBUG] Using sessionId: ${sessionId} (${typeof sessionId}) for all operations.`);

    // --- Verify Session Existence --- 
    let existingSession: any;
    try {
      existingSession = await payload.findByID({
        collection: 'project_sessions',
        id: sessionId, // Use string sessionId directly
        depth: 0, // Don't need message details here
      });
      if (!existingSession) {
        console.error(`[ERROR] Session with ID ${sessionId} not found. Cannot save messages.`);
        return false;
      }
      console.log(`[DEBUG] Session found, current message count (if populated): ${existingSession.session_messages?.length ?? 0}`);
    } catch (sessionCheckError) {
      console.error(`[DEBUG] Error checking session existence:`, sessionCheckError);
      return false;
    }
    // --- End Session Verification ---

    // --- Process Each Message --- 
    for (const message of messages) { // message is now of type UIMessage
      const { ...messageDataFromInput } = message;

      // Ensure createdAt is a Date object before validation
      let preProcessedMessageData = { ...messageDataFromInput } as any; // Cast to any to handle potential UIMessage structure
      if (preProcessedMessageData.createdAt && typeof preProcessedMessageData.createdAt === 'string') {
        preProcessedMessageData.createdAt = new Date(preProcessedMessageData.createdAt);
      }

      const validationResult = UIMessageSchema.safeParse(preProcessedMessageData);
      if (!validationResult.success) {
        console.warn(`Skipping save for invalid message structure in session ${sessionId}:`, validationResult.error.flatten());
        continue; 
      }
      const validMessage = validationResult.data;
      const dbMessageDataToSave: {
        id: string;
        role: "system" | "user" | "assistant";
        parts: any[]; // Corresponds to UIMessagePartSchema[]
        project_session: string; // Changed to string
        metadata?: Record<string, unknown>;
        createdAt?: string;
      } = {
        id: validMessage.id,
        role: validMessage.role,
        parts: validMessage.parts,
        project_session: sessionId, // Use string sessionId
      };

      if (validMessage.metadata !== undefined) {
        dbMessageDataToSave.metadata = validMessage.metadata;
      }

      // If createdAt was present in the input message (and was a valid date),
      // pass it as an ISO string. Otherwise, the collection's hook will manage it.
      if (preProcessedMessageData.createdAt instanceof Date && !isNaN(preProcessedMessageData.createdAt.getTime())) {
        dbMessageDataToSave.createdAt = preProcessedMessageData.createdAt.toISOString();
      }

      try {
        const existing = await payload.find({
          collection: 'session_messages',
          where: {
            id: { equals: validMessage.id },
            project_session: { equals: sessionId }, // Use string sessionId
          },
          limit: 1,
          depth: 0,
        });

        let savedMessageDbId: string | number;
        if (existing.docs.length > 0) {
          savedMessageDbId = existing.docs[0].id;
          console.log(`[DEBUG] Updating existing message with DB ID: ${savedMessageDbId}`);
          await payload.update({
            collection: 'session_messages',
            id: savedMessageDbId,
            data: dbMessageDataToSave as any,
          });
          console.log(`[DEBUG] Successfully updated message ${validMessage.id}`);
        } else {
          console.log(`[DEBUG] Creating new message with id: ${validMessage.id}`);
          const createdMessage = await payload.create({
            collection: 'session_messages',
            data: dbMessageDataToSave as any,
          });
          savedMessageDbId = createdMessage.id;
          console.log(`[DEBUG] Successfully created message, DB ID: ${savedMessageDbId}`);
        }
        processedMessageDbIds.add(savedMessageDbId); // Add the DB ID of the processed message

      } catch (dbError) {
        console.error(`[ERROR] Failed to save message ${validMessage.id} for session ${sessionId}: ${(dbError as Error).message}`);
        success = false; // Mark failure if any message save fails
        // Continue processing other messages
      }
    }
    // --- End Message Processing --- 

    // --- Update Session's Message List --- 
    try {
      console.log(`[DEBUG] Updating session ${sessionId} message list.`);
      // Get current message IDs stored ON the session document (might be empty or just IDs)
      const currentSessionMessageIds = new Set(
         (existingSession.session_messages || []).map((m: any) => typeof m === 'object' ? m.id : m)
       );
       
      // Combine existing and newly processed IDs
      processedMessageDbIds.forEach(id => currentSessionMessageIds.add(id));
      const finalMessageIds = Array.from(currentSessionMessageIds);
      
      // Only update if the list has changed (or maybe always update to be safe?)
      // For simplicity, let's always update if we processed messages
      if (processedMessageDbIds.size > 0) {
         console.log(`[DEBUG] Final message ID list for session ${sessionId}:`, finalMessageIds);
          await payload.update({
            collection: 'project_sessions',
            id: sessionId, // Use string sessionId
            data: {
              // Cast to any[] to satisfy TS strictness, Payload handles ID arrays correctly
              session_messages: finalMessageIds as any[], 
            } as any,
          });
          console.log(`[DEBUG] Successfully updated session ${sessionId} with ${finalMessageIds.length} message relationships.`);
      } else {
         console.log(`[DEBUG] Session ${sessionId} did not require message list update.`);
      }
    } catch (sessionUpdateError) {
      console.error(`[ERROR] Failed to update session ${sessionId} message list:`, sessionUpdateError);
      success = false; // Mark failure if session update fails
    }
    // --- End Session Update --- 

    return success; // Return true only if all steps succeeded

  } catch (error) {
    console.error(`[ERROR] General error in saveSessionMessages for session ${sessionId}: ${(error as Error).message}`);
    return false;
  }
};

// Add functions for managing messages in a session if needed, e.g.:
// export const addMessageToSession = async (sessionId: string | number, messageId: string | number): Promise<any | null> => { ... };
// export const removeMessageFromSession = async (sessionId: string | number, messageId: string | number): Promise<any | null> => { ... };
