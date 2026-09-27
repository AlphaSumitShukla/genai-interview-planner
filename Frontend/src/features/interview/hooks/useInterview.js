import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect, useState } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()
    const [ downloadingResume, setDownloadingResume ] = useState(false)

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports, error, setError } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        if (setError) setError(null)
        let response = null
        try {
            response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response?.interviewReport)
            return response?.interviewReport
        } catch (err) {
            console.log(err)
            if (setError) setError(err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (id) => {
        setLoading(true)
        if (setError) setError(null)
        let response = null
        try {
            response = await getInterviewReportById(id)
            setReport(response?.interviewReport)
            return response?.interviewReport
        } catch (err) {
            console.log(err)
            if (setError) setError(err)
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
        setLoading(true)
        if (setError) setError(null)
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(response?.interviewReports || [])
            return response?.interviewReports
        } catch (err) {
            console.log(err)
            if (setError) setError(err)
        } finally {
            setLoading(false)
        }
    }

    const getResumePdf = async (interviewReportId) => {
        if (!interviewReportId) return
        setDownloadingResume(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const blob = response instanceof Blob ? response : new Blob([ response ], { type: "application/pdf" })

            if (blob.type === "application/json") {
                const text = await blob.text()
                const err = JSON.parse(text)
                throw new Error(err.message || "Failed to generate resume PDF")
            }

            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.style.display = "none"
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            setTimeout(() => {
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
            }, 1000)
        } catch (err) {
            console.error("Error downloading resume:", err)
            alert(err?.response?.data?.message || err?.message || "Failed to download resume. Please try again.")
            if (setError) setError(err)
        } finally {
            setDownloadingResume(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return { loading, report, reports, error, generateReport, getReportById, getReports, getResumePdf, downloadingResume }

}