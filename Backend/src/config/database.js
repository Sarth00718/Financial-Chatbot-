import mongoose from "mongoose";

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI?.trim();
  const localFallbackUri = "mongodb://localhost:27017/finchatbot";
  const primaryUri = mongoUri && mongoUri.length > 0 ? mongoUri : localFallbackUri;

  try {
    const connection = await mongoose.connect(primaryUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ MongoDB Connected");
    console.log("Database:", connection.connection.name);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message || err);

    if (process.env.NODE_ENV === "development" && primaryUri !== localFallbackUri) {
      console.warn("Attempting local MongoDB fallback at", localFallbackUri);
      try {
        const connection = await mongoose.connect(localFallbackUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000,
        });
        console.log("✅ MongoDB Connected using local fallback");
        console.log("Database:", connection.connection.name);
        return;
      } catch (fallbackErr) {
        console.error("Local MongoDB fallback failed:", fallbackErr.message || fallbackErr);
      }
    }

    process.exit(1);
  }
};

export default connectDatabase;