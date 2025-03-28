import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { db } from "../../../lib/firebase-admin";

export const authOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_ID,
      clientSecret: process.env.TWITTER_SECRET,
      profile(profile) {
        return {
          id: profile.id_str,
          name: profile.name,
          email: null,
          image: profile.profile_image_url_https,
          username: profile.screen_name,
        };
      },
    }),
  ],
  adapter: FirestoreAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub;
        session.user.username = token.username;
        session.user.image = token.picture;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
