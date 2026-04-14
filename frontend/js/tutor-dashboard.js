document.addEventListener('DOMContentLoaded', async () => {
  const API = 'http://localhost:5000/api';
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // ── Auth Guard ────────────────────────────────────────────────────────────
  if (!token || user.role !== 'tutor') {
    window.location.href = 'tutor-login.html';
    return;
  }

  // ── Populate tutor info ───────────────────────────────────────────────────
  const name = user.name || 'Professor';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  document.getElementById('nav-avatar').textContent = initials;
  document.getElementById('sidebar-avatar').textContent = initials;
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('sidebar-email').textContent = user.email || '';
  document.getElementById('tutor-greeting').textContent = `Welcome, ${name.split(' ')[0]}.`;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

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
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const avClasses = ['av-a', 'av-b', 'av-c', 'av-d'];
  function avatarClass(i) { return avClasses[i % avClasses.length]; }

  function statusPill(status) {
    if (status === 'confirmed') return `<span class="status-pill pill-confirmed">✓ Graded</span>`;
    if (status === 'ai_graded') return `<span class="status-pill pill-graded">AI Graded</span>`;
    return `<span class="status-pill pill-pending">Pending</span>`;
  }

  // ── Fetch all data ────────────────────────────────────────────────────────
  let students = [], submissions = [], assignments = [];

  try {
    const [sRes, subRes, aRes] = await Promise.all([
      fetch(`${API}/students`, { headers: authHeaders }),
      fetch(`${API}/submissions`, { headers: authHeaders }),
      fetch(`${API}/assignments`, { headers: authHeaders }),
    ]);
    if (sRes.ok) students = await sRes.json();
    if (subRes.ok) submissions = await subRes.json();
    if (aRes.ok) assignments = await aRes.json();
  } catch (err) {
    console.error('Failed to load data:', err);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const pending = submissions.filter(s => s.status === 'pending' || s.status === 'ai_graded');
  const confirmed = submissions.filter(s => s.status === 'confirmed');

  document.getElementById('stat-students').textContent = students.length;
  document.getElementById('stat-pending').textContent = pending.length;
  document.getElementById('stat-assignments').textContent = assignments.length;
  document.getElementById('stat-graded').textContent = confirmed.length;
  document.getElementById('pending-count').textContent = pending.length;
  document.getElementById('queue-badge').textContent = pending.length;

  // ── Students Table ────────────────────────────────────────────────────────
  const studentsBody = document.getElementById('students-table-body');
  document.getElementById('students-count-label').textContent = `${students.length} student${students.length !== 1 ? 's' : ''} registered`;

  if (students.length === 0) {
    studentsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-8">No students registered yet.</td></tr>';
  } else {
    studentsBody.innerHTML = students.map((s, i) => `
      <tr class="student-row">
        <td>
          <div class="flex items-center gap-3">
            <div class="avatar avatar-sm ${avatarClass(i)}">${s.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
            <div class="font-bold">${s.name}</div>
          </div>
        </td>
        <td class="text-sm text-muted">${s.email}</td>
        <td><span class="badge badge-ai">${s.course || 'N/A'}</span></td>
        <td class="text-sm text-muted">${formatDate(s.createdAt)}</td>
      </tr>
    `).join('');
  }

  // ── Submissions Table ─────────────────────────────────────────────────────
  const submissionsBody = document.getElementById('submissions-table-body');

  if (submissions.length === 0) {
    submissionsBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-8">No submissions yet. Students will appear here after submitting.</td></tr>';
  } else {
    submissionsBody.innerHTML = submissions.slice(0, 20).map((s, i) => `
      <tr class="student-row" onclick="window.location='ai-review.html?id=${s._id}'" style="cursor:pointer">
        <td>
          <div class="flex items-center gap-3">
            <div class="avatar avatar-sm ${avatarClass(i)}">${(s.studentId?.name || 'S').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
            <div>
              <div class="font-bold">${s.studentId?.name || 'Unknown'}</div>
              <div class="text-xs text-muted">${s.studentId?.course || ''}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="font-bold text-sm">${s.assignmentId?.title || '—'}</div>
          <div class="text-xs text-muted">${s.assignmentId?.subject || ''}</div>
        </td>
        <td class="text-sm text-muted">${timeAgo(s.submittedAt)}</td>
        <td>${statusPill(s.status)}</td>
        <td>
          <a href="ai-review.html?id=${s._id}" class="btn btn-secondary py-1.5 px-4 text-xs" onclick="event.stopPropagation()">
            ${s.status === 'confirmed' ? 'View' : 'Review'}
          </a>
        </td>
      </tr>
    `).join('');
  }

  // ── Assignments Table ─────────────────────────────────────────────────────
  const assignmentsBody = document.getElementById('assignments-table-body');

  if (assignments.length === 0) {
    assignmentsBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-8">No assignments created yet. Click "New Assignment" to start.</td></tr>';
  } else {
    assignmentsBody.innerHTML = assignments.map(a => `
      <tr class="student-row">
        <td class="font-bold">${a.title}</td>
        <td class="text-sm">${a.subject}</td>
        <td><span class="badge badge-ai">${a.course}</span></td>
        <td class="text-sm text-muted">${formatDate(a.dueDate)}</td>
        <td class="font-bold text-primary">${a.maxMarks}</td>
      </tr>
    `).join('');
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ── Modal ─────────────────────────────────────────────────────────────────
  const modal = document.getElementById('create-modal');

  function openModal() { modal.classList.add('open'); }
  function closeModal() { modal.classList.remove('open'); }

  document.getElementById('create-assignment-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });
  document.getElementById('create-btn-2').addEventListener('click', openModal);
  document.getElementById('close-modal').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ── Create Assignment Form ────────────────────────────────────────────────
  document.getElementById('create-assignment-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('create-submit-btn');
    const errEl = document.getElementById('create-error');
    errEl.classList.add('hidden');

    const payload = {
      title: document.getElementById('a-title').value.trim(),
      subject: document.getElementById('a-subject').value.trim(),
      course: document.getElementById('a-course').value.trim(),
      description: document.getElementById('a-description').value.trim(),
      instructions: document.getElementById('a-instructions').value.trim(),
      dueDate: document.getElementById('a-due').value,
      maxMarks: parseInt(document.getElementById('a-marks').value) || 100,
    };

    btn.innerHTML = '<span class="spinner"></span> Creating...';
    btn.disabled = true;

    try {
      const res = await fetch(`${API}/assignments`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        btn.innerHTML = '<span class="material-symbols-outlined success-pop">check_circle</span> Assigned!';
        btn.style.backgroundColor = 'var(--status-graded-text)';
        setTimeout(() => {
          closeModal();
          window.location.reload();
        }, 1200);
      } else {
        errEl.textContent = data.message || 'Failed to create assignment';
        errEl.classList.remove('hidden');
        btn.innerHTML = 'Assign to Students →';
        btn.disabled = false;
      }
    } catch (err) {
      errEl.textContent = 'Network error. Please try again.';
      errEl.classList.remove('hidden');
      btn.innerHTML = 'Assign to Students →';
      btn.disabled = false;
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'tutor-login.html';
  });

});
