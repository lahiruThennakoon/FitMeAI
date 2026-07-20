import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Better Auth route handler (AD-6). This is the only auth HTTP surface.
export const { POST, GET } = toNextJsHandler(auth);
