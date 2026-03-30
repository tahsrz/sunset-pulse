import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Check if GoogleProvider is a function or needs .default
const actualGoogleProvider = GoogleProvider.default || GoogleProvider;

export const authOptions = {
  providers: [
    actualGoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    // If you have callbacks (like the one we used for the real estate site), 
    // make sure they don't reference "this" or "undefined" variables
    async signIn({ profile }) {
      return true;
    },
    async session({ session, token }) {
      return session;
    },
  },
};

// NextAuth initialization
const handler = NextAuth.default ? NextAuth.default(authOptions) : NextAuth(authOptions);

export { handler as GET, handler as POST };