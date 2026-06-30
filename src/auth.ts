import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { neon } from "@neondatabase/serverless";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google, GitHub],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) return false;

      const sql = neon(process.env.DATABASE_URL!);

      // Check if user exists
      const existing = await sql`SELECT * FROM users WHERE email = ${user.email}`;

      if (existing.length > 0) {
        // Update last login
        await sql`UPDATE users SET last_login = NOW(), name = ${user.name || existing[0].name}, avatar_url = ${user.image || existing[0].avatar_url} WHERE id = ${existing[0].id}`;
        return true;
      }

      // New user — check invite code requirement
      // For now, allow all sign-ups (invite enforcement can be toggled via env)
      const requireInvite = process.env.REQUIRE_INVITE === "true";
      if (requireInvite) {
        // New users without invite are blocked — they'd need to go through /login?invite=CODE flow
        return false;
      }

      // Create new user
      const username = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-");
      await sql`
        INSERT INTO users (email, name, username, avatar_url, provider, provider_id, last_login)
        VALUES (${user.email}, ${user.name || null}, ${username}, ${user.image || null}, ${account.provider}, ${account.providerAccountId}, NOW())
      `;

      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const sql = neon(process.env.DATABASE_URL!);
        const result = await sql`SELECT id, username FROM users WHERE email = ${session.user.email}`;
        if (result.length > 0) {
          session.user.id = String(result[0].id);
          session.user.username = result[0].username as string;
        }
      }
      return session;
    },
  },
});
