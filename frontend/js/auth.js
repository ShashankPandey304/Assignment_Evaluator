document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = '/api';

  // Password Show/Hide Toggle
  const toggleButtons = document.querySelectorAll('.input-toggle');
  
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const input = btn.previousElementSibling;
      const icon = btn.querySelector('.material-symbols-outlined');
      
      if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        if (icon) icon.textContent = 'visibility';
      }
    });
  });

  // Form Validation and Submission
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let isValid = true;
      const inputs = form.querySelectorAll('.input-field');
      
      inputs.forEach(input => {
        const formGroup = input.closest('.form-group');
        const errorEl = formGroup?.querySelector('.form-error');
        
        if (input.required && !input.value.trim()) {
           isValid = false;
           showError(formGroup, errorEl, 'This field is required');
        } else if (input.type === 'email' && !validateEmail(input.value)) {
           isValid = false;
           showError(formGroup, errorEl, 'Please enter a valid email address');
        } else if (input.type === 'password' && input.value.length < 8) {
           isValid = false;
           showError(formGroup, errorEl, 'Password must be at least 8 characters');
        } else {
           clearError(formGroup, errorEl);
        }
      });


      if (isValid) {
        if (form.id === 'register-form') {
          await handleRegister();
        } else if (form.id === 'login-form' || form.id === 'tutor-login-form') {
          await handleLogin();
        }
      }
    });

    // Clear error on input
    form.querySelectorAll('.input-field').forEach(input => {
      input.addEventListener('input', () => {
        const formGroup = input.closest('.form-group');
        const errorEl = formGroup?.querySelector('.form-error');
        clearError(formGroup, errorEl);
      });
    });
  });

  async function handleRegister() {
    const fname = document.getElementById('fname').value;
    const lname = document.getElementById('lname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = window.location.pathname.includes('student') ? 'student' : 'tutor';

    // Get selected course
    const courseSelect = document.getElementById('course');
    const course = courseSelect ? courseSelect.value : '';

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${fname} ${lname}`,
          email,
          password,
          role,
          course,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = role === 'student' ? 'student-dashboard.html' : 'tutor-dashboard.html';
      } else {
        showGlobalError(data.message, data.code);
      }
    } catch (error) {
      showGlobalError('Network error. Please try again.');
    }
  }

  async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = window.location.pathname.includes('student') ? 'student' : 'tutor';

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = role === 'student' ? 'student-dashboard.html' : 'tutor-dashboard.html';
      } else {
        showGlobalError(data.message, data.code);
      }
    } catch (error) {
      showGlobalError('Network error. Please try again.');
    }
  }

  function showGlobalError(message, code) {
    // Remove any existing error
    const existing = document.getElementById('global-error');
    if (existing) existing.remove();

    const errorEl = document.createElement('div');
    errorEl.id = 'global-error';
    errorEl.style.cssText = `
      display: flex; align-items: flex-start; gap: 12px;
      padding: 16px 20px; margin-top: 16px; border-radius: 12px;
      background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
      font-size: 14px; line-height: 1.5; animation: shakeIn 0.4s ease;
    `;

    // Icon
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'error';
    icon.style.cssText = 'color: #dc2626; font-size: 22px; flex-shrink: 0; margin-top: 1px;';
    errorEl.appendChild(icon);

    // Content wrapper
    const content = document.createElement('div');
    content.style.flex = '1';

    // Message text
    const msgEl = document.createElement('div');
    msgEl.textContent = message;
    msgEl.style.fontWeight = '500';
    content.appendChild(msgEl);

    // Add contextual link
    if (code === 'ALREADY_REGISTERED') {
      const link = document.createElement('a');
      link.href = 'student-login.html';
      link.textContent = '→ Go to Login';
      link.style.cssText = 'display: inline-block; margin-top: 8px; color: #1d4ed8; font-weight: 700; text-decoration: underline; cursor: pointer;';
      content.appendChild(link);
    } else if (code === 'USER_NOT_FOUND') {
      const role = window.location.pathname.includes('student') ? 'student' : 'tutor';
      if (role === 'student') {
        const link = document.createElement('a');
        link.href = 'student-register.html';
        link.textContent = '→ Create an Account';
        link.style.cssText = 'display: inline-block; margin-top: 8px; color: #1d4ed8; font-weight: 700; text-decoration: underline; cursor: pointer;';
        content.appendChild(link);
      }
    }

    errorEl.appendChild(content);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'background: none; border: none; color: #991b1b; font-size: 20px; cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0;';
    closeBtn.onclick = () => errorEl.remove();
    errorEl.appendChild(closeBtn);

    const form = document.querySelector('form');
    form.appendChild(errorEl);

    // Scroll error into view
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.style.transition = 'opacity 0.3s ease';
        errorEl.style.opacity = '0';
        setTimeout(() => errorEl.remove(), 300);
      }
    }, 8000);
  }
});

function validateEmail(email) {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
}

function showError(group, errorEl, message) {
  if (group) group.classList.add('has-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function clearError(group, errorEl) {
  if (group) group.classList.remove('has-error');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}
