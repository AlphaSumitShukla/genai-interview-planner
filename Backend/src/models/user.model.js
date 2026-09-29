const mongoose = require("mongoose");
require("dotenv").config();

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: [true, "Username already exists"],
        required: true,
        trim: true,
    },
    email: {
        type: String,
        unique: [true, "Account already exists with this email"],
        required: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    }
}, { timestamps: true });

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;