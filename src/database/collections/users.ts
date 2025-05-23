import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    tokenExpiration: 7200,
  },
  fields: [
    {
      name: 'username',
      type: 'text',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'user'],
    },
    {
      name: 'projects',
      type: 'relationship',
      relationTo: 'user_projects',
      hasMany: true,
    },
    {
      name: 'certificate_authority_data',
      type: 'text',
      required: false,
    }
  ],
  access: {
    admin: ({ req: { user } }) => {
      return user?.role === 'admin';
    },
  },
}
