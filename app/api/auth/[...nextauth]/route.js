import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { db } from "../../../lib/firebase-admin";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Please provide NEXTAUTH_SECRET environment variable");
}

export const authOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_ID,
      clientSecret: process.env.TWITTER_SECRET,
      version: "2.0",
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "users.read tweet.read offline.access",
          code_challenge_method: "S256",
        },
      },
      profile(profile) {
        try {
          console.log("Twitter profile data:", profile);
          return {
            id: profile.data?.id || profile.id,
            name: profile.data?.username || profile.username,
            email: null,
            image: profile.data?.profile_image_url || profile.profile_image_url,
            username: profile.data?.username || profile.username,
          };
        } catch (error) {
          console.error("Error processing profile:", error);
          return {
            id: profile.id,
            name: profile.username,
            email: null,
            image: profile.profile_image_url,
            username: profile.username,
          };
        }
      },
      httpOptions: {
        timeout: 10000,
      },
    }),
  ],
  adapter: FirestoreAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug logs
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      try {
        console.log("JWT Callback - Token:", token);
        console.log("JWT Callback - Account:", account);
        console.log("JWT Callback - Profile:", profile);

        if (account && profile) {
          token.accessToken = account.access_token;
          token.id = profile.id;
          token.refreshToken = account.refresh_token;
          token.username = profile.username || profile.name;
        }
        return token;
      } catch (error) {
        console.error("Error in jwt callback:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        console.log("Session Callback - Session:", session);
        console.log("Session Callback - Token:", token);

        session.accessToken = token.accessToken;
        if (session.user) {
          session.user.id = token.id;
          session.user.username = token.username;
        }
        return session;
      } catch (error) {
        console.error("Error in session callback:", error);
        return session;
      }
    },
    async signIn({ account, profile }) {
      try {
        console.log("SignIn Callback - Account:", account);
        console.log("SignIn Callback - Profile:", profile);

        if (account?.provider === "twitter") {
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signIn(message) {
      console.log("User signed in:", message);
    },
    async signOut(message) {
      console.log("User signed out:", message);
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
