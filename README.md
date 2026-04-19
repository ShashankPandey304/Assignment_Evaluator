<div align="center">
  <img src="https://img.icons8.com/isometric/120/000000/school.png" alt="EduFlow Logo" width="120" />
  <h1 align="center">EduFlow : A Learning Hub</h1>
  <p align="center">
    <strong>An advanced, AI-powered academic platform streamlining the assignment lifecycle for both tutors and students.</strong>
    <br />
    <br />
    <a href="https://assignment-evaluator-2avi.onrender.com">🌍 Live Demo</a> &middot;
    <a href="#-features">Features</a> &middot;
    <a href="#-tech-stack">Tech Stack</a> &middot;
    <a href="#-getting-started">Getting Started</a> &middot;
    <a href="#-architecture-overview">Architecture</a>
  </p>
</div>

<hr />

## 🌟 Overview

**EduFlow** is a modern, end-to-end web platform designed to revolutionize the way educational assignments are created, submitted, and evaluated. By integrating advanced artificial intelligence (via the Groq API) into the grading workflow, EduFlow provides instant, actionable feedback to students while drastically reducing the administrative burden on educators.

Featuring an award-winning, premium user interface with dynamic glassmorphism and modern aesthetics, the platform delivers an immersive "cognitive sanctuary" for deep learning.

## ✨ Features

### 🎓 For Students
* **Immersive Dashboard**: A highly polished, distraction-free environment to track assignments and deadlines by enrolled course.
* **Smart Submissions**: Smooth assignment file and text submission process.
* **Instant AI Feedback**: Receive lightning-fast, high-quality, AI-generated grading and feedback within seconds of submission.
* **Progress Analytics**: Visual insights into academic growth and moving averages.

### 👨‍🏫 For Tutors (Educators)
* **Real-time Command Center**: A comprehensive dashboard displaying real-time student data and grading queues.
* **Course-Based Assignment Management**: Effortlessly create, distribute, and manage assignments tailored to specific courses.
* **AI-Assisted Grading**: Leverage AI to do the heavy lifting of evaluation, allowing tutors to focus on high-level mentorship. Review and finalize AI-suggested grades before they reach the student.

### 🛡 Core System
* **Secure Authentication**: Robust JWT-based login and registration with Role-Based Access Control (RBAC).
* **Premium UI/UX**: Custom-built, lightweight vanilla CSS design system featuring deep color palettes, fluid micro-animations, and complete responsive support.
* **Dark/Light Mode**: First-class support for both light and dark themes across the entire application interface.

## 💻 Tech Stack

**EduFlow** is built using a highly efficient, lightweight modern stack.

**Frontend:**
* HTML5 (Semantic Structure)
* Vanilla JavaScript (ES6+ for interactive logic)
* Advanced CSS3 (Custom Design System, CSS Variables, Glassmorphism, CSS Animations)

**Backend:**
* Node.js & Express.js (RESTful API Architecture)
* MongoDB Atlas (Cloud NoSQL Database)
* Mongoose (ODM for schema validation)

**AI & Auth Integrations:**
* **Groq API**: For incredibly fast, state-of-the-art LLM inference.
* **JSON Web Tokens (JWT)** & **Bcrypt**: For secure user authentication and data encryption.

## 🚀 Getting Started

Follow these instructions to set up the EduFlow platform on your local machine for development and testing.

### Prerequisites

* [Node.js](https://nodejs.org/en) (v16.x or higher recommended)
* [MongoDB Atlas](https://www.mongodb.com/atlas/database) account (or local MongoDB instance)
* [Groq API Key](https://console.groq.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShashankPandey304/Assignment_Evaluator.git
   cd Assignment_Evaluator
   ```

2. **Setup the Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the `backend/` directory and add the following keys:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Seed Initial Data (Optional)**
   You can populate the database with initial tutor data to get started quickly.
   ```bash
   node seed-tutors.js
   ```
   **Default Tutor Login (from seed file):**
   * Email: `tutor@eduflow.com`
   * Password: `tutor1234`

5. **Run the Application**
   Open a terminal and start the backend server:
   ```bash
   npm run dev
   # or
   node server.js
   ```

   The backend will typically start on `http://localhost:5000`.

   To access the frontend, you can serve the `frontend/` directory using any static file server, for example:
   ```bash
   # From the root directory
   npx serve frontend
   ```
   Navigate to `http://localhost:3000` (or your static server's address) to begin using the platform.

## 📂 Architecture Overview

```text
EduFlow/
├── backend/                  # Node.js/Express Backend Services
│   ├── models/               # Mongoose DB Schemas (User, Assignment, Submission)
│   ├── routes/               # API Endpoint Definitions
│   ├── middleware/           # JWT Auth & RBAC Security Layers
│   └── server.js             # Main server entry file
└── frontend/                 # Client-side UI & Interactions
    ├── css/                  # Custom Design System & Animations
    ├── js/                   # Dashboard Logic & API integration
    └── *.html                # User Views (Dashboards, Login, etc)
```

## 📜 License & Credits

This is a proprietary team project developed by:
* **Shashank Pandey**
* **Akrash Saini**
* **Druv Kumar**

All rights reserved. Do not copy or distribute without permission.

---
<div align="center">
  <p>Crafted with passion for modern education.</p>
</div>
