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
      profile(profile) {
        console.log("Twitter profile data:", profile.data);
        return {
          id: profile.data.id,
          name: profile.data.name,
          email: null,
          image: profile.data.profile_image_url,
          username: profile.data.username,
        };
      },
    }),
  ],
  adapter: FirestoreAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          userId: user.id,
          username: user.username,
          twitterHandle: user.username,
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId;
        session.user.username = token.username;
        session.user.twitterHandle = token.twitterHandle;
        session.accessToken = token.accessToken;

        console.log("Session user data:", {
          id: session.user.id,
          username: session.user.username,
          twitterHandle: session.user.twitterHandle,
        });
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/api/auth/signin")) {
        const callbackUrl = new URL(url, baseUrl).searchParams.get(
          "callbackUrl"
        );
        return callbackUrl || baseUrl;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
