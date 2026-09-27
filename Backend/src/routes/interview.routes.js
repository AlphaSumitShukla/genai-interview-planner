const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const pdfParse = require("pdf-parse");
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");
const authMiddleware = require("../middlewares/auth.middleware");

const interviewRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

async function generateInterViewReportController(req, res) {
    try {
        let resumeText = "";
        if (req.file) {
            try {
                const parser = new pdfParse.PDFParse({ data: req.file.buffer });
                const resumeContent = await parser.getText();
                await parser.destroy();
                resumeText = resumeContent.text;
            } catch (err) {
                const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText();
                resumeText = resumeContent.text;
            }
        }

        const { selfDescription, jobDescription } = req.body;

        if (!jobDescription) {
            return res.status(400).json({ message: "Job description is required" });
        }

        if (!resumeText && !selfDescription) {
            return res.status(400).json({ message: "Either resume or self description is required" });
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription: selfDescription || "",
            jobDescription
        });

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription: selfDescription || "",
            jobDescription,
            ...interViewReportByAi
        });

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        });
    } catch (error) {
        console.error("Error generating interview report:", error);
        res.status(500).json({
            message: error.message || "Failed to generate interview report",
            error: error.message
        });
    }
}

async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(interviewId)) {
            return res.status(400).json({ message: "Invalid interview ID" });
        }

        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id });

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            });
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        });
    } catch (error) {
        console.error("Error fetching interview report:", error);
        res.status(500).json({
            message: error.message || "Error fetching interview report",
            error: error.message
        });
    }
}

async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan");

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        });
    } catch (error) {
        console.error("Error fetching interview reports:", error);
        res.status(500).json({
            message: error.message || "Error fetching interview reports",
            error: error.message
        });
    }
}

async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(interviewReportId)) {
            return res.status(400).json({ message: "Invalid interview report ID" });
        }

        const interviewReport = await interviewReportModel.findById(interviewReportId);

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            });
        }

        const { resume, jobDescription, selfDescription } = interviewReport;

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error generating resume PDF:", error);
        res.status(500).json({
            message: error.message || "Error generating resume PDF",
            error: error.message
        });
    }
}

interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), generateInterViewReportController);
interviewRouter.get("/", authMiddleware.authUser, getAllInterviewReportsController);
interviewRouter.get("/:interviewId", authMiddleware.authUser, getInterviewReportByIdController);
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, generateResumePdfController);
interviewRouter.get("/resume/pdf/:interviewReportId", authMiddleware.authUser, generateResumePdfController);

module.exports = interviewRouter;