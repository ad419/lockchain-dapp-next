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
          console.log(
            "Raw Twitter profile data:",
            JSON.stringify(profile, null, 2)
          );
          console.log("Profile data type:", typeof profile);
          console.log("Profile data keys:", Object.keys(profile));

          // Twitter API v2 returns data nested under a data property
          const userData = profile.data;
          console.log("User data:", JSON.stringify(userData, null, 2));

          if (!userData || !userData.id) {
            console.error("Invalid profile structure:", {
              hasData: !!userData,
              hasId: userData?.id,
              userData,
            });
            throw new Error("Invalid profile data structure");
          }

          const result = {
            id: userData.id,
            name: userData.name,
            email: null,
            image: userData.profile_image_url,
            username: userData.username,
          };
          console.log("Processed profile result:", result);
          return result;
        } catch (error) {
          console.error("Error processing profile:", error);
          throw error;
        }
      },
      httpOptions: {
        timeout: 10000,
      },
    }),
  ],
  adapter: FirestoreAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/", // Redirect to home page for sign in
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
          token.image = profile.image;
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

        if (session.user) {
          session.user.id = token.id;
          session.user.username = token.username;
          session.user.image = token.image;
        }
        session.accessToken = token.accessToken;
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
