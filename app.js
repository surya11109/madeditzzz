/**
 * MAD EDITZZZ — Main Frontend JS
 * Handles: preset loading, filtering, download modal with countdown
 */

// ── STATE ────────────────────────────────────────────────────────────────────
let allPresets = [];
let activeFilter = 'all';
let countdownInterval = null;
let currentPresetId = null;

// ── DOM REFS ─────────────────────────────────────────────────────────────────
const grid         = document.getElementById('presetsGrid');
const emptyState   = document.getElementById('emptyState');
const loader       = document.getElementById('loader');
const modal        = document.getElementById('downloadModal');
const modalClose   = document.getElementById('modalClose');
const modalName    = document.getElementById('modalPresetName');
const countdown    = document.getElementById('countdownState');
const readyState   = document.getElementById('readyState');
const countNum     = document.getElementById('countdownNumber');
const countText    = document.getElementById('countdownText');
const progressFill = document.getElementById('progressFill');
const countCircle  = document.getElementById('countdownCircle');
const downloadBtn  = document.getElementById('downloadNowBtn');
const toast        = document.getElementById('toast');
const toastMsg     = document.getElementById('toastMsg');
const searchInput  = document.getElementById('searchInput');
const header       = document.getElementById('header');
const navToggle    = document.getElementById('navToggle');
const statPresets  = document.getElementById('statPresets');
const statDownloads = document.getElementById('statDownloads');

const CIRCUMFERENCE = 276.5; // 2 * PI * 44

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    loader.classList.add('hidden');
  }, 1600);

  loadPresets();
  setupEventListeners();
});

// ── LOAD PRESETS ─────────────────────────────────────────────────────────────
async function loadPresets() {
  try {
    const res = await fetch('/api/presets');
    const data = await res.json();
    allPresets = data.presets || [];
    renderGrid(allPresets);
    updateStats();
  } catch (err) {
    console.error('Failed to load presets:', err);
    grid.innerHTML = '<p style="color:var(--text-dim);padding:40px;text-align:center;">Failed to load presets. Make sure the server is running.</p>';
  }
}

// ── RENDER GRID ──────────────────────────────────────────────────────────────
function renderGrid(presets) {
  grid.innerHTML = '';

  if (presets.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  presets.forEach((preset, i) => {
    const card = createCard(preset, i);
    grid.appendChild(card);
  });
}

// ── CREATE CARD ───────────────────────────────────────────────────────────────
function createCard(preset, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = `${index * 60}ms`;
  card.dataset.category = preset.category;

  card.innerHTML = `
    <div class="card__img-wrap">
      <img
        class="card__img"
        src="${preset.imageUrl}"
        alt="${escapeHtml(preset.title)}"
        loading="lazy"
        onerror="this.src='https://via.placeholder.com/600x400/1e1e28/888899?text=No+Image'"
      />
      <span class="card__badge">${escapeHtml(preset.category || 'General')}</span>
    </div>
    <div class="card__body">
      <h3 class="card__title">${escapeHtml(preset.title)}</h3>
      <p class="card__meta">
        <span>${formatDownloads(preset.downloads)}</span> downloads
      </p>
      <button class="card__download" data-id="${preset.id}" data-name="${escapeHtml(preset.title)}">
        <span class="dl-icon">⬇</span> Download Preset
      </button>
    </div>
  `;

  return card;
}

// ── FILTER & SEARCH ───────────────────────────────────────────────────────────
function filterAndRender() {
  const query = searchInput.value.trim().toLowerCase();

  let filtered = allPresets;

  // Category filter
  if (activeFilter !== 'all') {
    filtered = filtered.filter(p => p.category === activeFilter);
  }

  // Search filter
  if (query) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query)
    );
  }

  renderGrid(filtered);
}

// ── DOWNLOAD MODAL ────────────────────────────────────────────────────────────
function openDownloadModal(presetId, presetName) {
  currentPresetId = presetId;
  modalName.textContent = presetName;

  // Reset state
  countdown.style.display = 'block';
  readyState.style.display = 'none';
  progressFill.style.width = '0%';
  countCircle.style.strokeDashoffset = 0;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  startCountdown(30);
}

function closeDownloadModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  currentPresetId = null;
}

function startCountdown(seconds) {
  let remaining = seconds;
  countNum.textContent = remaining;
  countText.textContent = remaining;
  progressFill.style.transition = 'none';
  progressFill.style.width = '0%';
  countCircle.style.strokeDashoffset = 0;

  // Force reflow
  void progressFill.offsetWidth;
  progressFill.style.transition = 'width 1s linear';
  countCircle.style.transition = 'stroke-dashoffset 1s linear';

  countdownInterval = setInterval(() => {
    remaining--;

    countNum.textContent = remaining;
    countText.textContent = remaining;

    // Update progress bar
    const percent = ((seconds - remaining) / seconds) * 100;
    progressFill.style.width = `${percent}%`;

    // Update circle
    const dashOffset = CIRCUMFERENCE * (remaining / seconds);
    countCircle.style.strokeDashoffset = dashOffset;

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      showReadyState();
    }
  }, 1000);
}

async function showReadyState() {
  countdown.style.display = 'none';
  readyState.style.display = 'block';

  // Fetch the drive link and increment count
  try {
    const res = await fetch(`/api/presets/${currentPresetId}/download`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      downloadBtn.href = data.driveLink;
      // Update download count on card
      updateCardDownloads(currentPresetId, data.downloads);
    }
  } catch (err) {
    console.error('Failed to get download link:', err);
    downloadBtn.href = '#';
  }

  showToast('🎉 Download ready!');
}

// ── UPDATE DOWNLOAD COUNT ON CARD ─────────────────────────────────────────────
function updateCardDownloads(presetId, newCount) {
  const btn = document.querySelector(`[data-id="${presetId}"]`);
  if (btn) {
    const meta = btn.closest('.card__body').querySelector('.card__meta span');
    if (meta) meta.textContent = formatDownloads(newCount);
  }
  // Update in local array too
  const preset = allPresets.find(p => p.id === presetId);
  if (preset) preset.downloads = newCount;
  updateStats();
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function updateStats() {
  statPresets.textContent = allPresets.length;
  const total = allPresets.reduce((sum, p) => sum + (p.downloads || 0), 0);
  statDownloads.textContent = formatDownloads(total);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDownloads(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
function setupEventListeners() {

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      filterAndRender();
    });
  });

  // Search
  searchInput.addEventListener('input', filterAndRender);

  // Preset card clicks (event delegation)
  grid.addEventListener('click', (e) => {
    const dlBtn = e.target.closest('.card__download');
    if (dlBtn) {
      openDownloadModal(dlBtn.dataset.id, dlBtn.dataset.name);
    }
  });

  // Modal close
  modalClose.addEventListener('click', closeDownloadModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDownloadModal();
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDownloadModal();
  });

  // Header scroll effect
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Mobile nav toggle
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      document.querySelector('.nav').classList.toggle('open');
    });
  }
}
