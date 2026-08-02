import mongoose from "mongoose";
import logger from "../utils/logger.js";

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI?.trim();
  const localFallbackUri = "mongodb://localhost:27017/finchatbot";
  const primaryUri = mongoUri && mongoUri.length > 0 ? mongoUri : localFallbackUri;

  try {
    const connection = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 10000,
    });

    logger.info("✅ MongoDB Connected");
    logger.info("Database:", connection.connection.name);
  } catch (err) {
    logger.error("MongoDB connection failed:", err.message || err);

    if (process.env.NODE_ENV === "development" && primaryUri !== localFallbackUri) {
      logger.warn("Attempting local MongoDB fallback at", localFallbackUri);
      try {
        const connection = await mongoose.connect(localFallbackUri, {
          serverSelectionTimeoutMS: 10000,
        });
        logger.info("✅ MongoDB Connected using local fallback");
        logger.info("Database:", connection.connection.name);
        return;
      } catch (fallbackErr) {
        logger.error("Local MongoDB fallback failed:", fallbackErr.message || fallbackErr);
      }
    }

    process.exit(1);
  }
};

export default connectDatabase;