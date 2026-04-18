document.addEventListener('DOMContentLoaded', async () => {
  const API = '/api';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!token || user.role !== 'tutor') {
    window.location.href = 'tutor-login.html';
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Populate tutor info
  const name = user.name || 'Tutor';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('nav-avatar').textContent = initials;
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-email').textContent = user.email || '';

  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'tutor-login.html';
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 1) return `${days} days ago`;
    if (days === 1) return 'Yesterday';
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function statusBadge(status) {
    if (status === 'confirmed') return `<span class="status-pill pill-done">✓ Confirmed</span>`;
    if (status === 'ai_graded') return `<span class="status-pill pill-ai">⚡ AI Graded</span>`;
    return `<span class="status-pill pill-pending">● Pending</span>`;
  }

  const avColors = ['bg-primary', 'bg-secondary', 'bg-[var(--tertiary)]'];

  // ── Load submissions ──────────────────────────────────────────────────────
  let submissions = [];
  try {
    const res = await fetch(`${API}/submissions`, { headers: authHeaders });
    if (res.ok) submissions = await res.json();
  } catch (e) { console.error(e); }

  const listEl = document.getElementById('submission-list');
  const panelEl = document.getElementById('review-panel');

  if (submissions.length === 0) {
    listEl.innerHTML = `<div class="text-center text-muted p-8">
      <span class="material-symbols-outlined" style="font-size:3rem; opacity:0.3; display:block; margin-bottom:8px;">inbox</span>
      No submissions yet.
    </div>`;
    return;
  }

  // Render list
  listEl.innerHTML = submissions.map((s, i) => {
    const sName = s.studentId?.name || 'Unknown';
    const avClass = avColors[i % avColors.length];
    const initials = sName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return `
      <div class="submission-card" data-id="${s._id}" id="card-${s._id}">
        <div class="grid items-center mb-2" style="grid-template-columns: auto minmax(0, 1fr) auto; gap: 0.75rem;">
          <div class="avatar avatar-sm ${avClass} text-white">${initials}</div>
          <div class="min-w-0">
            <div class="font-bold text-sm truncate">${sName}</div>
            <div class="text-xs text-muted truncate">${s.assignmentId?.title || '—'}</div>
          </div>
          <div>
            ${statusBadge(s.status)}
          </div>
        </div>
        <div class="text-xs text-muted">${timeAgo(s.submittedAt)}</div>
      </div>
    `;
  }).join('');

  // ── Auto-select from URL param ────────────────────────────────────────────
  const urlParam = new URLSearchParams(window.location.search).get('id');

  // Click handler for cards
  function selectSubmission(id) {
    document.querySelectorAll('.submission-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById('card-' + id);
    if (card) card.classList.add('selected');

    const sub = submissions.find(s => s._id === id);
    if (!sub) return;
    renderPanel(sub);
  }

  document.querySelectorAll('.submission-card').forEach(card => {
    card.addEventListener('click', () => selectSubmission(card.dataset.id));
  });

  if (urlParam) {
    selectSubmission(urlParam);
  } else if (submissions.length > 0) {
    selectSubmission(submissions[0]._id);
  }

  // ── Render review panel ───────────────────────────────────────────────────
  function renderPanel(sub) {
    const a = sub.assignmentId || {};
    const s = sub.studentId || {};
    const isGraded = sub.status === 'ai_graded' || sub.status === 'confirmed';
    const isConfirmed = sub.status === 'confirmed';

    const displayScore = isConfirmed ? sub.finalScore : (isGraded ? sub.aiScore : null);
    const displayGrade = isConfirmed ? sub.finalGrade : (isGraded ? sub.aiGrade : '—');
    const displayRemarks = isConfirmed ? sub.finalRemarks : (isGraded ? sub.aiRemarks : '');

    panelEl.innerHTML = `
      <div class="flex flex-col gap-6">

        <!-- Header -->
        <div class="card p-5 border border-[var(--surface-container-high)]">
          <div class="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div class="overline text-secondary mb-1">${a.subject || 'Assignment'}</div>
              <h2 class="mb-1" style="font-size:1.5rem;">${a.title || 'Untitled'}</h2>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="badge badge-ai">${a.course || ''}</span>
                ${statusBadge(sub.status)}
                <span class="text-xs text-muted">Due: ${a.dueDate ? formatDate(a.dueDate) : '—'}</span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="avatar bg-primary text-white">${(s.name||'S').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
              <div>
                <div class="font-bold">${s.name || 'Student'}</div>
                <div class="text-xs text-muted">${s.email || ''}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Two columns -->
        <div class="flex flex-col lg:flex-row gap-6">

          <!-- Left: Student Answer -->
          <div class="card flex-1 border border-[var(--surface-container-high)]">
            <h3 class="text-primary mb-4">Student's Answer</h3>
            ${sub.answerText
              ? `<div class="bg-low rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap border border-[var(--surface-container-high)]">${sub.answerText}</div>`
              : `<div class="text-muted text-sm">No text answer provided.</div>`}
            ${sub.fileUrl
              ? `<a href="${sub.fileUrl}" target="_blank" class="flex items-center gap-2 mt-4 text-primary font-bold text-sm hover:underline">
                  <span class="material-symbols-outlined">attach_file</span> View Submitted File
                </a>`
              : ''}

            <div class="mt-6">
              <div class="overline text-muted mb-3">Assignment Instructions</div>
              <p class="text-sm text-muted leading-relaxed">${a.instructions || '—'}</p>
            </div>
          </div>

          <!-- Right: Grading -->
          <div class="card w-full lg:w-[340px] flex-shrink-0 border border-[var(--surface-container-high)] flex flex-col gap-4">
            <h3 class="text-primary mb-0">Grading</h3>

            <!-- Score display -->
            <div class="flex items-center gap-4">
              <div class="gauge-wrap" id="gauge-wrap-${sub._id}">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="50" stroke-width="10" stroke="var(--surface-container-highest)" fill="none"/>
                  <circle cx="60" cy="60" r="50" stroke-width="10" fill="none" class="gauge-arc"
                    stroke="var(--primary)"
                    stroke-dasharray="314"
                    stroke-dashoffset="${displayScore != null ? (314 - (displayScore / (a.maxMarks||100)) * 314) : 314}"
                    stroke-linecap="round"
                    transform="rotate(-90 60 60)"
                    style="transition: stroke-dashoffset 1s ease;"
                  />
                </svg>
                <div class="gauge-text-overlay">
                  <span class="font-manrope font-bold" style="font-size:1.6rem;" id="score-display-${sub._id}">${displayScore != null ? displayScore : '—'}</span>
                  <span class="text-xs text-muted">/ ${a.maxMarks || 100}</span>
                </div>
              </div>
              <div>
                <div class="text-xs text-muted uppercase tracking-wider mb-1">Grade</div>
                <div class="grade-badge text-primary" id="grade-display-${sub._id}">${displayGrade}</div>
              </div>
            </div>

            ${isConfirmed ? `
              <!-- Confirmed - show final grades -->
              <div class="bg-[#dcfce7] rounded-xl p-4 border border-[#86efac]">
                <div class="font-bold text-sm text-[#16a34a] flex items-center gap-2 mb-2">
                  <span class="material-symbols-outlined" style="font-size:1.1rem;">check_circle</span>
                  Grade Confirmed & Published
                </div>
                <p class="text-sm text-[#166534]">${displayRemarks}</p>
              </div>
            ` : isGraded ? `
              <!-- AI graded - show editable form -->
              <div class="bg-low rounded-xl p-4 border border-[var(--surface-container-high)] text-sm text-muted">
                <div class="font-bold text-xs uppercase tracking-wider text-secondary mb-2">⚡ AI Generated Remarks</div>
                <p>${displayRemarks}</p>
              </div>

              <div class="flex flex-col gap-3">
                <div class="form-group mb-0">
                  <label class="form-label">Edit Score (0–${a.maxMarks || 100})</label>
                  <input type="number" class="input-field score-box" id="final-score-${sub._id}" value="${sub.aiScore}" min="0" max="${a.maxMarks || 100}">
                </div>
                <div class="form-group mb-0">
                  <label class="form-label">Grade</label>
                  <select class="input-field" id="final-grade-${sub._id}">
                    ${['A+','A','B+','B','C+','C','D','F'].map(g => `<option value="${g}" ${g === sub.aiGrade ? 'selected' : ''}>${g}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group mb-0">
                  <label class="form-label">Final Remarks</label>
                  <textarea class="input-field w-full" rows="3" id="final-remarks-${sub._id}">${sub.aiRemarks || ''}</textarea>
                </div>
                <button class="btn btn-primary py-3" id="confirm-btn-${sub._id}" data-id="${sub._id}">
                  Confirm & Publish →
                </button>
              </div>
            ` : `
              <!-- Not yet graded -->
              <p class="text-sm text-muted">Click the button below to let AI auto-grade this submission.</p>
              <button class="btn btn-secondary py-3" id="ai-grade-btn-${sub._id}" data-id="${sub._id}">
                <span class="material-symbols-outlined" style="font-size:1.1rem; vertical-align:middle;">auto_awesome</span>
                Auto-Grade with AI
              </button>
            `}

            <div id="panel-error-${sub._id}" class="text-error text-sm hidden"></div>
          </div>
        </div>
      </div>
    `;

    // Wire AI grade button
    const aiBtn = document.getElementById(`ai-grade-btn-${sub._id}`);
    if (aiBtn) {
      aiBtn.addEventListener('click', async () => {
        aiBtn.innerHTML = '<span class="spinner"></span> AI is grading...';
        aiBtn.disabled = true;
        const errEl = document.getElementById(`panel-error-${sub._id}`);
        try {
          const res = await fetch(`${API}/submissions/${sub._id}/ai-grade`, {
            method: 'POST',
            headers: authHeaders,
          });
          const data = await res.json();
          if (res.ok) {
            // Update local data and re-render
            const idx = submissions.findIndex(s => s._id === sub._id);
            if (idx !== -1) submissions[idx] = data;
            // Re-render list card
            updateListCard(data);
            renderPanel(data);
          } else {
            errEl.textContent = data.message || 'AI grading failed';
            errEl.classList.remove('hidden');
            aiBtn.innerHTML = 'Auto-Grade with AI';
            aiBtn.disabled = false;
          }
        } catch (e) {
          errEl.textContent = 'Network error';
          errEl.classList.remove('hidden');
          aiBtn.innerHTML = 'Auto-Grade with AI';
          aiBtn.disabled = false;
        }
      });
    }

    // Wire confirm button
    const confirmBtn = document.getElementById(`confirm-btn-${sub._id}`);
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        const finalScore = parseFloat(document.getElementById(`final-score-${sub._id}`).value);
        const finalGrade = document.getElementById(`final-grade-${sub._id}`).value;
        const finalRemarks = document.getElementById(`final-remarks-${sub._id}`).value;
        const errEl = document.getElementById(`panel-error-${sub._id}`);

        const maxMarks = a.maxMarks || 100;
        if (isNaN(finalScore) || finalScore < 0 || finalScore > maxMarks) {
          errEl.textContent = `Score must be between 0 and ${maxMarks}`;
          errEl.classList.remove('hidden');
          return;
        }

        confirmBtn.innerHTML = '<span class="spinner"></span> Publishing...';
        confirmBtn.disabled = true;

        try {
          const res = await fetch(`${API}/submissions/${sub._id}/confirm`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ finalScore, finalGrade, finalRemarks }),
          });
          const data = await res.json();
          if (res.ok) {
            const idx = submissions.findIndex(s => s._id === sub._id);
            if (idx !== -1) submissions[idx] = data;
            updateListCard(data);
            renderPanel(data);
          } else {
            errEl.textContent = data.message || 'Failed to confirm';
            errEl.classList.remove('hidden');
            confirmBtn.innerHTML = 'Confirm & Publish →';
            confirmBtn.disabled = false;
          }
        } catch (e) {
          errEl.textContent = 'Network error';
          errEl.classList.remove('hidden');
          confirmBtn.innerHTML = 'Confirm & Publish →';
          confirmBtn.disabled = false;
        }
      });
    }
  }

  function updateListCard(updatedSub) {
    const card = document.getElementById(`card-${updatedSub._id}`);
    if (!card) return;
    const badge = card.querySelector('.status-pill');
    if (badge) {
      if (updatedSub.status === 'confirmed') {
        badge.className = 'status-pill pill-done';
        badge.textContent = '✓ Confirmed';
      } else if (updatedSub.status === 'ai_graded') {
        badge.className = 'status-pill pill-ai';
        badge.textContent = '⚡ AI Graded';
      }
    }
  }
});
