import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ url }) => {
      // No email provider is configured yet (see Step 1 limitations) — logging
      // the reset link to the server console lets it work end-to-end in dev
      // and gives an operator a way to hand a user their link manually.
      // Before this goes to real users, wire this up to an actual email
      // service (e.g. Resend) instead of logging it.
      console.log(`[auth] Password reset requested. Reset link: ${url}`);
    },
  },
  plugins: [nextCookies()],
});
