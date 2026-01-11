/**
 * Clear Database Script
 * Removes all data from MongoDB collections
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const clearDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(`📦 Found ${collections.length} collections\n`);

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`🗑️  Clearing collection: ${collectionName}`);
      await db.collection(collectionName).deleteMany({});
      const count = await db.collection(collectionName).countDocuments();
      console.log(`   ✅ Cleared (${count} documents remaining)\n`);
    }

    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

clearDatabase();
