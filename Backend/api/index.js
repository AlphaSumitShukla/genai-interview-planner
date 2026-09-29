// Polyfill browser globals for headless Node.js serverless runtimes
if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = class ImageData {};
}
if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = class Path2D {};
}

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
