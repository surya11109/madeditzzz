/**
 * MAD EDITZZZ — Admin Panel JS
 * Handles: login, preset CRUD, image upload preview
 */

// ── DOM REFS ─────────────────────────────────────────────────────────────────
const loginScreen    = document.getElementById('loginScreen');
const loginPassword  = document.getElementById('loginPassword');
const loginBtn       = document.getElementById('loginBtn');
const loginError     = document.getElementById('loginError');
const adminDashboard = document.getElementById('adminDashboard');
const logoutBtn      = document.getElementById('logoutBtn');
const adminGrid      = document.getElementById('adminGrid');
const panelTitle     = document.getElementById('panelTitle');
const headerAddBtn   = document.getElementById('headerAddBtn');
const savePresetBtn  = document.getElementById('savePresetBtn');
const cancelFormBtn  = document.getElementById('cancelFormBtn');
const formTitle      = document.getElementById('formTitle');
const editingId      = document.getElementById('editingId');

// Form fields
const fTitle     = document.getElementById('fTitle');
const fCategory  = document.getElementById('fCategory');
const fDriveLink = document.getElementById('fDriveLink');
const fImageFile = document.getElementById('fImageFile');
const fImageUrl  = document.getElementById('fImageUrl');
const imageUploadArea   = document.getElementById('imageUploadArea');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreview      = document.getElementById('imagePreview');

// Delete modal
const deleteModal   = document.getElementById('deleteModal');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete  = document.getElementById('cancelDelete');

// Toast
const toast    = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const toastIcon = document.getElementById('toastIcon');

let deletingId = null;

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupSidebarNav();
  setupImageUpload();
});

// ── AUTH ─────────────────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const res = await fetch('/api/admin/check');
    const data = await res.json();
    if (data.isAdmin) showDashboard();
    else showLogin();
  } catch {
    showLogin();
  }
}

function showLogin() {
  loginScreen.style.display = 'flex';
  adminDashboard.style.display = 'none';
}

function showDashboard() {
  loginScreen.style.display = 'none';
  adminDashboard.style.display = 'flex';
  loadPresets();
}

// Login
loginBtn.addEventListener('click', doLogin);
loginPassword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const pwd = loginPassword.value.trim();
  if (!pwd) { loginError.textContent = 'Please enter a password.'; return; }

  loginBtn.textContent = 'Logging in...';
  loginBtn.disabled = true;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    const data = await res.json();

    if (data.success) {
      loginError.textContent = '';
      showDashboard();
    } else {
      loginError.textContent = 'Incorrect password. Try again.';
      loginPassword.value = '';
      loginPassword.focus();
    }
  } catch {
    loginError.textContent = 'Server error. Is the server running?';
  } finally {
    loginBtn.textContent = 'Login →';
    loginBtn.disabled = false;
  }
}

// Logout
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

// ── SIDEBAR NAV ───────────────────────────────────────────────────────────────
function setupSidebarNav() {
  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const panelId = link.dataset.panel;
      switchPanel(panelId);
    });
  });

  headerAddBtn.addEventListener('click', () => switchPanel('add'));
  cancelFormBtn.addEventListener('click', () => switchPanel('presets'));
}

function switchPanel(panelId) {
  document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

  const link = document.querySelector(`[data-panel="${panelId}"]`);
  if (link) link.classList.add('active');

  const panel = document.getElementById(`panel-${panelId}`);
  if (panel) panel.classList.add('active');

  if (panelId === 'add') {
    panelTitle.textContent = editingId.value ? 'Edit Preset' : 'Add Preset';
    formTitle.textContent  = editingId.value ? 'Edit Preset' : 'Add New Preset';
  } else {
    panelTitle.textContent = 'Manage Presets';
    resetForm();
  }
}

// ── LOAD PRESETS ──────────────────────────────────────────────────────────────
async function loadPresets() {
  try {
    const res = await fetch('/api/presets');
    const data = await res.json();
    renderAdminGrid(data.presets || []);
  } catch (err) {
    adminGrid.innerHTML = '<p style="color:var(--text-dim)">Failed to load presets.</p>';
  }
}

function renderAdminGrid(presets) {
  adminGrid.innerHTML = '';
  if (presets.length === 0) {
    adminGrid.innerHTML = '<p style="color:var(--text-dim);padding:40px 0;">No presets yet. Add your first one!</p>';
    return;
  }
  presets.forEach((p, i) => {
    const card = createAdminCard(p, i);
    adminGrid.appendChild(card);
  });
}

function createAdminCard(preset, index) {
  const card = document.createElement('div');
  card.className = 'admin-card';
  card.style.animationDelay = `${index * 40}ms`;
  card.innerHTML = `
    <img
      class="admin-card__img"
      src="${escapeHtml(preset.imageUrl)}"
      alt="${escapeHtml(preset.title)}"
      loading="lazy"
      onerror="this.src='https://via.placeholder.com/400x200/1e1e28/888899?text=No+Image'"
    />
    <div class="admin-card__body">
      <p class="admin-card__title">${escapeHtml(preset.title)}</p>
      <p class="admin-card__meta">${preset.category || 'General'} · ${preset.downloads || 0} downloads</p>
      <div class="admin-card__actions">
        <button class="admin-card__btn admin-card__btn--edit" data-id="${preset.id}">Edit</button>
        <button class="admin-card__btn admin-card__btn--delete" data-id="${preset.id}">Delete</button>
      </div>
    </div>
  `;

  card.querySelector('.admin-card__btn--edit').addEventListener('click', () => startEdit(preset));
  card.querySelector('.admin-card__btn--delete').addEventListener('click', () => openDeleteModal(preset.id));

  return card;
}

// ── ADD / EDIT PRESET ─────────────────────────────────────────────────────────
function startEdit(preset) {
  editingId.value  = preset.id;
  fTitle.value     = preset.title;
  fDriveLink.value = preset.driveLink;
  fCategory.value  = preset.category || 'General';
  fImageUrl.value  = preset.imageUrl.startsWith('/uploads/') ? '' : preset.imageUrl;

  // Show existing image preview
  if (preset.imageUrl) {
    imagePreview.src = preset.imageUrl;
    imagePreview.style.display = 'block';
    uploadPlaceholder.style.display = 'none';
  }

  switchPanel('add');
}

function resetForm() {
  editingId.value  = '';
  fTitle.value     = '';
  fDriveLink.value = '';
  fCategory.value  = 'Portrait';
  fImageUrl.value  = '';
  fImageFile.value = '';
  imagePreview.src = '';
  imagePreview.style.display = 'none';
  uploadPlaceholder.style.display = 'block';
}

savePresetBtn.addEventListener('click', savePreset);

async function savePreset() {
  const title     = fTitle.value.trim();
  const driveLink = fDriveLink.value.trim();
  const category  = fCategory.value;
  const imageUrl  = fImageUrl.value.trim();
  const imageFile = fImageFile.files[0];
  const id        = editingId.value;

  if (!title) { showToast('⚠ Preset name is required', 'error'); return; }
  if (!driveLink) { showToast('⚠ Drive link is required', 'error'); return; }
  if (!id && !imageFile && !imageUrl) { showToast('⚠ Please provide an image', 'error'); return; }

  // Build FormData (supports both file + text)
  const formData = new FormData();
  formData.append('title', title);
  formData.append('driveLink', driveLink);
  formData.append('category', category);
  if (imageFile) formData.append('image', imageFile);
  if (imageUrl) formData.append('imageUrl', imageUrl);

  savePresetBtn.textContent = 'Saving...';
  savePresetBtn.disabled = true;

  try {
    const url    = id ? `/api/admin/presets/${id}` : '/api/admin/presets';
    const method = id ? 'PUT' : 'POST';

    const res  = await fetch(url, { method, body: formData });
    const data = await res.json();

    if (data.success) {
      showToast(id ? '✓ Preset updated!' : '✓ Preset added!');
      resetForm();
      switchPanel('presets');
      loadPresets();
    } else {
      showToast(`⚠ ${data.error || 'Something went wrong'}`, 'error');
    }
  } catch (err) {
    showToast('⚠ Network error', 'error');
  } finally {
    savePresetBtn.textContent = 'Save Preset';
    savePresetBtn.disabled = false;
  }
}

// ── DELETE PRESET ─────────────────────────────────────────────────────────────
function openDeleteModal(id) {
  deletingId = id;
  deleteModal.classList.add('open');
}

confirmDelete.addEventListener('click', async () => {
  if (!deletingId) return;
  try {
    const res  = await fetch(`/api/admin/presets/${deletingId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('✓ Preset deleted');
      loadPresets();
    } else {
      showToast('⚠ Delete failed', 'error');
    }
  } catch {
    showToast('⚠ Network error', 'error');
  } finally {
    deleteModal.classList.remove('open');
    deletingId = null;
  }
});

cancelDelete.addEventListener('click', () => {
  deleteModal.classList.remove('open');
  deletingId = null;
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.remove('open');
    deletingId = null;
  }
});

// ── IMAGE UPLOAD PREVIEW ──────────────────────────────────────────────────────
function setupImageUpload() {
  imageUploadArea.addEventListener('click', () => fImageFile.click());

  fImageFile.addEventListener('change', () => {
    const file = fImageFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      uploadPlaceholder.style.display = 'none';
      fImageUrl.value = ''; // Clear URL if file selected
    };
    reader.readAsDataURL(file);
  });

  // Drag & Drop
  imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = 'var(--accent)';
  });
  imageUploadArea.addEventListener('dragleave', () => {
    imageUploadArea.style.borderColor = '';
  });
  imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fImageFile.files = dt.files;
      fImageFile.dispatchEvent(new Event('change'));
    }
  });

  // Image URL preview on blur
  fImageUrl.addEventListener('blur', () => {
    const url = fImageUrl.value.trim();
    if (url) {
      imagePreview.src = url;
      imagePreview.style.display = 'block';
      uploadPlaceholder.style.display = 'none';
      fImageFile.value = '';
    }
  });
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  toastMsg.textContent = msg;
  toastIcon.textContent = type === 'error' ? '⚠' : '✓';
  toast.style.borderColor = type === 'error' ? 'rgba(255,80,80,0.3)' : 'var(--border)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
