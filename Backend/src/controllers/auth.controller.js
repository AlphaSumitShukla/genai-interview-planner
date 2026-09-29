const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const tokenBlacklistModel = require("../models/blacklist.model");
const { sendWelcomeEmail, verifyEmailServiceConfig } = require("../services/mail.service");

const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function generateToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === "string" && emailRegex.test(email.trim());
}

/**
 * Controller to register a new user with email, username & password.
 * Automatically dispatches a welcome email to the newly registered email address.
 */
async function registerUserController(req, res) {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const trimmedUsername = username.trim();

        const isUserAlreadyExists = await userModel.findOne({
            $or: [{ email: normalizedEmail }, { username: trimmedUsername }]
        });

        if (isUserAlreadyExists) {
            return res.status(400).json({ message: "An account with this email or username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            username: trimmedUsername,
            email: normalizedEmail,
            password: hashedPassword
        });

        console.log(`[AUTH] User registered successfully: ${user.username} (${user.email})`);

        // Track email delivery status for transparency in logs and responses
        let emailDelivery = {
            status: "pending",
            messageId: null,
            error: null
        };

        try {
            console.log(`[AUTH] Dispatching registration confirmation email to: ${user.email} (Username: ${user.username})...`);
            const mailResult = await sendWelcomeEmail(user.email, user.username);
            console.log(`[AUTH SUCCESS] Registration email successfully sent to ${user.email}! Message ID: ${mailResult.id}`);
            emailDelivery.status = "sent";
            emailDelivery.messageId = mailResult.id;
        } catch (emailErr) {
            console.error(`[AUTH ERROR] Failed to send registration email to ${user.email}:`, emailErr.message);
            emailDelivery.status = "failed";
            emailDelivery.error = emailErr.message;
        }

        return res.status(201).json({
            message: "User registered successfully. Please login to continue.",
            emailDelivery,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        });
    } catch (error) {
        console.error("Error in registerUserController:", error);
        return res.status(500).json({ message: "Internal server error during registration" });
    }
}

/**
 * Controller to login with email and password
 */
async function loginUserController(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await userModel.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                errorType: "USER_NOT_FOUND",
                message: "No account found with this email. Please register first."
            });
        }

        if (!user.password) {
            return res.status(400).json({
                message: "No password is set for this account. Please contact support or register again."
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = generateToken(user);

        res.cookie("token", token, COOKIE_OPTIONS);

        return res.status(200).json({
            message: "User logged in successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        });
    } catch (error) {
        console.error("Error in loginUserController:", error);
        return res.status(500).json({ message: "Internal server error during login" });
    }
}

/**
 * Controller to logout user and invalidate token
 */
async function logoutUserController(req, res) {
    try {
        const token = req.cookies?.token || req.headers?.authorization?.replace(/^Bearer\s+/i, "");

        if (token) {
            await tokenBlacklistModel.create({ token });
        }

        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax"
        });

        return res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        console.error("Error in logoutUserController:", error);
        return res.status(500).json({ message: "Failed to logout" });
    }
}

/**
 * Controller to fetch authenticated user profile
 */
async function getMeController(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "User fetched successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            }
        });
    } catch (error) {
        console.error("Error in getMeController:", error);
        return res.status(500).json({ message: "Failed to fetch user data" });
    }
}

/**
 * Controller to test and verify Gmail OAuth2 configuration
 */
async function verifyMailHealthController(req, res) {
    try {
        const result = await verifyEmailServiceConfig();
        return res.status(result.ready ? 200 : 503).json(result);
    } catch (err) {
        console.error("Error in verifyMailHealthController:", err);
        return res.status(500).json({
            ready: false,
            authenticated: false,
            message: err.message
        });
    }
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController,
    verifyMailHealthController
};