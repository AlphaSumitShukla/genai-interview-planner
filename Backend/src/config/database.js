const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
    if (isConnected || mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    try {
        const db = await mongoose.connect(process.env.MONGO_URI);
        isConnected = db.connections[0].readyState === 1;
        console.log("Database connected successfully");
        return db;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
}

module.exports = connectDB;