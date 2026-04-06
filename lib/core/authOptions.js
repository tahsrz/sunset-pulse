import connectDB from '@/lib/core/database';
import User from '@/models/User';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      await connectDB();
      const userExists = await User.findOne({ email: profile.email });
      if (!userExists) {
        const username = profile.name.slice(0, 20);
        await User.create({
          email: profile.email,
          username,
          image: profile.picture,
        });
      }
      return true;
    },
    async session({ session }) {
      // Pull only the necessary fields for the user session
      const user = await User.findOne({ email: session.user.email })
        .select('isAdvancedMode customKeybind role');
      
      if (user) {
        session.user.id = user._id.toString();
        session.user.isAdvancedMode = user.isAdvancedMode || false;
        session.user.customKeybind = user.customKeybind || 'P';
        session.user.role = user.role || 'user';
      }
      return session;
    },
  },
};
