const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', 'settings.json');
let settingsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function isValidSnowflake(id) {
  return /^\d{17,19}$/.test(id);
}

function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Settings must be an object');
  }

  for (const guildId in settings) {
    if (!isValidSnowflake(guildId)) {
      console.warn(`Invalid guild ID: ${guildId}`);
      delete settings[guildId];
      continue;
    }

    const guildSettings = settings[guildId];
    if (!guildSettings || typeof guildSettings !== 'object') {
      console.warn(`Invalid settings for guild ${guildId}`);
      delete settings[guildId];
      continue;
    }

    // Validate logChannel
    if (guildSettings.logChannel && !isValidSnowflake(guildSettings.logChannel)) {
      console.warn(`Invalid logChannel for guild ${guildId}: ${guildSettings.logChannel}`);
      delete guildSettings.logChannel;
    }

    // Validate welcomeChannel
    if (guildSettings.welcomeChannel && !isValidSnowflake(guildSettings.welcomeChannel)) {
      console.warn(`Invalid welcomeChannel for guild ${guildId}: ${guildSettings.welcomeChannel}`);
      delete guildSettings.welcomeChannel;
    }

    // Validate reactionRoles
    if (guildSettings.reactionRoles) {
      if (!Array.isArray(guildSettings.reactionRoles)) {
        console.warn(`reactionRoles must be an array for guild ${guildId}`);
        delete guildSettings.reactionRoles;
      } else {
        guildSettings.reactionRoles = guildSettings.reactionRoles.filter(rr => {
          return rr && typeof rr === 'object' &&
                 isValidSnowflake(rr.messageId) &&
                 rr.emoji && typeof rr.emoji === 'string' &&
                 isValidSnowflake(rr.roleId);
        });
      }
    }

    // Validate greetingMessage
    if (guildSettings.greetingMessage && typeof guildSettings.greetingMessage !== 'string') {
      console.warn(`Invalid greetingMessage for guild ${guildId}`);
      delete guildSettings.greetingMessage;
    }

    // Validate welcomeMessage
    if (guildSettings.welcomeMessage && typeof guildSettings.welcomeMessage !== 'string') {
      console.warn(`Invalid welcomeMessage for guild ${guildId}`);
      delete guildSettings.welcomeMessage;
    }
  }

  return settings;
}

function loadSettings() {
  try {
    const now = Date.now();
    if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return settingsCache;
    }

    if (!fs.existsSync(SETTINGS_FILE)) {
      settingsCache = {};
      cacheTimestamp = now;
      return settingsCache;
    }

    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    const validated = validateSettings(parsed);

    settingsCache = validated;
    cacheTimestamp = now;
    return settingsCache;
  } catch (error) {
    console.error('Error loading settings:', error);
    // Return empty settings on error to prevent crashes
    return {};
  }
}

function saveSettings(settings) {
  try {
    const validated = validateSettings(settings);
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(validated, null, 2));
    // Update cache
    settingsCache = validated;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

function getServerSettings(guildId) {
  const settings = loadSettings();
  return settings[guildId] || {};
}

function updateServerSettings(guildId, updates) {
  const settings = loadSettings();
  settings[guildId] = { ...settings[guildId], ...updates };
  saveSettings(settings);
}

function invalidateCache() {
  settingsCache = null;
  cacheTimestamp = 0;
}

console.log('[Settings Manager] Loaded with caching and validation...');
module.exports = { loadSettings, saveSettings, getServerSettings, updateServerSettings, invalidateCache };