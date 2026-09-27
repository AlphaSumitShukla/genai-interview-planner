const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

const questionSchema = z.object({
    question: z.string().describe("The interview question strictly centered on the technologies, tools, and domain required in the Job Description"),
    intention: z.string().describe("What the interviewer wants to learn by asking it for this specific domain and role"),
    answer: z.string().describe("A concise guide to a strong, high-signal answer demonstrating domain expertise")
});

const interviewReportSchema = z.object({
    title: z.string().describe("Accurate job title or role name extracted from the Job Description (e.g. 'Machine Learning Engineer', 'Java Developer', 'Data Analyst', 'DevOps Engineer', 'Frontend Developer')"),
    matchScore: z.number().min(0).max(100)
        .describe("How well the candidate matches the job requirements, 0-100"),
    technicalQuestions: z.array(questionSchema).describe("5-8 technical questions strictly focused on the technologies, libraries, frameworks, algorithms, and tools specified in the Job Description"),
    behavioralQuestions: z.array(questionSchema).describe("3-5 behavioral questions relevant to the responsibilities, team dynamics, and challenges of this specific role and seniority"),
    skillGaps: z.array(
        z.object({
            skill: z.string().describe("A specific technology, tool, or domain competency required by the Job Description that is missing, weak, or unproven in the candidate's profile"),
            severity: z.enum(["low", "medium", "high"]).describe("Impact on candidate's ability to perform this specific job")
        })
    ),
    preparationPlan: z.array(
        z.object({
            day: z.number().describe("Day number, starting at 1"),
            title: z.string().describe("Short clear title for the day's preparation plan"),
            focus: z.string().describe("Specific technical domain, technology, or tool focus for this day strictly derived from the Job Description requirements"),
            tasks: z.array(z.string()).describe("2-4 concrete actionable study and hands-on practice tasks for that day")
        })
    )
});

// Works with zod v3 (zod-to-json-schema) and zod v4 (built-in z.toJSONSchema)
function buildJsonSchema(schema) {
    const jsonSchema =
        typeof z.toJSONSchema === "function"
            ? z.toJSONSchema(schema)
            : zodToJsonSchema(schema, { $refStrategy: "none" });

    delete jsonSchema.$schema;
    return jsonSchema;
}

const interviewReportJsonSchema = buildJsonSchema(interviewReportSchema);

// Fail at startup if the schema is empty, so this bug can't hide again
if (!interviewReportJsonSchema.properties?.technicalQuestions) {
    throw new Error(
        "JSON schema is empty. Check your zod / zod-to-json-schema versions."
    );
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `
You are an expert technical interviewer and hiring manager across all software engineering, data, AI, infrastructure, and technology disciplines.

CRITICAL DIRECTIVE - STRICT JOB DESCRIPTION ALIGNMENT:
The Job Description is your primary source of truth. You must dynamically identify the target job role and its specific technology stack, methodologies, and requirements, and tailor all generated content STRICTLY to that domain.

DO NOT default to generic frontend, React, JavaScript, Node.js, or full-stack web topics unless the Job Description explicitly specifies them.

Domain-Specific Rules:
- If Machine Learning / AI / Data Science: Focus strictly on Python, PyTorch/TensorFlow, NumPy/Pandas, Scikit-learn, statistics, mathematics, data preprocessing, feature engineering, model training/evaluation, LLMs, embeddings, RAG, MLOps, deep learning architectures, etc.
- If Data Analyst / BI: Focus strictly on SQL queries, data warehousing, Excel, Python, Pandas, statistics, data visualization (Tableau, PowerBI), metric design, and business analytics.
- If Java / Enterprise: Focus strictly on Java (core & modern), OOP principles, Collections Framework, Spring Boot, Hibernate/JPA, JDBC, JVM internals, multithreading, concurrency, and microservices architecture.
- If Backend Developer: Focus strictly on the exact backend language/framework in the JD (Node.js, Go, Python, Java, C#, etc.), REST/gRPC API design, relational and NoSQL databases, caching (Redis), queues, authentication, and backend system architecture.
- If Frontend Developer: Focus on HTML5, CSS3, modern JavaScript/TypeScript, React/Vue/Angular, browser rendering lifecycle, state management, web performance, responsive design, and accessibility.
- If DevOps / Cloud / SRE: Focus on Linux internals, Docker, Kubernetes, CI/CD pipelines, Terraform, cloud providers (AWS, GCP, Azure), networking, monitoring (Prometheus, Grafana), and incident management.
- If Mobile (iOS/Android/Flutter/React Native): Focus on Swift/Kotlin/Dart/React Native, mobile lifecycle, UI components, mobile memory management, offline storage, and app store deployment.
- If Embedded / Systems: Focus on C, C++, Rust, memory layout, pointers, RTOS, microcontroller peripherals, concurrency, and low-level debugging.
- If Any Other Domain: Extract the precise technologies, tools, and responsibilities mentioned in the Job Description and focus exclusively on them.

Requirements:
1. title: Extract the exact or most accurate job title from the Job Description (e.g., "Machine Learning Engineer", "Senior Java Developer", "Data Analyst").
2. matchScore: Objectively score (0-100) how well the candidate's Resume and/or Self Description meets the requirements stated in the Job Description.
3. technicalQuestions: Provide 5-8 technical questions strictly relevant to the technologies, concepts, and challenges mentioned or directly required in the Job Description.
4. behavioralQuestions: Provide 3-5 behavioral questions tailored to the seniority, responsibilities, and scenarios typical of this specific domain and role.
5. skillGaps: Identify real gaps where the Job Description requires a technology, tool, or experience level that is missing or insufficient in the candidate's Resume/Self Description. Give each an honest severity (low, medium, high).
6. preparationPlan: Provide a 5-7 day study and preparation plan. Each day must focus on a specific technical theme directly from the Job Description and contain 2-4 concrete, actionable tasks closing the candidate's skill gaps.

CANDIDATE INFORMATION:
----------------------------------------
JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume || "None provided"}

SELF DESCRIPTION:
${selfDescription || "None provided"}
----------------------------------------
`;

    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];
    let lastError;

    for (const model of candidateModels) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: interviewReportJsonSchema
                }
            });

            // Throws with a clear message if any field is missing or the wrong shape
            return interviewReportSchema.parse(JSON.parse(response.text));
        } catch (err) {
            lastError = err;
            console.error(`Attempt with model ${model} failed:`, err.message);
        }
    }

    throw new Error(`Failed to generate a valid interview report: ${lastError.message}`);
}

const PDFDocument = require("pdfkit");

function textToPdfBuffer(title, content) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 45,
                size: "A4",
                info: {
                    Title: title || "Tailored Resume",
                    Author: "AI Interview Coach"
                }
            });

            const buffers = [];
            doc.on("data", (chunk) => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", (err) => reject(err));

            const lines = (content || "").split("\n");
            let isFirst = true;

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line) {
                    doc.moveDown(0.35);
                    continue;
                }

                // Name or Main Title
                if (line.startsWith("# ") || (isFirst && line.length < 50)) {
                    isFirst = false;
                    const text = line.replace(/^#\s*/, "");
                    doc.fontSize(18).font("Helvetica-Bold").fillColor("#111827").text(text, { align: "center" });
                    doc.moveDown(0.3);
                    continue;
                }

                // Section Headers ( TECHNICAL SKILLS or EXPERIENCE)
                if (line.startsWith("## ") || (/^[A-Z\s&/]{3,35}:?$/.test(line) && line.length < 35)) {
                    const text = line.replace(/^##\s*/, "").replace(/:$/, "");
                    doc.moveDown(0.4);
                    doc.fontSize(12).font("Helvetica-Bold").fillColor("#c20043").text(text.toUpperCase());
                    doc.moveTo(doc.page.margins.left, doc.y)
                       .lineTo(doc.page.width - doc.page.margins.right, doc.y)
                       .strokeColor("#e5e7eb")
                       .stroke();
                    doc.moveDown(0.3);
                    continue;
                }

                // Subheadings (bold roles)
                if (line.startsWith("### ")) {
                    const text = line.replace(/^###\s*/, "");
                    doc.moveDown(0.2);
                    doc.fontSize(10.5).font("Helvetica-Bold").fillColor("#1f2937").text(text);
                    continue;
                }

                // Bullet points
                if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
                    const bulletText = line.replace(/^[-*•]\s*/, "");
                    doc.fontSize(9.5).font("Helvetica").fillColor("#374151").text(`•   ${bulletText}`, {
                        indent: 8,
                        lineGap: 2
                    });
                    continue;
                }

                // Regular text / metadata
                doc.fontSize(9.5).font("Helvetica").fillColor("#4b5563").text(line, {
                    lineGap: 2
                });
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

async function generateResumePdf({ resume, jobDescription, selfDescription }) {
    const prompt = `
You are an expert Technical Resume Writer and ATS Optimization Specialist.

Based on the candidate's existing background and the target Job Description, generate a clean, professional, high-impact, ATS-friendly resume tailored directly for this position.

Format your output in clean Markdown with clear headings:
# [Candidate Name]
[Email] | [Phone] | [Portfolio / GitHub / LinkedIn]

## PROFESSIONAL SUMMARY
[A compelling 3-4 sentence summary highlighting experience and alignment with the target role]

## TECHNICAL SKILLS
- Core Technologies: [Technologies from the Job Description the candidate matches]
- Languages & Frameworks: [Relevant programming languages and frameworks]
- Tools & Methodologies: [Relevant platforms, databases, tools, CI/CD, etc.]

## PROFESSIONAL EXPERIENCE
### [Target Relevant Job Title] | [Company / Organization]
[Dates]
- [Action verb + achievement with metrics and relevant tech keywords]
- [Project contribution aligned with target job requirements]
- [Technical challenge solved]

## NOTABLE PROJECTS
### [Project Title (Tailored to Job Role)]
- [Description of architecture, technologies used, and outcomes]

## EDUCATION & CERTIFICATIONS
[Degree, Field of Study, University / Institution, Year]

CANDIDATE DATA:
RESUME:
${resume || "None provided"}

SELF DESCRIPTION:
${selfDescription || "None provided"}

JOB DESCRIPTION:
${jobDescription || "Software Engineering"}
`;

    let resumeText = "";
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];

    for (const model of candidateModels) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt
            });
            if (response.text) {
                resumeText = response.text;
                break;
            }
        } catch (err) {
            console.error(`generateResumePdf attempt with model ${model} failed:`, err.message);
        }
    }

    if (!resumeText) {
        resumeText = resume || selfDescription || "Tailored Professional Resume";
    }

    return await textToPdfBuffer("Tailored Resume", resumeText);
}

generateInterviewReport.generateInterviewReport = generateInterviewReport;
generateInterviewReport.generateResumePdf = generateResumePdf;

module.exports = generateInterviewReport;

