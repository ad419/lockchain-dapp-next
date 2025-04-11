// pages/api/auth/[...nextauth].js or app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { db } from "../../../lib/firebase-admin";
import { authCache } from "../../../lib/cache";

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
        // console.log("Twitter profile data received:", profile.data.username);
        return {
          id: profile.data.id,
          name: profile.data.name,
          email: null,
          image: profile.data.profile_image_url,
          username: profile.data.username,
          twitterUsername: profile.data.username,
        };
      },
    }),
  ],
  adapter: FirestoreAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
    error: "/auth/error", // Add error page
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account && user) {
        // console.log("JWT callback - user authenticated:", user.username);
        token.username = user.username;
        token.accessToken = account.access_token;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.username = token.username;
      session.accessToken = token.accessToken;

      try {
        // Use cached user data if available
        const cacheKey = `user_${token.userId}`;

        if (authCache.has(cacheKey)) {
          const userData = authCache.get(cacheKey);
          session.user.username = userData.username;
          if (userData.profileImage) {
            session.user.profileImage = userData.profileImage;
          }
          return session;
        }

        // If no cached data, fetch from Firestore
        const userDoc = await db.collection("users").doc(session.user.id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          session.user.username = userData.username;

          if (userData.profileImage) {
            session.user.profileImage = userData.profileImage;
          }

          // Cache the user data
          authCache.set(cacheKey, userData);
        }
      } catch (error) {
        console.error("[next-auth][session] Firestore read error:", error);
        // Continue with session even if Firestore read fails
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // console.log("Redirect callback:", { url, baseUrl });

      // For auth callbacks, ensure they go to the right place
      if (url.startsWith("/api/auth/callback")) {
        return `${baseUrl}${url}`;
      }

      // Handle callback URL parameter properly
      if (url.startsWith("/api/auth/signin")) {
        const params = new URLSearchParams(url.split("?")[1]);
        const callbackUrl = params.get("callbackUrl");
        if (callbackUrl && callbackUrl.startsWith(baseUrl)) {
          return callbackUrl;
        }
      }

      // Standard redirects
      if (url.startsWith(baseUrl)) {
        return url;
      }

      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      try {
        // console.log("SignIn event - saving user data:", user.username);

        const userRef = db.collection("users").doc(user.id);
        await userRef.set(
          {
            name: user.name,
            email: user.email,
            image: user.image,
            username: profile.data.username,
            twitterId: profile.data.id,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Update cache
        authCache.set(`user_${user.id}`, {
          name: user.name,
          username: profile.data.username,
          image: user.image,
        });
      } catch (error) {
        console.error("[next-auth][signIn] Firebase error:", error);
      }
    },
  },
  logger: {
    error(code, ...message) {
      console.error(`[next-auth][error][${code}]`, ...message);
    },
    warn(code, ...message) {
      console.warn(`[next-auth][warn][${code}]`, ...message);
    },
    debug(code, ...message) {
      console.log(`[next-auth][debug][${code}]`, ...message);
    },
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
