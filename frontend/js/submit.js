document.addEventListener('DOMContentLoaded', async () => {
  const API = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const main = document.getElementById('main-content');

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!token || user.role !== 'student') {
    window.location.href = 'student-login.html';
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Get assignment ID from URL ─────────────────────────────────────────────
  const assignmentId = new URLSearchParams(window.location.search).get('id');

  if (!assignmentId) {
    main.innerHTML = `<div class="card p-10 text-center text-muted">
      No assignment selected. <a href="my-assignments.html" class="text-primary font-bold hover:underline">Go to Assignments</a>
    </div>`;
    return;
  }

  // ── Fetch assignment details ───────────────────────────────────────────────
  let assignment;
  try {
    const res = await fetch(`${API}/assignments/${assignmentId}`, { headers: jsonHeaders });
    if (!res.ok) throw new Error('Not found');
    assignment = await res.json();
  } catch (e) {
    main.innerHTML = `<div class="card p-10 text-center text-muted">
      Assignment not found. <a href="my-assignments.html" class="text-primary font-bold hover:underline">Go back</a>
    </div>`;
    return;
  }

  // ── Check if already submitted ────────────────────────────────────────────
  let alreadySubmitted = false;
  try {
    const res = await fetch(`${API}/submissions`, { headers: jsonHeaders });
    if (res.ok) {
      const subs = await res.json();
      alreadySubmitted = subs.some(s => s.assignmentId?._id === assignmentId || s.assignmentId === assignmentId);
    }
  } catch (e) {}

  // ── Format deadline ────────────────────────────────────────────────────────
  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
  }
  function timeLeft(d) {
    const diff = new Date(d) - Date.now();
    if (diff <= 0) return { text: 'DEADLINE PASSED', urgent: true };
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    if (days > 0) return { text: `${days} DAY${days > 1 ? 'S' : ''} REMAINING`, urgent: days <= 1 };
    return { text: `${hrs} HOURS REMAINING`, urgent: true };
  }

  const tl = timeLeft(assignment.dueDate);

  // ── Render the page ───────────────────────────────────────────────────────
  main.innerHTML = `
    <!-- Deadline Banner -->
    <div class="${tl.urgent ? 'bg-error-container text-error' : 'bg-low text-muted'} rounded-full py-3 px-6 inline-flex items-center gap-3 mb-8 shadow-sm font-bold text-sm fade-up">
      <span class="material-symbols-outlined">timer</span>
      DEADLINE: ${tl.text} — ${formatDate(assignment.dueDate)}
    </div>

    <!-- Header -->
    <div class="mb-8 fade-up">
      <div class="overline text-secondary mb-2">${assignment.subject}</div>
      <h1 class="mb-2 max-w-4xl">${assignment.title}</h1>
      <p class="text-xl text-muted">${assignment.description}</p>
    </div>

    ${alreadySubmitted ? `
      <!-- Already Submitted -->
      <div class="card p-10 text-center border-2 border-[var(--status-graded-text)]" style="max-width:500px; margin: 0 auto;">
        <span class="material-symbols-outlined text-[var(--status-graded-text)]" style="font-size:3rem;">task_alt</span>
        <h3 class="mt-4 mb-2">Already Submitted!</h3>
        <p class="text-muted mb-6">You have already submitted this assignment. Your tutor will review it soon.</p>
        <a href="grades-feedback.html" class="btn btn-primary">View My Grades →</a>
      </div>
    ` : `
    <div class="flex flex-col lg:flex-row gap-10 fade-up">
      <!-- Left: Instructions + Rubric -->
      <div class="w-full lg:w-1/2 flex flex-col gap-6">
        <div class="card shadow-ambient border border-[var(--surface-container-high)]">
          <h3 class="text-primary mb-4">Task Instructions</h3>
          <p class="text-[var(--on-surface)] leading-relaxed mb-6 whitespace-pre-wrap">${assignment.instructions}</p>
          <div class="overline text-muted mb-3">Assignment Info</div>
          <div class="flex flex-col gap-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Course</span>
              <span class="font-bold">${assignment.course}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Subject</span>
              <span class="font-bold">${assignment.subject}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Max Marks</span>
              <span class="font-bold text-primary">${assignment.maxMarks}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Assigned by</span>
              <span class="font-bold">${assignment.createdBy?.name || 'Tutor'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Submission Form -->
      <div class="w-full lg:w-1/2 flex flex-col gap-6 fade-up">
        <form id="submit-form" class="flex flex-col gap-6">
          <div class="form-group flex-1">
            <label class="form-label mb-2">Your Answer *</label>
            <textarea id="answer-text" class="input-field w-full" rows="10" placeholder="Write your answer here in detail..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label mb-2">Or Upload a File (optional)</label>
            <div class="file-upload-zone bg-surface-lowest shadow-sm" id="drop-zone">
              <div class="icon-container secondary rounded-full w-16 h-16 shadow-ambient">
                <span class="material-symbols-outlined text-3xl">cloud_upload</span>
              </div>
              <h4 class="font-bold text-xl">Upload your submission</h4>
              <p class="text-muted"><span class="text-primary hover:underline font-bold pointer-events-none">browse files</span> or drag and drop</p>
              <div class="text-xs font-bold uppercase tracking-widest text-muted mt-2">PDF, DOC, DOCX — MAX 50MB</div>
            </div>
            <input type="file" id="file-upload" class="hidden" accept=".pdf,.doc,.docx">
          </div>

          <div class="flex items-center justify-center gap-2 text-sm text-error font-medium p-4 bg-error-container/50 rounded-lg">
            <span class="material-symbols-outlined">lock</span>
            Once submitted, you cannot edit until review is complete.
          </div>

          <div id="submit-error" class="text-error text-sm hidden"></div>

          <button type="submit" class="btn btn-primary py-4 text-lg w-full shadow-hover" id="submit-btn">
            Submit Assignment →
          </button>
        </form>
      </div>
    </div>
    `}
  `;

  if (alreadySubmitted) return;

  // ── File upload UX ────────────────────────────────────────────────────────
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-upload');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  ['dragleave','dragend'].forEach(t => dropZone.addEventListener(t, () => dropZone.classList.remove('dragover')));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; showFile(e.dataTransfer.files[0].name); }
  });
  fileInput.addEventListener('change', () => { if (fileInput.files.length) showFile(fileInput.files[0].name); });

  function showFile(name) {
    dropZone.innerHTML = `
      <div class="icon-container success text-2xl mb-2"><span class="material-symbols-outlined">check_circle</span></div>
      <h4 class="font-bold text-lg mb-1">${name}</h4>
      <p class="text-sm text-primary">Click to change file</p>
    `;
  }

  // ── Submit form ───────────────────────────────────────────────────────────
  document.getElementById('submit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const errEl = document.getElementById('submit-error');
    errEl.classList.add('hidden');

    const answerText = document.getElementById('answer-text').value.trim();
    const file = fileInput.files[0];

    if (!answerText && !file) {
      errEl.textContent = 'Please write an answer or upload a file.';
      errEl.classList.remove('hidden');
      return;
    }

    btn.innerHTML = '<span class="spinner"></span> Submitting...';
    btn.disabled = true;

    try {
      const formData = new FormData();
      formData.append('assignmentId', assignmentId);
      formData.append('answerText', answerText);
      if (file) formData.append('file', file);

      const res = await fetch(`${API}/submissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        btn.innerHTML = '<span class="material-symbols-outlined success-pop">check_circle</span> Submitted!';
        btn.style.backgroundColor = 'var(--status-graded-text)';

        setTimeout(() => {
          main.innerHTML = `
            <div class="card p-12 text-center border-2 border-[var(--status-graded-text)]" style="max-width:500px; margin: 4rem auto;">
              <span class="material-symbols-outlined text-[var(--status-graded-text)] success-pop" style="font-size:4rem;">task_alt</span>
              <h2 class="mt-6 mb-3">Submission Received!</h2>
              <p class="text-muted mb-8">Your assignment has been submitted successfully. Your tutor will review it and you'll be notified when grades are published.</p>
              <div class="flex flex-col gap-3">
                <a href="my-assignments.html" class="btn btn-primary">View All Assignments</a>
                <a href="grades-feedback.html" class="btn btn-secondary">Check Grades</a>
              </div>
            </div>
          `;
        }, 800);
      } else {
        errEl.textContent = data.message || 'Submission failed. Please try again.';
        errEl.classList.remove('hidden');
        btn.innerHTML = 'Submit Assignment →';
        btn.disabled = false;
      }
    } catch (err) {
      errEl.textContent = 'Network error. Please try again.';
      errEl.classList.remove('hidden');
      btn.innerHTML = 'Submit Assignment →';
      btn.disabled = false;
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'student-login.html';
  });
});
