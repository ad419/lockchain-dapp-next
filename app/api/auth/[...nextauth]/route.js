import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { db } from "../../../lib/firebase-admin";

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
        },
      },
    }),
  ],
  adapter: FirestoreAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always redirect to homepage after auth
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
    async session({ session, token, user }) {
      // Add user data to session
      session.user = user;
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
