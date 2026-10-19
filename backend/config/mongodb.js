import mongoose from "mongoose";

// Operator injection ({"email": {"$ne": null}}) is blocked at the request
// level by middleware/security.js (rejectMongoOperators).
mongoose.set("strictQuery", true);

let connectionPromise = null;

// Reuses one connection per server instance. On serverless platforms the
// module stays loaded between warm invocations, so this avoids reconnecting
// (the slowest part of a cold request) on every call.
const connectDB = () => {
    if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
    if (connectionPromise) return connectionPromise;

    mongoose.connection.on("connected", () => console.log("DB connected"));
    mongoose.connection.on("error", (error) => console.error("DB connection error:", error.message));

    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
        dbName: "zyroDB",
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    }).catch((error) => {
        connectionPromise = null; // allow the next request to retry
        throw error;
    });

    return connectionPromise;
};

export default connectDB;
