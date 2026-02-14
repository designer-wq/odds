/**
 * ODD Generator - Main Application
 * With TheSportsDB API integration for team logos
 */
import { renderCanvas, formatDate } from './canvas-renderer.js';
import { searchLocalTeams, addTeam, getTeams } from './teams-store.js';
import bgStadiumUrl from './assets/bg-stadium.png';

// ===== CONFIG =====
const API_BASE = '/api/sports';
const MAX_GAMES = 4;
const SEARCH_DEBOUNCE = 400;
const STORAGE_KEY = 'odds_generator_state';

// ===== STATE =====
const state = {
    games: [],
    background: 'brasileirao',
    bgImageKey: 'none',     // Chave da imagem de fundo ('none', 'stadium', 'custom')
    bgImageObj: null,        // Objeto Image carregado (ou null)
    title: 'JOGOS DO DIA',
    date: formatDate(new Date()),
};

// ===== PERSISTÊNCIA (localStorage) =====
function saveState() {
    try {
        const serializable = {
            games: state.games.map(g => ({
                teamA: g.teamA,
                teamB: g.teamB,
                badgeUrlA: g.badgeUrlA,
                badgeUrlB: g.badgeUrlB,
                time: g.time,
                league: g.league,
                oddHome: g.oddHome,
                oddDraw: g.oddDraw,
                oddAway: g.oddAway,
            })),
            background: state.background,
            bgImageKey: state.bgImageKey,
            title: state.title,
            date: state.date,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) {
        console.warn('Erro ao salvar estado:', e);
    }
}

async function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);

        if (saved.background) state.background = saved.background;
        if (saved.bgImageKey) state.bgImageKey = saved.bgImageKey;
        if (saved.title) state.title = saved.title;
        if (saved.date) state.date = saved.date;

        if (saved.games && saved.games.length > 0) {
            state.games = saved.games.map(g => ({
                ...createGameData(),
                ...g,
            }));

            // Recarregar imagens dos logos a partir das URLs salvas
            await Promise.all(state.games.map(async (game) => {
                if (game.badgeUrlA) {
                    try { game.logoA = await loadImage(game.badgeUrlA); } catch (e) { /* ignora */ }
                }
                if (game.badgeUrlB) {
                    try { game.logoB = await loadImage(game.badgeUrlB); } catch (e) { /* ignora */ }
                }
            }));
        }
    } catch (e) {
        console.warn('Erro ao restaurar estado:', e);
    }
}

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const canvas = $('#artCanvas');
const gamesList = $('#gamesList');
const addGameBtn = $('#addGameBtn');
const exportBtn = $('#exportBtn');
const gameCounter = $('#gameCounter');
const artDate = $('#artDate');
const artTitle = $('#artTitle');

// ===== INIT =====
async function init() {
    // Restaurar estado salvo antes de tudo
    await restoreState();

    // Configurar data
    const today = new Date();
    const dateVal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Usar data salva ou data de hoje
    if (state.date === formatDate(new Date())) {
        artDate.value = dateVal;
    } else {
        // Converter DD/MM/YYYY para YYYY-MM-DD para o input
        const parts = state.date.split('/');
        if (parts.length === 3) {
            artDate.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
            artDate.value = dateVal;
        }
    }

    // Restaurar título
    artTitle.value = state.title;

    // Restaurar background ativo
    document.querySelector('.bg-option.active')?.classList.remove('active');
    document.querySelector(`.bg-option[data-bg="${state.background}"]`)?.classList.add('active');

    // Restaurar imagem de fundo ativa
    if (state.bgImageKey !== 'none') {
        document.querySelector('.bg-img-option.active')?.classList.remove('active');
        document.querySelector(`.bg-img-option[data-bgimg="${state.bgImageKey}"]`)?.classList.add('active');
    }

    // Event listeners
    addGameBtn.addEventListener('click', addGame);
    exportBtn.addEventListener('click', exportJPEG);
    artDate.addEventListener('change', onDateChange);
    artTitle.addEventListener('input', onTitleChange);

    // Background options
    document.querySelectorAll('.bg-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.bg-option.active')?.classList.remove('active');
            btn.classList.add('active');
            state.background = btn.dataset.bg;
            saveState();
            render();
        });
    });

    // ===== SELEÇÃO DE IMAGEM DE FUNDO =====
    // Pré-carregar imagem do estádio
    const stadiumImg = new Image();
    stadiumImg.crossOrigin = 'anonymous';
    stadiumImg.onload = () => {
        state._presetImages = state._presetImages || {};
        state._presetImages['stadium'] = stadiumImg;
        // Se já estava selecionado, aplicar
        if (state.bgImageKey === 'stadium') {
            state.bgImageObj = stadiumImg;
            render();
        }
    };
    stadiumImg.src = bgStadiumUrl;

    // Botões de imagem de fundo (preset)
    document.querySelectorAll('.bg-img-option[data-bgimg]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.bg-img-option.active')?.classList.remove('active');
            btn.classList.add('active');
            const key = btn.dataset.bgimg;
            state.bgImageKey = key;
            if (key === 'none') {
                state.bgImageObj = null;
            } else if (state._presetImages && state._presetImages[key]) {
                state.bgImageObj = state._presetImages[key];
            }
            saveState();
            render();
        });
    });

    // Upload de imagem personalizada
    document.getElementById('bgImgUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                state.bgImageKey = 'custom';
                state.bgImageObj = img;
                // Atualizar UI
                document.querySelector('.bg-img-option.active')?.classList.remove('active');
                // Criar botão para a imagem custom se não existir
                let customBtn = document.querySelector('.bg-img-option[data-bgimg="custom"]');
                if (!customBtn) {
                    customBtn = document.createElement('button');
                    customBtn.className = 'bg-img-option';
                    customBtn.dataset.bgimg = 'custom';
                    customBtn.title = 'Personalizado';
                    const thumbImg = document.createElement('img');
                    thumbImg.src = evt.target.result;
                    thumbImg.alt = 'Custom';
                    customBtn.appendChild(thumbImg);
                    customBtn.addEventListener('click', () => {
                        document.querySelector('.bg-img-option.active')?.classList.remove('active');
                        customBtn.classList.add('active');
                        state.bgImageKey = 'custom';
                        state.bgImageObj = img;
                        saveState();
                        render();
                    });
                    document.getElementById('bgImgOptions').insertBefore(customBtn, document.querySelector('.bg-img-upload'));
                } else {
                    customBtn.querySelector('img').src = evt.target.result;
                }
                customBtn.classList.add('active');
                saveState();
                render();
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Fechar sugestões de busca ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.team-search-wrapper')) {
            document.querySelectorAll('.search-suggestions.active').forEach(el => {
                el.classList.remove('active');
            });
        }
    });

    // Renderizar os cards e o canvas
    renderGameCards();
    updateCounter();
    render();
}

// ===== API =====
const searchCache = new Map();

async function searchTeams(query) {
    if (query.length < 2) return [];

    // Local teams first
    const localResults = searchLocalTeams(query).map(t => ({
        ...t,
        sport: '⭐ Salvo',
        league: '',
        country: '',
        isLocal: true,
    }));

    // Check cache for API results
    const cacheKey = query.toLowerCase();
    let apiResults = [];
    if (searchCache.has(cacheKey)) {
        apiResults = searchCache.get(cacheKey);
    } else {
        try {
            const res = await fetch(`${API_BASE}/searchteams.php?t=${encodeURIComponent(query)}`);
            const data = await res.json();

            apiResults = (data.teams || []).map(team => ({
                id: team.idTeam,
                name: team.strTeam,
                badge: team.strBadge ? team.strBadge.replace('https://r2.thesportsdb.com', '/sports-img') : null,
                sport: team.strSport,
                league: team.strLeague,
                country: team.strCountry,
            }));

            searchCache.set(cacheKey, apiResults);
        } catch (err) {
            console.error('API search error:', err);
        }
    }

    return [...localResults, ...apiResults];
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Permitir exportação do canvas com imagens externas
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// ===== DEBOUNCE =====
function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

// ===== GAME MANAGEMENT =====
function createGameData() {
    return {
        teamA: '',
        teamB: '',
        logoA: null,
        logoB: null,
        badgeUrlA: null,
        badgeUrlB: null,
        time: '',
        league: '',
        oddHome: '',
        oddDraw: '',
        oddAway: '',
    };
}

function addGame() {
    if (state.games.length >= MAX_GAMES) return;
    state.games.push(createGameData());
    renderGameCards();
    updateCounter();
    saveState();
    render();
}

function removeGame(index) {
    state.games.splice(index, 1);
    renderGameCards();
    updateCounter();
    saveState();
    render();
}

function updateCounter() {
    gameCounter.textContent = `${state.games.length}/${MAX_GAMES}`;
    addGameBtn.disabled = state.games.length >= MAX_GAMES;
}

// ===== RENDER GAME CARDS =====
function renderGameCards() {
    gamesList.innerHTML = '';

    state.games.forEach((game, index) => {
        const template = document.getElementById('gameCardTemplate');
        const card = template.content.cloneNode(true);
        const cardEl = card.querySelector('.game-card');

        cardEl.dataset.index = index;
        card.querySelector('.game-num-val').textContent = index + 1;

        // Remove button
        card.querySelector('.btn-remove').addEventListener('click', () => removeGame(index));

        // Team search inputs
        const teamInputs = card.querySelectorAll('.team-name-input');
        teamInputs.forEach(input => {
            const team = input.dataset.team;
            input.value = team === 'a' ? game.teamA : game.teamB;

            const suggestionsEl = card.querySelector(`.search-suggestions[data-team="${team}"]`);

            // Debounced search
            const doSearch = debounce(async (query) => {
                if (query.length < 2) {
                    suggestionsEl.classList.remove('active');
                    input.classList.remove('loading');
                    return;
                }

                input.classList.add('loading');
                const results = await searchTeams(query);
                input.classList.remove('loading');

                renderSuggestions(suggestionsEl, results, index, team);
            }, SEARCH_DEBOUNCE);

            input.addEventListener('input', (e) => {
                const val = e.target.value;
                if (team === 'a') game.teamA = val;
                else game.teamB = val;
                saveState();
                render();
                doSearch(val);
            });

            input.addEventListener('focus', () => {
                if (input.value.length >= 2) {
                    doSearch(input.value);
                }
            });
        });

        // Show existing logos
        const logoPreviews = card.querySelectorAll('.logo-preview');
        logoPreviews.forEach(preview => {
            const team = preview.dataset.team;
            const badgeUrl = team === 'a' ? game.badgeUrlA : game.badgeUrlB;
            if (badgeUrl) {
                showLogoPreview(preview, badgeUrl);
            }
        });

        // Time input
        const timeInput = card.querySelector('.match-time');
        timeInput.value = game.time;
        timeInput.addEventListener('input', (e) => {
            game.time = e.target.value;
            saveState();
            render();
        });
        timeInput.addEventListener('change', (e) => {
            game.time = e.target.value;
            saveState();
            render();
        });

        // League input
        const leagueInput = card.querySelector('.match-league');
        leagueInput.value = game.league;
        leagueInput.addEventListener('input', (e) => {
            game.league = e.target.value;
            saveState();
            render();
        });

        // Odd inputs
        const oddInputs = card.querySelectorAll('.odd-input');
        oddInputs.forEach(input => {
            const odd = input.dataset.odd;
            if (odd === 'home') input.value = game.oddHome;
            else if (odd === 'draw') input.value = game.oddDraw;
            else input.value = game.oddAway;

            input.addEventListener('input', (e) => {
                if (odd === 'home') game.oddHome = e.target.value;
                else if (odd === 'draw') game.oddDraw = e.target.value;
                else game.oddAway = e.target.value;
                saveState();
                render();
            });
        });

        gamesList.appendChild(card);
    });
}

// ===== SEARCH SUGGESTIONS =====
function renderSuggestions(container, teams, gameIndex, teamSide) {
    container.innerHTML = '';

    if (teams.length === 0) {
        container.innerHTML = '<div class="search-no-results">Nenhum time encontrado</div>';
        container.classList.add('active');
        return;
    }

    // Show up to 8 results
    teams.slice(0, 8).forEach(team => {
        const item = document.createElement('div');
        item.className = 'search-suggestion';

        const badgeHtml = team.badge
            ? `<img src="${team.badge}" alt="${team.name}" />`
            : `<div style="width:28px;height:28px;border-radius:4px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:14px;">🛡️</div>`;

        item.innerHTML = `
      ${badgeHtml}
      <div class="search-suggestion-info">
        <div class="search-suggestion-name">${team.name}</div>
        <div class="search-suggestion-meta">${team.sport} · ${team.league || team.country}</div>
      </div>
    `;

        item.addEventListener('click', () => selectTeam(team, gameIndex, teamSide, container));
        container.appendChild(item);
    });

    container.classList.add('active');
}

async function selectTeam(team, gameIndex, teamSide, container) {
    const game = state.games[gameIndex];
    if (!game) return;

    // Auto-save API team to local store (if not already local)
    if (!team.isLocal && team.badge) {
        const existing = getTeams();
        const alreadySaved = existing.some(t => t.name === team.name || t.badge === team.badge);
        if (!alreadySaved) {
            addTeam(team.name, team.badge);
        }
    }

    // Set team name
    if (teamSide === 'a') {
        game.teamA = team.name;
        game.badgeUrlA = team.badge;
    } else {
        game.teamB = team.name;
        game.badgeUrlB = team.badge;
    }

    // Load badge image for canvas
    if (team.badge) {
        try {
            const img = await loadImage(team.badge);
            if (teamSide === 'a') game.logoA = img;
            else game.logoB = img;
        } catch (err) {
            console.warn('Failed to load badge:', err);
        }
    }

    // Atualizar UI e salvar
    container.classList.remove('active');
    saveState();
    renderGameCards();
    render();
}

// ===== LOGO PREVIEW =====
function showLogoPreview(previewEl, url) {
    previewEl.innerHTML = `<img src="${url}" alt="Logo" />`;
    previewEl.classList.add('has-image');
}

// ===== DATE & TITLE HANDLERS =====
function onDateChange(e) {
    const parts = e.target.value.split('-');
    if (parts.length === 3) {
        state.date = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    saveState();
    render();
}

function onTitleChange(e) {
    state.title = e.target.value || 'JOGOS DO DIA';
    saveState();
    render();
}

// ===== CANVAS RENDER =====
function render() {
    renderCanvas(canvas, state.games, {
        background: state.background,
        bgImage: state.bgImageObj,
        title: state.title,
        date: state.date,
    });
}

// ===== EXPORT =====
function exportJPEG() {
    const link = document.createElement('a');
    link.download = `odds-${state.date.replace(/\//g, '-')}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);
