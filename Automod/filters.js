const { EmbedBuilder } = require('discord.js');

// Caches for performance
const userMessageHistory = new Map(); // userId -> { messages: [], lastCleanup: timestamp }
const userWarnings = new Map(); // guildId -> userId -> warningCount
const spamCooldowns = new Map(); // userId -> lastMessageTimestamp

// Cleanup old data every 30 minutes
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  // Clean up message history older than 30 minutes
  for (const [userId, data] of userMessageHistory) {
    data.messages = data.messages.filter(msg => now - msg.timestamp < thirtyMinutes);
    if (data.messages.length === 0) {
      userMessageHistory.delete(userId);
    }
  }

  // Clean up spam cooldowns older than 1 minute
  for (const [userId, timestamp] of spamCooldowns) {
    if (now - timestamp > 60 * 1000) {
      spamCooldowns.delete(userId);
    }
  }
}, 10 * 60 * 1000); // Every 10 minutes

/**
 * Check for bad words using regex patterns
 */
function checkBadWords(message, badWords) {
  if (!badWords || badWords.length === 0) return null;

  const content = message.content.toLowerCase();
  for (const word of badWords) {
    // Create regex pattern with word boundaries and common variations
    const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b`, 'i');
    if (pattern.test(content)) {
      return word;
    }
  }
  return null;
}

/**
 * Check for excessive caps lock
 */
function checkCapsLock(message, maxCapsPercent = 70) {
  const content = message.content;
  if (content.length < 5) return false; // Ignore short messages

  const uppercaseLetters = content.replace(/[^A-Z]/g, '').length;
  const totalLetters = content.replace(/[^A-Za-z]/g, '').length;

  if (totalLetters === 0) return false;

  const capsPercent = (uppercaseLetters / totalLetters) * 100;
  return capsPercent > maxCapsPercent;
}

/**
 * Check for spam based on message frequency
 */
function checkSpam(message, spamLimit = 5, timeWindow = 5000) {
  const userId = message.author.id;
  const now = Date.now();

  if (!userMessageHistory.has(userId)) {
    userMessageHistory.set(userId, { messages: [], lastCleanup: now });
  }

  const userData = userMessageHistory.get(userId);

  // Clean old messages
  userData.messages = userData.messages.filter(msg => now - msg.timestamp < timeWindow);

  // Add current message
  userData.messages.push({ timestamp: now, content: message.content });

  // Check if spam threshold exceeded
  if (userData.messages.length > spamLimit) {
    // Check if messages are too similar (duplicate spam)
    const recentMessages = userData.messages.slice(-spamLimit);
    const uniqueMessages = new Set(recentMessages.map(m => m.content.toLowerCase().trim()));

    if (uniqueMessages.size <= 2) { // If mostly duplicate messages
      return true;
    }
  }

  return false;
}

/**
 * Check for excessive mentions
 */
function checkMentionSpam(message, maxMentions = 5) {
  const mentions = message.mentions.users.size + message.mentions.roles.size;
  return mentions > maxMentions;
}

/**
 * Check for links/URLs
 */
function checkLinks(message, allowLinks = false) {
  if (allowLinks) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = message.content.match(urlRegex);
  return match ? match[0] : null;
}

/**
 * Check for Discord invite links
 */
function checkInvites(message, allowInvites = false) {
  if (allowInvites) return null;

  const inviteRegex = /(discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9]+)/g;
  const match = message.content.match(inviteRegex);
  return match ? match[0] : null;
}

/**
 * Check if user should be whitelisted (bypass automod)
 */
function isWhitelisted(message, whitelist = {}) {
  const { roles = [], users = [], channels = [] } = whitelist;

  // Check user whitelist
  if (users.includes(message.author.id)) return true;

  // Check channel whitelist
  if (channels.includes(message.channel.id)) return true;

  // Check role whitelist
  if (message.member && roles.some(roleId => message.member.roles.cache.has(roleId))) {
    return true;
  }

  return false;
}

/**
 * Main filter function that runs all checks
 */
async function runFilters(message, automodConfig) {
  if (!automodConfig?.enabled) return null;

  // Skip if whitelisted
  if (isWhitelisted(message, automodConfig.whitelist)) return null;

  const violations = [];

  // Run all filter checks
  const badWord = checkBadWords(message, automodConfig.badWords);
  if (badWord) violations.push({ type: 'badword', reason: `Contains prohibited word: ${badWord}` });

  if (checkCapsLock(message, automodConfig.maxCaps)) {
    violations.push({ type: 'caps', reason: `Excessive caps lock usage` });
  }

  if (checkSpam(message, automodConfig.spamLimit)) {
    violations.push({ type: 'spam', reason: `Message spam detected` });
  }

  if (checkMentionSpam(message, automodConfig.maxMentions)) {
    violations.push({ type: 'mentions', reason: `Too many mentions (${message.mentions.users.size + message.mentions.roles.size})` });
  }

  const link = checkLinks(message, automodConfig.allowLinks);
  if (link) violations.push({ type: 'link', reason: `Contains link: ${link}` });

  const invite = checkInvites(message, automodConfig.allowInvites);
  if (invite) violations.push({ type: 'invite', reason: `Contains Discord invite: ${invite}` });

  return violations.length > 0 ? violations : null;
}

console.log('[AutoMod Filters] Loaded...');
module.exports = { runFilters };