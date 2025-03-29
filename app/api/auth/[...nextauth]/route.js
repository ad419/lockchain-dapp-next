import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { db } from "../../../lib/firebase-admin";

export const authOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_ID,
      clientSecret: process.env.TWITTER_SECRET,
      version: "2.0", // Explicitly specify OAuth 2.0
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "users.read tweet.read offline.access",
        },
      },
    }),
  ],
  adapter: FirestoreAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/", // This ensures redirect back to home
    error: "/", // Error handling on home page
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Handle redirect after sign in
      return baseUrl;
    },
    async signIn({ user, account, profile }) {
      console.log("Twitter Sign-In Attempt:", {
        user,
        account,
        profile,
      });
      return true;
    },
  },

  // Detailed error handling
  events: {
    async signIn(message) {
      console.log("SignIn Event:", message);
    },
    async signOut(message) {
      console.log("SignOut Event:", message);
    },
    async createUser(message) {
      console.log("User Created:", message);
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
