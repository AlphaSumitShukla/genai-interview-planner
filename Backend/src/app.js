const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000"
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Allow configured frontend origin or local dev
        if (
            allowedOrigins.includes(origin) ||
            /\.vercel\.app$/.test(new URL(origin).hostname) ||
            process.env.NODE_ENV !== "production"
        ) {
            return callback(null, true);
        }

        return callback(null, true);
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"]
}));

// Root health check endpoints
app.get("/", (req, res) => {
    res.status(200).json({
        message: "GenAI Interview Planner Backend API is operational.",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString()
    });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

module.exports = app;

