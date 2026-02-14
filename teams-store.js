/**
 * Teams Store — Shared localStorage CRUD for custom teams
 */

const STORAGE_KEY = 'odds_custom_teams';

function generateId() {
    return 'team_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

export function getTeams() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveTeams(teams) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

export function addTeam(name, logoDataUrl) {
    const teams = getTeams();
    const team = {
        id: generateId(),
        name: name.trim(),
        badge: logoDataUrl || null,
        createdAt: Date.now(),
    };
    teams.push(team);
    saveTeams(teams);
    return team;
}

export function updateTeam(id, updates) {
    const teams = getTeams();
    const idx = teams.findIndex(t => t.id === id);
    if (idx === -1) return null;
    teams[idx] = { ...teams[idx], ...updates };
    saveTeams(teams);
    return teams[idx];
}

export function removeTeam(id) {
    const teams = getTeams().filter(t => t.id !== id);
    saveTeams(teams);
}

export function searchLocalTeams(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return getTeams().filter(t => t.name.toLowerCase().includes(q));
}
