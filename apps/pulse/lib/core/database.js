import mongoose from 'mongoose';
import { assertSafeMongoConnection } from './runtimeSafety.js';

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  // If the database is already connected, don't connect again
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Connect to MongoDB
  try {
    assertSafeMongoConnection(process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    if (process.env.MONGODB_DEBUG_LOGS === 'true') {
      console.log('MongoDB connected...');
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Database connection failed');
  }
};

export default connectDB;
