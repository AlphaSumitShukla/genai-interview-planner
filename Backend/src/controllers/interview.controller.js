const mongoose = require("mongoose");
const { extractTextFromPdf } = require("../services/pdf.service");
const generateInterviewReport = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");

async function generateInterviewReportController(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Resume PDF is required" });
        }

        const resumeText = await extractTextFromPdf(req.file.buffer);

        const { selfDescription, jobDescription } = req.body;

        if (!jobDescription) {
            return res.status(400).json({ message: "Job description is required" });
        }

        const interviewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription: selfDescription || "",
            jobDescription,
        });

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription: selfDescription || "",
            jobDescription,
            ...interviewReportByAi,
        });

        res.status(201).json({
            message: "Interview report generated succesfully",
            interviewReport,
        });
    } catch (error) {
        console.error("Error in generateInterviewReportController:", error);
        res.status(500).json({
            message: error.message || "Failed to generate interview report",
            error: error.message,
        });
    }
}

async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(interviewId)) {
            return res.status(400).json({ message: "Invalid interview ID" });
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id,
        });

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found" });
        }

        res.status(200).json({
            message: "Interview report fetched successfully",
            interviewReport,
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching interview report", error: error.message });
    }
}

module.exports = {
    generateInterviewReportController,
    getInterviewReportByIdController,
};