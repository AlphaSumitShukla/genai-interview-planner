# 🚀 GenAI Interview Planner & Tailored Resume Generator

An end-to-end full-stack AI platform designed to help job seekers prepare thoroughly for technical interviews. By analyzing a target **Job Description** against a candidate's **Resume** (PDF) or **Self-Description** using **Google Gemini**, the application generates targeted domain questions, identifies critical skill gaps, creates a personalized study roadmap, and compiles an ATS-optimized, tailored PDF resume.

---

## ✨ Key Features

- 🎯 **Strict Domain & Job Alignment**: Automatically detects the exact job domain (e.g., Frontend, Backend, Machine Learning, DevOps, Java/Enterprise, Systems) and focuses interview questions and prep entirely on that technology stack.
- 📊 **Candidate Match Score**: Instant 0–100% compatibility rating evaluating how well your resume matches the job requirements.
- 💡 **Technical & Behavioral Questions**: 
  - 5–8 in-depth technical questions tailored to the required frameworks, tools, and algorithms.
  - 3–5 behavioral questions relevant to the role's seniority and team dynamics.
  - Each question includes the **Interviewer Intention** and a **High-Signal Model Answer**.
- ⚠️ **Skill Gap Analysis**: Pinpoints missing or unproven competencies, categorized by severity (`High`, `Medium`, `Low`).
- 🗓️ **Personalized Preparation Roadmap**: A structured 5–7 day actionable plan with specific daily focus areas and concrete practice tasks.
- 📄 **ATS-Optimized Resume Generator**: Dynamically crafts and formats an ATS-friendly, role-specific PDF resume using `PDFKit` ready for instant download.
- 🔐 **Secure User Authentication**: Full user authentication system with JWT cookies, encrypted passwords (`bcryptjs`), and saved interview history.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Styling**: SCSS (Modular & Responsive Design)
- **HTTP Client**: Axios

### **Backend**
- **Runtime**: [Node.js](https://nodejs.org/) & [Express 5](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) via Mongoose ODM
- **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`) with structured JSON schema output validation ([Zod](https://zod.dev/))
- **File & PDF Processing**: `multer`, `unpdf` (serverless-compatible), `pdfkit`
- **Auth & Security**: `jsonwebtoken`, `bcryptjs`, `cookie-parser`

---

## 📁 Project Structure

```text
yt-genai/
├── Backend/
│   ├── src/
│   │   ├── config/         # Database and app configurations
│   │   ├── controllers/    # Route controllers
│   │   ├── middlewares/    # Authentication & upload middlewares
│   │   ├── models/         # Mongoose models (User, InterviewReport)
│   │   ├── routes/         # Express routes (auth, interview)
│   │   └── services/       # AI integration & PDF generator services
│   ├── .env.example        # Environment variable template
│   ├── server.js           # Backend entry point
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/       # Authentication components, pages & hooks
│   │   │   └── interview/  # Interview report pages, styles & hooks
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) instance (local or MongoDB Atlas)
- [Google Gemini API Key](https://aistudio.google.com/)

---

### 1. Backend Setup

1. Open your terminal and navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your environment variables in `.env`:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   GOOGLE_GENAI_API_KEY=your_gemini_api_key
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```

---

### 2. Frontend Setup

1. In a new terminal, navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.

---

## 🛡️ Environment & Security Note

> **IMPORTANT**: Never commit your `.env` files to public repositories. Ensure `.gitignore` includes all `.env*` files to protect your database credentials and API keys.
