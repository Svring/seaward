import { CollectionConfig } from "payload";
import { UIMessageSchema } from "../schemas/ui-message-schema"; // New import

export const SessionMessages: CollectionConfig = {
  slug: 'session_messages',
  defaultSort: 'createdAt',
  admin: {},
  fields: [
    {
      name: 'id', // Changed from messageId to align with UIMessageSchema.id
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique message identifier, corresponds to UIMessage.id.',
      }
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: 'System', value: 'system' },
        { label: 'User', value: 'user' },
        { label: 'Assistant', value: 'assistant' }
      ]
    },
    {
      name: 'parts',
      type: 'json',
      required: true, // UIMessage always has parts
      validate: (value) => {
        try {
          if (value) {
            // UIMessageSchema.shape.parts is an array schema
            const result = UIMessageSchema.shape.parts.safeParse(value);
            if (!result.success) {
              return `Invalid parts structure: ${result.error.message}`;
            }
          }
          return true;
        } catch (error) {
          return 'Invalid parts structure due to an unexpected error.';
        }
      },
    },
    {
      name: 'metadata', // Added metadata field from UIMessageSchema
      type: 'json',
      admin: {
        description: 'Optional metadata for the message.',
      },
      required: false,
      validate: (value) => {
        if (value === null || value === undefined) return true; // Optional field
        const result = UIMessageSchema.shape.metadata.safeParse(value);
        if (!result.success) {
          return `Invalid metadata structure: ${result.error.message}`;
        }
        return true;
      }
    },
    {
      name: 'project_session',
      type: 'relationship',
      relationTo: 'project_sessions',
      required: true,
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        // 'id' field in the collection now corresponds to UIMessage.id
        // Payload typically manages its own 'id' field for documents if not specified.
        // If you're using the 'id' field from UIMessage as Payload's document ID,
        // ensure it's handled correctly (e.g. by making it the primary ID or ensuring uniqueness).
        // The 'id' field defined above is already marked unique.

        // Ensure createdAt is set, especially for new messages
        if (operation === 'create' && !data.createdAt) {
          data.createdAt = new Date().toISOString();
        } else if (data.createdAt && typeof data.createdAt === 'string') {
          // Ensure it's in ISO format if provided as string (e.g. from UIMessage metadata if you sync it)
          data.createdAt = new Date(data.createdAt).toISOString();
        } else if (operation === 'update' && data.createdAt === undefined) {
          // Avoid unsetting createdAt on update if not provided
          // delete data.createdAt; // Or keep existing
        }
        return data;
      }
    ]
  }
};
