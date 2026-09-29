/**
 * Mail Service for GenAI Interview Planner
 * Uses Google OAuth2 credentials from .env to securely send emails via Gmail API.
 */
require("dotenv").config();
const MailComposer = require("nodemailer/lib/mail-composer");

let cachedAccessToken = null;
let tokenExpiresAt = 0;

function getEmailCredentials() {
    const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
    const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || "").trim();
    const emailUser = (process.env.EMAIL_USER || "").trim();

    return { clientId, clientSecret, refreshToken, emailUser };
}

/**
 * Obtain a fresh Google OAuth2 access token using refresh token.
 */
async function getAccessToken() {
    const now = Date.now();
    if (cachedAccessToken && now < tokenExpiresAt - 60000) {
        return cachedAccessToken;
    }

    const { clientId, clientSecret, refreshToken, emailUser } = getEmailCredentials();

    const missing = [];
    if (!clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    if (!refreshToken) missing.push("GOOGLE_REFRESH_TOKEN");

    if (missing.length > 0) {
        throw new Error(`Missing required Google OAuth credentials in environment variables: ${missing.join(", ")}`);
    }

    let response;
    try {
        response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token"
            })
        });
    } catch (networkErr) {
        console.error("[MAIL SERVICE NETWORK ERROR] Failed to reach Google OAuth endpoint:", networkErr.message);
        throw new Error(`Google OAuth2 connection failed: ${networkErr.message}`);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.access_token) {
        const errorDesc = data.error_description || data.error || `HTTP ${response.status} ${response.statusText}`;
        console.error(`[MAIL SERVICE ERROR] Google OAuth2 token exchange rejected (${response.status}):`, errorDesc);

        if (data.error === "invalid_grant") {
            throw new Error("Google OAuth2 refresh token is expired, revoked, or invalid (invalid_grant). Please regenerate GOOGLE_REFRESH_TOKEN.");
        }
        if (data.error === "invalid_client" || data.error === "unauthorized_client") {
            throw new Error(`Google OAuth2 Client ID or Client Secret is rejected by Google (${data.error}).`);
        }
        throw new Error(`Failed to obtain Google access token: ${errorDesc}`);
    }

    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
    return cachedAccessToken;
}

/**
 * Send an email using standard RFC 2822 MIME compilation via Gmail REST API
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text fallback
 */
async function sendMail({ to, subject, html, text, headers = {} }) {
    console.log(`[MAIL SERVICE] Initiating send to: ${to} | Subject: "${subject}"`);
    const accessToken = await getAccessToken();
    const { emailUser } = getEmailCredentials();
    const fromEmail = emailUser || "no-reply@genai-planner.com";

    if (!emailUser) {
        console.warn("[MAIL SERVICE WARNING] EMAIL_USER is not set in environment variables. Gmail API may reject messages sent from unverified addresses.");
    }

    const mail = new MailComposer({
        from: `"GenAI Interview Planner" <${fromEmail}>`,
        to: to,
        replyTo: fromEmail,
        subject: subject,
        html: html,
        text: text || "Please open this email in an HTML-compatible email client.",
        headers: {
            "X-Priority": "1",
            "Importance": "high",
            "X-MSMail-Priority": "High",
            ...headers
        },
        encoding: "utf-8"
    });

    const rawBuffer = await new Promise((resolve, reject) => {
        mail.compile().build((err, message) => {
            if (err) return reject(err);
            resolve(message);
        });
    });

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            raw: rawBuffer.toString("base64url")
        })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const errorMsg = result.error?.message || `HTTP ${response.status} ${response.statusText}`;
        console.error(`[MAIL SERVICE ERROR] Gmail API responded with status ${response.status}:`, errorMsg);
        throw new Error(`Gmail API error (${response.status}): ${errorMsg}`);
    }

    console.log(`[MAIL SERVICE SUCCESS] Message sent via Gmail API! ID: ${result.id} | Labels: ${JSON.stringify(result.labelIds)}`);
    return result;
}

/**
 * Sends a clean, styled OTP verification email
 * @param {string} toEmail
 * @param {string} otp
 */
async function sendOtpEmail(toEmail, otp) {
    const subject = `Your Login Code: ${otp} - GenAI Interview Planner`;
    const text = `Hello,\n\nYour GenAI Interview Planner verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this code, please ignore this email.\n\nGenAI Interview Planner Team`;
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #0d1117;
                color: #e6edf3;
                margin: 0;
                padding: 24px;
            }
            .container {
                max-width: 520px;
                margin: 0 auto;
                background-color: #161b22;
                border: 1px solid #30363d;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
            }
            .header {
                background: linear-gradient(135deg, #ff2d78 0%, #7928ca 100%);
                padding: 28px 24px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                color: #ffffff;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }
            .content {
                padding: 32px 28px;
                line-height: 1.6;
            }
            .greeting {
                font-size: 16px;
                color: #c9d1d9;
                margin-bottom: 20px;
            }
            .otp-box {
                background: #0d1117;
                border: 2px dashed #ff2d78;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                margin: 28px 0;
            }
            .otp-code {
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 34px;
                font-weight: 800;
                letter-spacing: 8px;
                color: #ff5b97;
                margin: 0;
            }
            .timer {
                font-size: 13px;
                color: #8b949e;
                margin-top: 8px;
            }
            .security-notice {
                background: rgba(255, 45, 120, 0.08);
                border-left: 3px solid #ff2d78;
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 13px;
                color: #c9d1d9;
                margin-top: 24px;
            }
            .footer {
                padding: 20px 28px;
                border-top: 1px solid #21262d;
                font-size: 12px;
                color: #6e7681;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>GenAI Interview Planner</h1>
            </div>
            <div class="content">
                <p class="greeting">Hello,</p>
                <p>Use the one-time verification code below to securely sign in to your GenAI Interview Planner account:</p>
                
                <div class="otp-box">
                    <div class="otp-code">${otp}</div>
                    <div class="timer">Expires in 5 minutes</div>
                </div>

                <div class="security-notice">
                    <strong>Security Notice:</strong> If you did not request this login code, please disregard this email. Never share this code with anyone.
                </div>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} GenAI Interview Planner. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendMail({
        to: toEmail,
        subject,
        text,
        html
    });
}

/**
 * Sends a welcome and thank you email to newly registered users
 * @param {string} toEmail
 * @param {string} username
 */
async function sendWelcomeEmail(toEmail, username) {
    const subject = `Welcome to GenAI Interview Planner, ${username}`;
    const text = `Welcome aboard, ${username}!\n\nThank you for registering with GenAI Interview Planner.\nWe're excited to help you prepare for technical interviews with personalized plans, AI-powered mock interviews, and detailed performance reports.\n\nOpen GenAI Interview Planner in your browser to start your first session!\n\nBest regards,\nGenAI Interview Planner Team`;
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #0d1117;
                color: #e6edf3;
                margin: 0;
                padding: 24px;
            }
            .container {
                max-width: 560px;
                margin: 0 auto;
                background-color: #161b22;
                border: 1px solid #30363d;
                border-radius: 18px;
                overflow: hidden;
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
            }
            .header {
                background: linear-gradient(135deg, #ff2d78 0%, #7928ca 100%);
                padding: 32px 24px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                color: #ffffff;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }
            .content {
                padding: 36px 30px;
                line-height: 1.6;
            }
            .welcome-title {
                font-size: 20px;
                font-weight: 700;
                color: #f0f6fc;
                margin-top: 0;
                margin-bottom: 12px;
            }
            .lead-text {
                font-size: 15px;
                color: #8b949e;
                margin-bottom: 24px;
            }
            .feature-card {
                background: #0d1117;
                border: 1px solid #21262d;
                border-radius: 12px;
                padding: 18px 20px;
                margin-bottom: 16px;
            }
            .feature-card h3 {
                margin: 0 0 6px 0;
                font-size: 15px;
                font-weight: 600;
                color: #f0f6fc;
            }
            .feature-card p {
                margin: 0;
                font-size: 13px;
                color: #8b949e;
                line-height: 1.5;
            }
            .note-box {
                background: rgba(255, 45, 120, 0.08);
                border-left: 3px solid #ff2d78;
                padding: 14px 16px;
                border-radius: 6px;
                font-size: 13px;
                color: #c9d1d9;
                margin-top: 24px;
            }
            .footer {
                padding: 22px 30px;
                border-top: 1px solid #21262d;
                font-size: 12px;
                color: #6e7681;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>GenAI Interview Planner</h1>
            </div>
            <div class="content">
                <h2 class="welcome-title">Welcome aboard, ${username}!</h2>
                <p class="lead-text">
                    Thank you for registering with GenAI Interview Planner. We are thrilled to have you with us on your journey to ace your technical interviews.
                </p>

                <div class="feature-card">
                    <h3>Personalized Interview Plans</h3>
                    <p>Generate tailored technical questions customized to your resume and target job requirements.</p>
                </div>

                <div class="feature-card">
                    <h3>AI-Powered Real-Time Feedback</h3>
                    <p>Powered by Google Gemini AI, get instant evaluations, code reviews, and model answers.</p>
                </div>

                <div class="feature-card">
                    <h3>Detailed Performance Reports</h3>
                    <p>Download comprehensive PDF reports highlighting your key strengths and preparation areas.</p>
                </div>

                <div class="note-box">
                    <strong>Getting Started:</strong> Log in to your account with your email and password to start your first mock interview!
                </div>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} GenAI Interview Planner. All rights reserved.<br>
                Happy coding and best of luck for your upcoming interviews!
            </div>
        </div>
    </body>
    </html>
    `;

    return await sendMail({
        to: toEmail,
        subject,
        text,
        html
    });
}

/**
 * Diagnostic helper to safely test and report Gmail OAuth2 configuration
 * without exposing sensitive tokens or secrets.
 */
async function verifyEmailServiceConfig() {
    const { clientId, clientSecret, refreshToken, emailUser } = getEmailCredentials();
    const missing = [];
    if (!clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    if (!refreshToken) missing.push("GOOGLE_REFRESH_TOKEN");
    if (!emailUser) missing.push("EMAIL_USER");

    const envConfigured = {
        EMAIL_USER: !!emailUser,
        GOOGLE_CLIENT_ID: !!clientId,
        GOOGLE_CLIENT_SECRET: !!clientSecret,
        GOOGLE_REFRESH_TOKEN: !!refreshToken,
    };

    if (missing.length > 0) {
        return {
            ready: false,
            authenticated: false,
            message: `Missing required environment variables: ${missing.join(", ")}`,
            envConfigured
        };
    }

    try {
        await getAccessToken();
        const maskedSender = emailUser.replace(/(.{2})(.*)(@.*)/, "$1***$3");
        return {
            ready: true,
            authenticated: true,
            message: "Gmail OAuth2 authenticated successfully.",
            sender: maskedSender,
            envConfigured
        };
    } catch (err) {
        return {
            ready: false,
            authenticated: false,
            message: err.message,
            envConfigured
        };
    }
}

module.exports = {
    getAccessToken,
    sendMail,
    sendOtpEmail,
    sendWelcomeEmail,
    verifyEmailServiceConfig
};
