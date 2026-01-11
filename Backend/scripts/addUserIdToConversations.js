/**
 * Migration Script: Add userId to existing conversations
 * 
 * This script adds a userId field to all existing conversations in the database.
 * Since we don't know which user owns old conversations, we'll need to either:
 * 1. Delete all existing conversations (recommended for development)
 * 2. Assign them to a specific user (if you know the user ID)
 * 
 * Run with: node scripts/addUserIdToConversations.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
import { Conversation } from '../src/models/Conversation.model.js';
import User from '../src/models/User.model.js';

async function migrateConversations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Count existing conversations without userId
    const conversationsWithoutUser = await Conversation.countDocuments({ 
      userId: { $exists: false } 
    });

    console.log(`\n📊 Found ${conversationsWithoutUser} conversations without userId`);

    if (conversationsWithoutUser === 0) {
      console.log('✅ All conversations already have userId. No migration needed.');
      process.exit(0);
    }

    console.log('\n⚠️  MIGRATION OPTIONS:');
    console.log('1. DELETE all existing conversations (recommended for development)');
    console.log('2. ASSIGN to first user in database');
    console.log('3. EXIT without changes');

    // For automated script, we'll delete old conversations
    // You can modify this based on your needs
    const option = process.env.MIGRATION_OPTION || '1';

    if (option === '1') {
      // Delete all conversations without userId
      const result = await Conversation.deleteMany({ 
        userId: { $exists: false } 
      });
      console.log(`\n🗑️  Deleted ${result.deletedCount} conversations`);
      console.log('✅ Migration complete. Users can now create new conversations.');
    } else if (option === '2') {
      // Assign to first user
      const firstUser = await User.findOne();
      if (!firstUser) {
        console.log('❌ No users found in database. Cannot assign conversations.');
        process.exit(1);
      }

      const result = await Conversation.updateMany(
        { userId: { $exists: false } },
        { $set: { userId: firstUser._id } }
      );
      console.log(`\n✅ Assigned ${result.modifiedCount} conversations to user: ${firstUser.email}`);
    } else {
      console.log('\n❌ Migration cancelled.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateConversations();
