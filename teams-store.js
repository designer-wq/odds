/**
 * Teams Store — Shared localStorage CRUD for custom teams
 * Badges are stored as Cloudinary URLs
 */

import { uploadToCloudinary, isCloudinaryUrl } from './cloudinary.js';

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

function saveTeamsToStorage(teams) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

/**
 * Add a team — uploads badge to Cloudinary if needed
 * @param {string} name
 * @param {string} badgeUrl - URL or base64 data URL
 * @returns {Promise<object>} the saved team
 */
export async function addTeam(name, badgeUrl) {
    const teams = getTeams();

    let cloudUrl = badgeUrl || null;

    // Upload to Cloudinary if it's not already a Cloudinary URL
    if (cloudUrl && !isCloudinaryUrl(cloudUrl)) {
        try {
            cloudUrl = await uploadToCloudinary(cloudUrl);
        } catch (err) {
            console.warn('Cloudinary upload failed, keeping original URL:', err);
        }
    }

    const team = {
        id: generateId(),
        name: name.trim(),
        badge: cloudUrl,
        createdAt: Date.now(),
    };
    teams.push(team);
    saveTeamsToStorage(teams);
    return team;
}

/**
 * Update a team — uploads new badge to Cloudinary if changed
 */
export async function updateTeam(id, updates) {
    const teams = getTeams();
    const idx = teams.findIndex(t => t.id === id);
    if (idx === -1) return null;

    // Upload new badge to Cloudinary if it changed and isn't already on Cloudinary
    if (updates.badge && !isCloudinaryUrl(updates.badge) && updates.badge !== teams[idx].badge) {
        try {
            updates.badge = await uploadToCloudinary(updates.badge);
        } catch (err) {
            console.warn('Cloudinary upload failed, keeping original:', err);
        }
    }

    teams[idx] = { ...teams[idx], ...updates };
    saveTeamsToStorage(teams);
    return teams[idx];
}

export function removeTeam(id) {
    const teams = getTeams().filter(t => t.id !== id);
    saveTeamsToStorage(teams);
}

export function searchLocalTeams(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return getTeams().filter(t => t.name.toLowerCase().includes(q));
}
