import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'pehnavaImagesDrive',
  access: (allow) => ({
    'photos/*': [
      allow.authenticated.to(['read','write']),
      allow.guest.to(['read', 'write']),
    ],
  })
});