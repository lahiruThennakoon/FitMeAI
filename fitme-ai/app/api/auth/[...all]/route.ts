import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth route handler (AD-6). This is the only auth HTTP surface.
// Rate limiting for /api/auth/* lives in middleware (avoids double-counting).
export const { POST, GET } = toNextJsHandler(auth);
