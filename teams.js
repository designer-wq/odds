/**
 * Teams Page — Manage custom teams
 */
import { getTeams, addTeam, updateTeam, removeTeam } from './teams-store.js';

// ===== STATE =====
let editingTeamId = null;
let pendingDeleteId = null;
let logoDataUrl = null;
let filterQuery = '';

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const teamsGrid = $('#teamsGrid');
const teamsEmpty = $('#teamsEmpty');
const teamsCount = $('#teamsCount');
const searchInput = $('#searchInput');
const addTeamBtn = $('#addTeamBtn');
const addTeamBtnEmpty = $('#addTeamBtnEmpty');

// Modal
const modalOverlay = $('#modalOverlay');
const modalTitle = $('#modalTitle');
const modalClose = $('#modalClose');
const modalCancel = $('#modalCancel');
const modalSave = $('#modalSave');
const teamNameInput = $('#teamName');
const logoFileInput = $('#logoFileInput');
const logoPreview = $('#logoPreview');
const logoUrlInput = $('#logoUrlInput');

// Delete
const deleteOverlay = $('#deleteOverlay');
const deleteClose = $('#deleteClose');
const deleteCancel = $('#deleteCancel');
const deleteConfirm = $('#deleteConfirm');
const deleteName = $('#deleteName');

// ===== INIT =====
function init() {
    addTeamBtn.addEventListener('click', () => openModal());
    addTeamBtnEmpty.addEventListener('click', () => openModal());
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    modalSave.addEventListener('click', handleSave);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    deleteClose.addEventListener('click', closeDelete);
    deleteCancel.addEventListener('click', closeDelete);
    deleteConfirm.addEventListener('click', handleDelete);
    deleteOverlay.addEventListener('click', (e) => {
        if (e.target === deleteOverlay) closeDelete();
    });

    logoFileInput.addEventListener('change', handleFileUpload);
    logoUrlInput.addEventListener('input', handleUrlInput);

    searchInput.addEventListener('input', (e) => {
        filterQuery = e.target.value.toLowerCase();
        renderTeams();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDelete();
        }
    });

    renderTeams();
}

// ===== RENDER TEAMS =====
function renderTeams() {
    const allTeams = getTeams();
    const teams = filterQuery
        ? allTeams.filter(t => t.name.toLowerCase().includes(filterQuery))
        : allTeams;

    teamsCount.textContent = allTeams.length;

    if (allTeams.length === 0) {
        teamsGrid.style.display = 'none';
        teamsEmpty.style.display = 'flex';
        return;
    }

    teamsGrid.style.display = '';
    teamsEmpty.style.display = 'none';

    teamsGrid.innerHTML = '';

    if (teams.length === 0) {
        teamsGrid.innerHTML = `
      <div class="teams-no-results">
        <p>Nenhum time encontrado para "<strong>${filterQuery}</strong>"</p>
      </div>
    `;
        return;
    }

    teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.innerHTML = `
      <div class="team-card-logo">
        ${team.badge
                ? `<img src="${team.badge}" alt="${team.name}" />`
                : `<span class="team-card-placeholder">🛡️</span>`
            }
      </div>
      <div class="team-card-name">${team.name}</div>
      <div class="team-card-actions">
        <button class="btn-icon-sm btn-edit" title="Editar" data-id="${team.id}">✏️</button>
        <button class="btn-icon-sm btn-delete" title="Remover" data-id="${team.id}">🗑️</button>
      </div>
    `;

        card.querySelector('.btn-edit').addEventListener('click', () => openModal(team));
        card.querySelector('.btn-delete').addEventListener('click', () => openDelete(team));

        teamsGrid.appendChild(card);
    });
}

// ===== MODAL =====
function openModal(team = null) {
    editingTeamId = team ? team.id : null;
    modalTitle.textContent = team ? 'Editar Time' : 'Adicionar Time';
    teamNameInput.value = team ? team.name : '';
    logoUrlInput.value = '';
    logoDataUrl = team ? team.badge : null;

    if (logoDataUrl) {
        logoPreview.innerHTML = `<img src="${logoDataUrl}" alt="Logo" />`;
    } else {
        logoPreview.innerHTML = `<span class="upload-placeholder">🛡️</span>`;
    }

    modalOverlay.classList.add('active');
    setTimeout(() => teamNameInput.focus(), 100);
}

function closeModal() {
    modalOverlay.classList.remove('active');
    editingTeamId = null;
    logoDataUrl = null;
    teamNameInput.value = '';
    logoUrlInput.value = '';
    logoFileInput.value = '';
    logoPreview.innerHTML = `<span class="upload-placeholder">🛡️</span>`;
}

async function handleSave() {
    const name = teamNameInput.value.trim();
    if (!name) {
        teamNameInput.focus();
        teamNameInput.style.borderColor = 'var(--danger)';
        setTimeout(() => teamNameInput.style.borderColor = '', 1500);
        return;
    }

    // Show loading state
    modalSave.disabled = true;
    modalSave.textContent = 'Salvando...';

    try {
        if (editingTeamId) {
            await updateTeam(editingTeamId, { name, badge: logoDataUrl });
        } else {
            await addTeam(name, logoDataUrl);
        }
    } catch (err) {
        console.error('Error saving team:', err);
    }

    modalSave.disabled = false;
    modalSave.textContent = 'Salvar';
    closeModal();
    renderTeams();
}

// ===== FILE UPLOAD =====
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        logoDataUrl = ev.target.result;
        logoPreview.innerHTML = `<img src="${logoDataUrl}" alt="Logo" />`;
        logoUrlInput.value = '';
    };
    reader.readAsDataURL(file);
}

function handleUrlInput(e) {
    const url = e.target.value.trim();
    if (!url) return;

    // Load image to validate and show preview
    const img = new Image();
    img.onload = () => {
        // Convert to dataURL for localStorage storage
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
            logoDataUrl = canvas.toDataURL('image/png');
            logoPreview.innerHTML = `<img src="${logoDataUrl}" alt="Logo" />`;
        } catch {
            // CORS — use URL directly
            logoDataUrl = url;
            logoPreview.innerHTML = `<img src="${url}" alt="Logo" />`;
        }
    };
    img.onerror = () => {
        logoPreview.innerHTML = `<span class="upload-placeholder">❌</span>`;
    };
    img.crossOrigin = 'anonymous';
    img.src = url;
}

// ===== DELETE =====
function openDelete(team) {
    pendingDeleteId = team.id;
    deleteName.textContent = team.name;
    deleteOverlay.classList.add('active');
}

function closeDelete() {
    deleteOverlay.classList.remove('active');
    pendingDeleteId = null;
}

function handleDelete() {
    if (pendingDeleteId) {
        removeTeam(pendingDeleteId);
        closeDelete();
        renderTeams();
    }
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
