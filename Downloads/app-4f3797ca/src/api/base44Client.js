import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "690f5069eba76d864f3797ca", 
  requiresAuth: true // Ensure authentication is required for all operations
});
