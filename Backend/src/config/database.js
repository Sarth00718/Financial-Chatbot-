import mongoose from "mongoose";

const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected");
    console.log("Database:", connection.connection.name);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export default connectDatabase;