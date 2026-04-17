document.addEventListener('DOMContentLoaded', async () => {
  const API = '/api';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.role !== 'student') {
    window.location.href = 'student-login.html';
    return;
  }

  const jsonHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Populate user info
  const name = user.name || 'Student';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('nav-avatar').textContent = initials;
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-email').textContent = user.email || '';

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'student-login.html';
  });

  function gradeChipClass(grade) {
    if (!grade) return 'chip-b';
    const g = grade.toUpperCase();
    if (g.startsWith('A')) return 'chip-a';
    if (g.startsWith('B')) return 'chip-b';
    if (g.startsWith('C')) return 'chip-c';
    if (g.startsWith('D')) return 'chip-d';
    return 'chip-f';
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  // Fetch submissions
  let submissions = [];
  try {
    const res = await fetch(`${API}/submissions`, { headers: jsonHeaders });
    if (res.ok) submissions = await res.json();
  } catch (e) { console.error(e); }

  const graded = submissions.filter(s => s.status === 'confirmed');
  const avgScore = graded.length > 0
    ? (graded.reduce((acc, s) => acc + (s.finalScore || 0), 0) / graded.length).toFixed(1)
    : '—';

  document.getElementById('gs-submitted').textContent = submissions.length;
  document.getElementById('gs-graded').textContent = graded.length;
  document.getElementById('gs-avg').textContent = avgScore !== '—' ? `${avgScore}%` : '—';

  const listEl = document.getElementById('grades-list');

  if (submissions.length === 0) {
    listEl.innerHTML = `<div class="card p-12 text-center">
      <span class="material-symbols-outlined" style="font-size:3rem; opacity:0.3; display:block; margin-bottom:12px;">school</span>
      <h3 class="text-muted mb-2">No submissions yet</h3>
      <p class="text-muted text-sm mb-6">Submit an assignment to see your grades here.</p>
      <a href="my-assignments.html" class="btn btn-primary">View Assignments →</a>
    </div>`;
    return;
  }

  listEl.innerHTML = submissions.map(s => {
    const a = s.assignmentId || {};
    const isPending = s.status === 'pending';
    const isAiGraded = s.status === 'ai_graded';
    const isConfirmed = s.status === 'confirmed';

    return `
      <div class="card border border-[var(--surface-container-high)] shadow-sm">
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Left: Assignment info -->
          <div class="flex-1">
            <div class="overline text-secondary mb-2">${a.subject || 'Assignment'}</div>
            <h3 class="mb-2">${a.title || 'Untitled'}</h3>
            <div class="flex gap-2 flex-wrap items-center mb-4">
              <span class="badge badge-ai">${a.course || ''}</span>
              ${isConfirmed
                ? `<span class="badge badge-graded">✓ Graded</span>`
                : isAiGraded
                ? `<span class="badge badge-pending">AI Graded — Awaiting Confirmation</span>`
                : `<span class="badge badge-urgent">Submitted — Under Review</span>`}
            </div>
            <p class="text-sm text-muted">Submitted: ${formatDate(s.submittedAt)}</p>
            ${s.answerText
              ? `<div class="mt-4 bg-low rounded-xl p-4 text-sm text-muted leading-relaxed border border-[var(--surface-container-high)] line-clamp-3">${s.answerText.slice(0, 200)}${s.answerText.length > 200 ? '...' : ''}</div>`
              : ''}
          </div>

          <!-- Right: Grade -->
          <div class="flex flex-col items-center justify-center gap-3 w-full lg:w-48 text-center">
            ${isConfirmed ? `
              <div class="gauge-wrap">
                <svg width="140" height="140">
                  <circle cx="70" cy="70" r="58" stroke-width="10" stroke="var(--surface-container-highest)" fill="none"/>
                  <circle cx="70" cy="70" r="58" stroke-width="10" fill="none"
                    stroke="${s.finalScore >= 85 ? 'var(--primary)' : s.finalScore >= 65 ? 'var(--secondary)' : 'var(--error)'}"
                    stroke-dasharray="364"
                    stroke-dashoffset="${364 - (s.finalScore / (a.maxMarks||100)) * 364}"
                    stroke-linecap="round"
                    transform="rotate(-90 70 70)"
                    style="transition: stroke-dashoffset 1s ease;"
                  />
                </svg>
                <div class="gauge-text-overlay">
                  <span class="font-manrope font-bold text-3xl">${s.finalScore}</span>
                  <span class="text-xs text-muted">/ ${a.maxMarks || 100}</span>
                </div>
              </div>
              <div class="grade-chip ${gradeChipClass(s.finalGrade)}">${s.finalGrade}</div>
            ` : `
              <div class="text-muted text-center">
                <span class="material-symbols-outlined" style="font-size:3rem; display:block; margin-bottom:8px;">hourglass_top</span>
                <span class="text-sm font-medium">${isAiGraded ? 'Awaiting Tutor Confirmation' : 'Under Review'}</span>
              </div>
            `}
          </div>
        </div>

        ${isConfirmed && s.finalRemarks ? `
          <div class="mt-6 pt-6 border-t border-[var(--surface-container-high)]">
            <div class="overline text-muted mb-2">Tutor Remarks</div>
            <p class="text-sm leading-relaxed">${s.finalRemarks}</p>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
});
