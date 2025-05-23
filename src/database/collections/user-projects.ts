import type { CollectionConfig } from 'payload'

export const UserProjects: CollectionConfig = {
  slug: 'user_projects',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'ssh_credentials',
      type: 'array',
      fields: [
        {
          name: 'address',
          type: 'text',
        },
        {
          name: 'port',
          type: 'number',
        },
        {
          name: 'username',
          type: 'text',
        },
        {
          name: 'password',
          type: 'text',
        },
      ],
      required: false,
    },
    {
      name: 'public_address',
      type: 'text',
      required: false,
    },
    {
      name: 'internal_vector_store_address',
      type: 'text',
      required: false,
    },
    {
      name: 'project_sessions',
      type: 'relationship',
      relationTo: 'project_sessions',
      hasMany: true,
    },
  ]
}
