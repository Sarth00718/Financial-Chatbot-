/**
 * Database Connection Configuration
 * Handles MongoDB connection setup
 */

import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
  try {
    // Connect to MongoDB using connection string from environment
    let connectionUri = process.env.MONGODB_URI;
    
    // If URI has query params but no database name, insert database name before query params
    if (connectionUri.includes('?')) {
      // Check if there's already a database name (path between last / and ?)
      const match = connectionUri.match(/\.net\/([^?]*)\?/);
      if (!match || !match[1]) {
        // No database name, insert it
        connectionUri = connectionUri.replace('?', `${DB_NAME}?`);
      }
    } else {
      // No query params, just append database name
      connectionUri = `${connectionUri}/${DB_NAME}`;
    }
    
    const connectionInstance = await mongoose.connect(connectionUri);

    console.log(
      `✅ MongoDB Connected Successfully!`
    );
    console.log(`📍 Database Host: ${connectionInstance.connection.host}`);
    console.log(`📦 Database Name: ${connectionInstance.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDatabase;
