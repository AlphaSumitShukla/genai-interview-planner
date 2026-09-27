import axios from "axios";

const API_HOST = typeof window !== "undefined" ? window.location.hostname : "localhost";

const api = axios.create({
  baseURL: `http://${API_HOST}:3000/api/interview`,
  withCredentials: true,
});

/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile, resume }) => {
  const file = resumeFile || resume;
  const formData = new FormData();
  if (jobDescription) formData.append("jobDescription", jobDescription);
  if (selfDescription) formData.append("selfDescription", selfDescription);
  if (file) formData.append("resume", file);

  const response = await api.post("/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
  const response = await api.get(`/${interviewId}`);
  return response.data;
};

/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
  const response = await api.get("/");
  return response.data;
};

/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
  const response = await api.post(`/resume/pdf/${interviewReportId}`, null, {
    responseType: "blob",
  });

  return response.data;
};
