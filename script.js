let lastMissingSkills=[];
async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || "The request failed.");
    }

    return data;
}

function showError(elementId, error) {
    const element = document.getElementById(elementId);
    element.textContent = "Error: " + (
        error?.message ||
        error?.detail ||
        (typeof error === "string" ? error : JSON.stringify(error))
    );
}

// 1. DASHBOARD
async function loadDashboard() {
    const skills = document.getElementById("skills");

    try {
        const data = await apiRequest("/api/dashboard");

        skills.innerHTML = Object.entries(data.skills).map(
            ([name, score]) => `
                <article class="card">
                    <p>${name}</p>
                    <h2>${score}%</h2>
                    <div class="bar">
                        <div style="width:${score}%"></div>
                    </div>
                </article>
            `
        ).join("");
    } catch (error) {
        skills.textContent = "Could not load dashboard: " + error.message;
    }
}

// 2. RESUME ANALYZER
async function analyzeResume() {
  const file = document.getElementById("resumeFile").files[0];
  const role = document.getElementById("role").value;
  const result = document.getElementById("resumeResult");

  if (!file) {
    result.textContent = "Please upload a PDF or TXT resume first.";
    return;
  }

  // PDF cannot be read correctly like this - use TXT for best result
  if (file.name.toLowerCase().endsWith(".pdf")) {
    result.innerHTML = `<b>Note:</b> PDF reading is messy. For 100% correct result, please upload <b>.TXT</b> version of same resume.<br><br>Showing best-effort result below:`;
  } else {
    result.textContent = "Analyzing resume...";
  }

  const text = await file.text();
  const lower = text.toLowerCase();

  function hasSkill(skill) {
    // \b = word boundary, so "git" will NOT match "digital"
    // escape special chars
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(lower);
  }

  const skillsMap = {
  "Software Developer": ["python", "java", "javascript", "html", "css", "sql", "git", "dsa", "oops"],
  "AI Engineer": ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "nlp", "sql", "pandas", "numpy"],
  "Data Analyst": ["python", "sql", "excel", "power bi", "pandas", "statistics", "tableau"]
};
  const needed = skillsMap[role] || skillsMap["Software Developer"];
  const found = needed.filter(s => hasSkill(s));
  const missing = needed.filter(s => !hasSkill(s));
  lastMissingSkills=missing;
  const score = Math.round((found.length / needed.length) * 100);

  result.innerHTML += `
    <br><br><b>Match Score: ${score}%</b><br><br>
    <b>Found:</b> ${found.join(", ") || "None"}<br>
    <b>Missing:</b> ${missing.join(", ") || "None"}<br><br>
    <b>Tip:</b> Add these missing skills: ${missing.join(", ")}
  `;
}
// 3. CODING ASSESSMENT
let assessmentQuestions = [];

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function getQuestionText(question) {
    if (typeof question === "string") {
        return question;
    }

    return question.question ||
        question.title ||
        question.text ||
        question.description ||
        "Practice question";
}

async function loadAssessment() {
  const container = document.getElementById("assessmentQuestions");
  const result = document.getElementById("codeResult");
  const submitButton = document.getElementById("submitAssessment");
  const role = document.getElementById("role").value;

  const questionBank = {
    "python": { question: "What is the difference between list and tuple in Python?", answer: "tuple" },
    "java": { question: "Difference between ArrayList and LinkedList in Java?", answer: "arraylist" },
    "javascript": { question: "Difference between let, const and var in JS?", answer: "let" },
    "html": { question: "What does HTML stand for?", answer: "hypertext" },
    "css": { question: "Difference between margin and padding?", answer: "margin" },
    "sql": { question: "Difference between WHERE and HAVING in SQL?", answer: "group" },
    "git": { question: "Difference between git pull and git fetch?", answer: "fetch" },
    "dsa": { question: "Which data structure uses FIFO?", answer: "queue" },
    "oops": { question: "Name one pillar of OOP and explain it.", answer: "encapsulation" },
    "machine learning": { question: "What is Machine Learning? Give one example.", answer: "learn" },
    "deep learning": { question: "Difference between ML and Deep Learning?", answer: "neural" },
    "tensorflow": { question: "What is TensorFlow used for?", answer: "deep" },
    "pytorch": { question: "What is PyTorch used for?", answer: "deep" },
    "nlp": { question: "What is NLP? Give one example.", answer: "language" },
    "pandas": { question: "What is Pandas used for?", answer: "data" },
    "numpy": { question: "What is NumPy used for?", answer: "array" },
    "excel": { question: "What is VLOOKUP used for?", answer: "lookup" },
    "power bi": { question: "What is Power BI used for?", answer: "visual" },
    "statistics": { question: "Difference between mean and median?", answer: "mean" },
    "tableau": { question: "What is Tableau used for?", answer: "visual" }
  };

  let skillsToTest = lastMissingSkills;
  if (!skillsToTest || skillsToTest.length === 0) {
    if (result) result.innerHTML = "<b>Tip:</b> Analyze resume first, then Assessment will show questions on your missing skills only.";
    const fallback = { "Software Developer": ["python","java","javascript"], "AI Engineer": ["python","machine learning","deep learning"], "Data Analyst": ["python","sql","excel"] };
    skillsToTest = fallback[role] || ["python","java","javascript"];
  }

  skillsToTest = skillsToTest.slice(0, 3);
  const questions = skillsToTest.map(s => ({ skill: s, ...questionBank[s] })).filter(q => q.question);
  assessmentQuestions = questions;

  container.innerHTML = `<b>Assessment for ${role} - Based on YOUR Missing Skills: ${skillsToTest.join(", ")}</b><br><br>` + questions.map((q, i) => `
    <div style="margin-bottom:12px"><b>Q${i+1} [${q.skill.toUpperCase()}].</b> ${escapeHTML(q.question)}<br>
    <input type="text" id="ans${i}" style="width:100%; padding:6px; margin-top:4px" placeholder="Type your answer..."></div>
    `).join("") + `<br><button onclick="submitAssessment()" style="padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer; font-size:15px">Submit Assessment</button>`;

  if (submitButton) submitButton.style.display = "block";
  if (result) result.textContent = "";
  if (submitButton) {
    submitButton.onclick = function() {
      let score = 0;
      questions.forEach((q, i) => {
        if (document.getElementById("ans" + i).value.toLowerCase().includes(q.answer)) score++;
      });
      result.innerHTML = `<b>Score: ${score} / ${questions.length}</b><br>These were your missing skills - practice them!`;
    };
  }
}
async function submitAssessment() {
  const result = document.getElementById("codeResult");
  if (!assessmentQuestions || assessmentQuestions.length === 0) {
    result.textContent = "Load assessment questions first.";
    return;
  }
  let score = 0;
  assessmentQuestions.forEach((q, i) => {
    const el = document.getElementById("ans" + i);
    const val = el ? el.value.toLowerCase() : "";
    if (val.includes(q.answer)) score++;
  });
  result.innerHTML = `<b>Score: ${score} / ${assessmentQuestions.length}</b><br>These were your missing skills - practice them and re-upload resume!`;
}
// 4. MOCK INTERVIEW
async function startInterview() {
    const questionBox = document.getElementById("interviewQuestion");
    const answerBox = document.getElementById("interviewAnswer");
    const submitButton = document.getElementById("evaluateInterviewButton");
    const result = document.getElementById("interviewResult");

    questionBox.textContent = "Starting interview...";
    result.textContent = "";
    answerBox.value = "";
    answerBox.disabled = true;
    submitButton.disabled = true;

    try {
        const data = await apiRequest("/api/mock-interview", {
            method: "POST"
        });

        displayInterviewQuestion(data);
    } catch (error) {
        questionBox.textContent = "Could not start interview.";
        result.textContent = error.message;
    }
}

function displayInterviewQuestion(data) {
    const questionBox = document.getElementById("interviewQuestion");
    const answerBox = document.getElementById("interviewAnswer");
    const submitButton = document.getElementById("evaluateInterviewButton");

    const question = data.question ||
        data.next_question ||
        data.text ||
        "";

    if (!question || data.finished === true || data.done === true) {
        questionBox.textContent =
            question || "Mock interview completed!";
        answerBox.disabled = true;
        submitButton.disabled = true;
        return;
    }

    questionBox.textContent = question;
    answerBox.value = "";
    answerBox.disabled = false;
    submitButton.disabled = false;
    answerBox.focus();
}

async function evaluateInterview() {
    const answerBox = document.getElementById("interviewAnswer");
    const result = document.getElementById("interviewResult");
    const answer = answerBox.value.trim();

    if (!answer) {
        result.textContent = "Please write your answer first.";
        return;
    }

    result.textContent = "Checking your answer...";

    try {
        const data = await apiRequest("/api/mock-interview/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answer })
        });

        result.textContent = data.feedback ||
            data.message || "Answer submitted.";

        if (data.finished === true || data.done === true) {
            document.getElementById("interviewQuestion").textContent =
                "Mock interview completed! Start again to practise.";
            answerBox.disabled = true;
            document.getElementById("evaluateInterviewButton").disabled = true;
        } else {
            const nextQuestion = data.next_question || data.question;

            if (nextQuestion) {
                displayInterviewQuestion({ question: nextQuestion });
            } else {
                answerBox.value = "";
                answerBox.focus();
            }
        }
    } catch (error) {
        showError("interviewResult", error);
    }
}

// 5. LEARNING ROADMAP
async function loadRoadmap() {
    const container = document.getElementById("roadmapContent");

    container.textContent = "Loading your roadmap...";

    try {
        const data = await apiRequest("/api/roadmap");

        const roadmap = Array.isArray(data)
            ? data
            : (data.roadmap || data.items || data.steps || []);

        if (roadmap.length === 0) {
            container.textContent =
                data.message || "Analyze your resume first to generate recommendations.";
            return;
        }

        container.innerHTML = roadmap.map((item, index) => {
            if (typeof item === "string") {
                return `
                    <div class="roadmap-item">
                        <b>${String(index + 1).padStart(2, "0")} · Week ${index + 1}</b>
                        <p>${escapeHTML(item)}</p>
                    </div>
                `;
            }

            const title = item.title || item.topic ||
                item.skill || `Week ${index + 1}`;

            const description = item.task || item.description ||
                item.details || "";

            return `
                <div class="roadmap-item">
                    <b>${String(index + 1).padStart(2, "0")} · ${escapeHTML(title)}</b>
                    <p>${escapeHTML(description)}</p>
                </div>
            `;
        }).join("");

        if (data.assessment_score !== undefined) {
            const score = document.createElement("p");
            score.textContent =
                "Assessment completion score: " + data.assessment_score;
            container.appendChild(score);
        }
    } catch (error) {
        container.textContent =
            "Could not load roadmap: " + error.message;
    }
}

// LOAD DASHBOARD WHEN THE PAGE OPENS
document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});