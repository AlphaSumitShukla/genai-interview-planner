// Serverless DOM polyfills for headless PDF processing environments
if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = class ImageData {};
}
if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = class Path2D {};
}

/**
 * Extracts plain text from a PDF Buffer using the serverless-compatible 'unpdf' library.
 * Designed to run without any native canvas or browser DOM requirements.
 *
 * @param {Buffer|Uint8Array} buffer - The PDF file binary data
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromPdf(buffer) {
    if (!buffer || buffer.length === 0) {
        return "";
    }

    try {
        const { extractText } = require("unpdf");
        const uint8Data = Buffer.isBuffer(buffer)
            ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
            : (buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
        const { text } = await extractText(uint8Data);

        if (Array.isArray(text)) {
            return text.map(t => (t || "").trim()).filter(Boolean).join("\n\n");
        }

        return typeof text === "string" ? text.trim() : "";
    } catch (err) {
        console.error("[PDF PARSER ERROR] Failed to parse PDF with unpdf:", err);
        throw new Error("Unable to extract text from the provided PDF resume. Please ensure it is a valid, readable PDF.");
    }
}

module.exports = {
    extractTextFromPdf
};
