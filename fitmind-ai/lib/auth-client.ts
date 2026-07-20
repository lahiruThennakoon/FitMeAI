import { createAuthClient } from "better-auth/react";

/**
 * Better Auth browser client (AD-6). Used by client components for sign-in/up.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
