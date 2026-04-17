document.addEventListener('DOMContentLoaded', async () => {

  const API_BASE = '/api';

  // ============================
  // Load User Info
  // ============================
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.name || 'Student';
  const userEmail = user.email || 'student@edu.org';
  const userCourse = user.course || '';
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  // Populate user info across pages
  const navAvatar = document.getElementById('nav-avatar');
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarEmail = document.getElementById('sidebar-email');

  if (navAvatar) navAvatar.textContent = initials;
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  if (sidebarName) sidebarName.textContent = userName;
  if (sidebarEmail) sidebarEmail.textContent = userEmail;

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'student-login.html';
    });
  }

  // ============================
  // Fetch assignments + submissions from API
  // ============================
  let assignments = [];
  let submissions = [];

  if (token) {
    try {
      const [aRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/assignments?course=${encodeURIComponent(userCourse)}`, { headers: authHeaders }),
        fetch(`${API_BASE}/submissions`, { headers: authHeaders }),
      ]);
      if (aRes.ok) assignments = await aRes.json();
      if (sRes.ok) submissions = await sRes.json();
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  } else if (userCourse) {
    try {
      const res = await fetch(`${API_BASE}/assignments?course=${encodeURIComponent(userCourse)}`);
      if (res.ok) assignments = await res.json();
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }

  // Map submitted assignment IDs for quick lookup
  const submittedIds = new Set(submissions.map(s =>
    (s.assignmentId?._id || s.assignmentId || '').toString()
  ));

  // Helper: format due date
  function formatDue(dateStr) {
    const due = new Date(dateStr);
    const now = new Date();
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    return `Due in ${diffDays} days`;
  }

  // Helper: determine urgency badge
  function getBadge(dateStr) {
    const due = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return { class: 'badge-urgent', text: 'High Priority' };
    if (diffDays <= 3) return { class: 'badge-pending', text: 'In Progress' };
    return { class: '', text: 'Not Started', style: 'background-color: var(--surface-container-highest); color: var(--on-surface);' };
  }

  // Icon rotation for visual variety
  const iconSet = [
    { icon: 'assignment', bg: 'bg-primary text-white' },
    { icon: 'code', bg: 'bg-secondary-container text-on-secondary-container' },
    { icon: 'science', bg: 'bg-tertiary text-white' },
    { icon: 'menu_book', bg: 'bg-primary-fixed text-on-primary-fixed' },
    { icon: 'functions', bg: 'bg-secondary text-white' },
    { icon: 'architecture', bg: 'bg-primary text-white' },
  ];

  // ============================
  // Dashboard Page Logic
  // ============================
  const welcomeName = document.getElementById('welcome-name');
  const welcomeSubtitle = document.getElementById('welcome-subtitle');
  const subjectCount = document.getElementById('subject-count');
  const assignmentList = document.getElementById('assignment-list');

  if (welcomeName) {
    const firstName = userName.split(' ')[0];
    welcomeName.textContent = `Welcome back, ${firstName}.`;
  }

  const pendingCount = assignments.filter(a => !submittedIds.has(a._id.toString())).length;
  const submittedCount = submissions.length;
  const confirmedSubs = submissions.filter(s => s.status === 'confirmed');
  const avgScore = confirmedSubs.length > 0
    ? (confirmedSubs.reduce((acc, s) => acc + (s.finalScore || 0), 0) / confirmedSubs.length).toFixed(1)
    : null;

  if (welcomeSubtitle) {
    welcomeSubtitle.textContent = pendingCount > 0
      ? `You have ${pendingCount} assignment${pendingCount !== 1 ? 's' : ''} pending in ${userCourse}.`
      : submittedCount > 0
      ? `All assignments submitted! Check your grades.`
      : `No assignments yet for ${userCourse}.`;
  }

  // Update stats cards with real data
  const statPending = document.querySelector('[data-stat="pending"]') || document.querySelectorAll('.count-up')[0];
  const statSubmitted = document.querySelector('[data-stat="submitted"]') || document.querySelectorAll('.count-up')[1];
  const statAvg = document.querySelector('[data-stat="avg"]') || document.querySelectorAll('.count-up')[2];

  // Use real counts for the visible stat cards if they have count-up class
  const statEls = document.querySelectorAll('.count-up');
  statEls.forEach(el => {
    const target = parseFloat(el.getAttribute('data-target'));
    const suffix = el.getAttribute('data-suffix') || '';
    const isFloat = el.getAttribute('data-float') === 'true';
    // Check context by surrounding label
    const label = el.parentElement?.querySelector('.sidebar-label')?.textContent?.toUpperCase() || '';
    if (label.includes('PENDING') && !isNaN(pendingCount)) {
      el.setAttribute('data-target', pendingCount);
    } else if (label.includes('SUBMITTED') && !isNaN(submittedCount)) {
      el.setAttribute('data-target', submittedCount);
    } else if (label.includes('AVG') && avgScore) {
      el.setAttribute('data-target', avgScore);
    }
  });

  if (subjectCount) {
    subjectCount.textContent = userCourse || '—';
    subjectCount.style.fontSize = '1.25rem';
  }

  // Render dashboard assignment list (show first 3)
  if (assignmentList) {
    if (assignments.length === 0) {
      assignmentList.innerHTML = '<div class="p-6 text-center text-muted">No assignments yet. Your tutor will assign work here.</div>';
    } else {
      const toShow = assignments.slice(0, 3);
      assignmentList.innerHTML = toShow.map((a, i) => {
        const isLast = i === toShow.length - 1;
        const borderClass = isLast ? '' : 'border-b border-[var(--surface-container-high)]';
        const bgClass = i % 2 === 0 ? '' : 'bg-lowest';
        const badge = getBadge(a.dueDate);
        const badgeStyle = badge.style ? `style="${badge.style}"` : '';
        const ic = iconSet[i % iconSet.length];
        const isSubmitted = submittedIds.has(a._id.toString());
        return `
          <a href="submit-assignment.html?id=${a._id}" class="flex items-center gap-4 p-5 ${bgClass} hover:bg-low transition-colors ${borderClass}">
            <div class="icon-container shrink-0 ${ic.bg} rounded-xl">
              <span class="material-symbols-outlined">${ic.icon}</span>
            </div>
            <div class="flex-1">
              <div class="font-bold text-[var(--on-surface)] mb-1">${a.title}</div>
              <div class="text-sm text-muted">${a.course} • ${formatDue(a.dueDate)}</div>
            </div>
            ${isSubmitted
              ? '<div class="badge badge-graded">Submitted</div>'
              : `<div class="badge ${badge.class}" ${badgeStyle}>${badge.text}</div>`
            }
            <span class="material-symbols-outlined text-muted ml-4">chevron_right</span>
          </a>
        `;
      }).join('');
    }
  }

  // ============================
  // My Assignments Page Logic
  // ============================
  const assignmentsGrid = document.getElementById('assignments-grid');

  if (assignmentsGrid) {
    const colorClasses = ['text-primary', 'text-secondary', 'text-tertiary'];

    if (assignments.length === 0) {
      assignmentsGrid.innerHTML = '<div class="col-span-3 card p-10 text-center text-muted">No assignments yet. Your tutor will assign work here.</div>';
    } else {
      let html = assignments.map((a, i) => {
        const badge = getBadge(a.dueDate);
        const colorClass = colorClasses[i % colorClasses.length];
        const ic = iconSet[i % iconSet.length];
        const dueText = formatDue(a.dueDate);
        const tutorName = a.createdBy?.name || 'Tutor';
        const mySubmission = submissions.find(s => (s.assignmentId?._id || s.assignmentId || '').toString() === a._id.toString());
        const isSubmitted = !!mySubmission;
        
        let cardStatus = 'pending';
        let badgeText = dueText;
        let finalBadgeClass = badge.class;
        let finalBadgeStyle = (!isSubmitted && badge.style) ? `style="${badge.style}"` : '';

        if (isSubmitted) {
          if (mySubmission.status === 'confirmed') {
            cardStatus = 'graded';
            finalBadgeClass = 'badge-graded';
            badgeText = '✓ Graded';
          } else if (mySubmission.status === 'ai_reviewed') {
            cardStatus = 'ai-review';
            finalBadgeClass = 'badge-pending';
            badgeText = 'Under Review';
          } else {
            cardStatus = 'submitted';
            finalBadgeClass = 'badge-graded'; // default styling for just submitted
            badgeText = '✓ Submitted';
          }
          finalBadgeStyle = '';
        }

        return `
          <div class="card assignment-card flex flex-col pt-8 card-accent-left relative" data-status="${cardStatus}">
            <div class="absolute top-4 right-4 badge ${finalBadgeClass} shadow-sm" ${finalBadgeStyle}>${badgeText}</div>
            <div class="overline ${colorClass} mb-4">${a.course.toUpperCase()}</div>
            <h3 class="mb-3 leading-tight">${a.title}</h3>
            <p class="text-muted text-sm mb-4 flex-1">${a.description}</p>
            <div class="text-xs text-muted mb-4">Assigned by: <strong>${tutorName}</strong></div>
            ${isSubmitted
              ? `<a href="grades-feedback.html" class="btn btn-secondary w-full">View Grades →</a>`
              : `<a href="submit-assignment.html?id=${a._id}" class="btn btn-primary w-full shadow-ambient">Submit →</a>`
            }
          </div>
        `;
      }).join('');



      assignmentsGrid.innerHTML = html;
      initFilters();
    }
  }

  function initFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    const searchInput = document.getElementById('assignment-search');

    if (filterTabs.length > 0) {
      filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          filterTabs.forEach(t => {
            t.classList.remove('bg-gradient', 'text-white');
            t.classList.add('text-muted');
          });
          tab.classList.remove('text-muted');
          tab.classList.add('bg-gradient', 'text-white');

          const filterValue = tab.getAttribute('data-filter');
          filterCards(filterValue, searchInput ? searchInput.value : '');
        });
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const activeTab = document.querySelector('.filter-tab.bg-gradient');
        const filterValue = activeTab ? activeTab.getAttribute('data-filter') : 'all';
        filterCards(filterValue, e.target.value);
      });
    }
  }

  function filterCards(status, query) {
    const cards = document.querySelectorAll('.assignment-card[data-status]');
    const q = query.toLowerCase();
    cards.forEach(card => {
      const cardStatus = card.getAttribute('data-status');
      const cardTitle = card.querySelector('h3')?.textContent.toLowerCase() || '';
      
      let statusMatch = false;
      if (status === 'all') {
        statusMatch = true;
      } else if (status === 'submitted') {
        // "Submitted" tab shows EVERYTHING that has been submitted
        statusMatch = ['submitted', 'ai-review', 'graded'].includes(cardStatus);
      } else if (status === 'ai-review') {
        // "Under Review" tab shows anything submitted but NOT YET graded
        statusMatch = ['submitted', 'ai-review'].includes(cardStatus);
      } else {
        statusMatch = cardStatus === status;
      }
      
      const queryMatch = cardTitle.includes(q);
      
      if (statusMatch && queryMatch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // ============================
  // Count-Up Animation
  // ============================
  const animatedNumbers = document.querySelectorAll('.count-up');
  
  if (animatedNumbers.length > 0) {
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-target'));
          const suffix = el.getAttribute('data-suffix') || '';
          const isFloat = el.getAttribute('data-float') === 'true';
          
          animateValue(el, 0, target, 1500, suffix, isFloat);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    
    animatedNumbers.forEach(el => observer.observe(el));
  }



  // Table Row Click to expand feedback (grades-feedback.html)
  const filterableRows = document.querySelectorAll('tr[data-id]');
  const feedbackSection = document.getElementById('feedback-section');
  
  if (filterableRows.length > 0 && feedbackSection) {
    filterableRows.forEach(row => {
      row.addEventListener('click', () => {
        if(!row.querySelector('.badge-graded')) return;
        
        filterableRows.forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        
        feedbackSection.classList.remove('hidden');
        feedbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // Clear Notifications
  const clearBtn = document.getElementById('clear-notifications');
  const notifContainer = document.getElementById('notifications-list');
  
  if (clearBtn && notifContainer) {
    clearBtn.addEventListener('click', () => {
      notifContainer.innerHTML = '<div class="p-4 text-center text-muted text-sm">No new notifications.</div>';
    });
  }

  // Drag and Drop File Upload
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-upload');
  
  if (dropZone && fileInput) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    ['dragleave', 'dragend'].forEach(type => {
      dropZone.addEventListener(type, () => {
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        updateFileName(e.dataTransfer.files[0].name);
      }
    });

    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        updateFileName(fileInput.files[0].name);
      }
    });

    function updateFileName(name) {
      dropZone.innerHTML = `
        <div class="icon-container success text-2xl mb-2">
          <span class="material-symbols-outlined">check_circle</span>
        </div>
        <h4 class="font-bold text-lg mb-1">${name}</h4>
        <p class="text-sm text-primary">Click to change file</p>
      `;
    }
  }

});

// Helper for Number Animation
function animateValue(obj, start, end, duration, suffix = '', isFloat = false) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // Ease out cubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * easeOut;
    
    if (isFloat) {
      obj.innerHTML = current.toFixed(1) + suffix;
    } else {
      obj.innerHTML = Math.floor(current) + suffix;
    }
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}


