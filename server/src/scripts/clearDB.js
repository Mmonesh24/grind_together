import mongoose from 'mongoose';
import env from '../config/env.js';

const clearDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB...');

    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      console.log(`🧹 Clearing collection: ${collection.collectionName}`);
      await collection.deleteMany({});
    }

    console.log('✨ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
};

clearDB();
