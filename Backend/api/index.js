const app = require("../src/app");
const connectDB = require("../src/config/database");

module.exports = async (req, res) => {
    try {
        await connectDB();
    } catch (err) {
        console.error("Database connection failed in serverless handler:", err);
    }
    return app(req, res);
};
