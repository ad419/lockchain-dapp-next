// pages/api/auth/[...nextauth].js or app/api/auth/[...nextauth]/route.js
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
        // console.log("[next-auth][debug][TWITTER_PROFILE]", profile);
        // Store username in user object
        return {
          id: profile.data.id,
          name: profile.data.name,
          email: null,
          image: profile.data.profile_image_url,
          username: profile.data.username, // Twitter handle
          twitterUsername: profile.data.username, // Backup field
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
    async jwt({ token, user, account, profile }) {
      // console.log("[next-auth][debug][JWT_CALLBACK_INPUT]", { user });

      // Initial sign in
      if (account && user) {
        token.username = user.username;
        token.accessToken = account.access_token;
        token.userId = user.id;
      }

      // console.log("[next-auth][debug][JWT_CALLBACK_OUTPUT]", token);
      return token;
    },
    async session({ session, token, user }) {
      // console.log("[next-auth][debug][SESSION_CALLBACK_INPUT]", { token });

      // Send properties to the client
      session.user.id = token.userId;
      session.user.username = token.username;
      session.accessToken = token.accessToken;

      try {
        // Fetch user data from Firestore
        const userDoc = await db.collection("users").doc(session.user.id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          session.user.username = userData.username;
          // console.log(
          //   "[next-auth][debug][FIREBASE_READ]",
          //   "Username fetched from Firestore"
          // );
        }
      } catch (error) {
        console.error("[next-auth][debug][FIREBASE_READ_ERROR]", error);
      }

      // console.log("[next-auth][debug][SESSION_CALLBACK_OUTPUT]", session);
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
  events: {
    async signIn({ user, account, profile }) {
      // console.log("[next-auth][debug][SIGNIN_EVENT]", { user, profile });

      try {
        // Save user data to Firestore including Twitter username
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

        // console.log(
        //   "[next-auth][debug][FIREBASE_SAVE]",
        //   "User data saved to Firestore"
        // );
      } catch (error) {
        console.error("[next-auth][debug][FIREBASE_ERROR]", error);
      }
    },
    async session({ session, token }) {
      // console.log("[next-auth][debug][SESSION_EVENT]", { session, token });
    },
  },
  debug: true, // Enable debug logs
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
