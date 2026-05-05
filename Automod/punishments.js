const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getServerSettings, updateServerSettings } = require('../Utils/settings');

// Warning tracking per guild
const warningCache = new Map(); // guildId -> userId -> { count, lastWarning, reasons[] }

/**
 * Get user warnings for a guild
 */
function getUserWarnings(guildId, userId) {
  if (!warningCache.has(guildId)) {
    warningCache.set(guildId, new Map());
  }

  const guildWarnings = warningCache.get(guildId);
  return guildWarnings.get(userId) || { count: 0, lastWarning: 0, reasons: [] };
}

/**
 * Add a warning to a user
 */
function addWarning(guildId, userId, reason) {
  if (!warningCache.has(guildId)) {
    warningCache.set(guildId, new Map());
  }

  const guildWarnings = warningCache.get(guildId);
  const userWarnings = guildWarnings.get(userId) || { count: 0, lastWarning: 0, reasons: [] };

  userWarnings.count++;
  userWarnings.lastWarning = Date.now();
  userWarnings.reasons.push({
    reason,
    timestamp: Date.now()
  });

  // Keep only last 10 warnings
  if (userWarnings.reasons.length > 10) {
    userWarnings.reasons = userWarnings.reasons.slice(-10);
  }

  guildWarnings.set(userId, userWarnings);
  return userWarnings;
}

/**
 * Reset user warnings
 */
function resetWarnings(guildId, userId) {
  if (warningCache.has(guildId)) {
    const guildWarnings = warningCache.get(guildId);
    guildWarnings.delete(userId);
  }
}

/**
 * Execute punishment based on violation and warning count
 */
async function executePunishment(message, violations, automodConfig) {
  try {
    const { punishment } = automodConfig;
    if (!punishment) return;

    const userWarnings = getUserWarnings(message.guild.id, message.author.id);
    const newWarnings = addWarning(message.guild.id, message.author.id, violations.map(v => v.reason).join(', '));

    // Check if we should delete the message
    if (automodConfig.deleteMessage !== false) {
      try {
        await message.delete();
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }

    // Determine action based on warning count
    let action = 'warn';
    if (newWarnings.count >= (punishment.warnLimit || 3)) {
      action = punishment.action || 'timeout';
      // Reset warnings after punishment
      resetWarnings(message.guild.id, message.author.id);
    }

    // Execute the action
    switch (action) {
      case 'timeout':
        await executeTimeout(message, automodConfig, violations);
        break;
      case 'kick':
        await executeKick(message, automodConfig, violations);
        break;
      case 'ban':
        await executeBan(message, automodConfig, violations);
        break;
      default:
        await sendWarning(message, violations, newWarnings.count);
    }

    // Log the automod action
    await logAutomodAction(message, violations, action, newWarnings.count);

  } catch (error) {
    console.error('Error executing punishment:', error);
  }
}

/**
 * Send a warning message
 */
async function sendWarning(message, violations, warningCount) {
  try {
    const embed = new EmbedBuilder()
      .setTitle('⚠️ AutoMod Warning')
      .setColor(0xFFA500)
      .setDescription(`Your message violated server rules.`)
      .addFields(
        { name: 'Violations', value: violations.map(v => `• ${v.reason}`).join('\n') },
        { name: 'Warning Count', value: `${warningCount}` }
      )
      .setFooter({ text: 'Repeated violations may result in further action' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error sending warning:', error);
  }
}

/**
 * Execute timeout punishment
 */
async function executeTimeout(message, automodConfig, violations) {
  try {
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      console.log('No permission to timeout users');
      return await sendWarning(message, violations, getUserWarnings(message.guild.id, message.author.id).count);
    }

    const duration = (automodConfig.timeoutDuration || 10) * 60 * 1000; // Default 10 minutes
    await message.member.timeout(duration, `AutoMod: ${violations.map(v => v.reason).join(', ')}`);

    const embed = new EmbedBuilder()
      .setTitle('🤐 AutoMod Timeout')
      .setColor(0xFFFF00)
      .setDescription(`${message.author} has been timed out for violating rules.`)
      .addFields(
        { name: 'Duration', value: `${automodConfig.timeoutDuration || 10} minutes` },
        { name: 'Reason', value: violations.map(v => v.reason).join(', ') }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error executing timeout:', error);
    await sendWarning(message, violations, getUserWarnings(message.guild.id, message.author.id).count);
  }
}

/**
 * Execute kick punishment
 */
async function executeKick(message, automodConfig, violations) {
  try {
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      console.log('No permission to kick users');
      return await executeTimeout(message, automodConfig, violations);
    }

    await message.member.kick(`AutoMod: ${violations.map(v => v.reason).join(', ')}`);

    const embed = new EmbedBuilder()
      .setTitle('👢 AutoMod Kick')
      .setColor(0xFFA500)
      .setDescription(`${message.author} has been kicked for repeated violations.`)
      .addFields(
        { name: 'Reason', value: violations.map(v => v.reason).join(', ') }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error executing kick:', error);
    await executeTimeout(message, automodConfig, violations);
  }
}

/**
 * Execute ban punishment
 */
async function executeBan(message, automodConfig, violations) {
  try {
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      console.log('No permission to ban users');
      return await executeKick(message, automodConfig, violations);
    }

    await message.guild.members.ban(message.author, {
      reason: `AutoMod: ${violations.map(v => v.reason).join(', ')}`
    });

    const embed = new EmbedBuilder()
      .setTitle('🔨 AutoMod Ban')
      .setColor(0xFF0000)
      .setDescription(`${message.author} has been banned for repeated violations.`)
      .addFields(
        { name: 'Reason', value: violations.map(v => v.reason).join(', ') }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error executing ban:', error);
    await executeKick(message, automodConfig, violations);
  }
}

/**
 * Log automod actions to the configured log channel
 */
async function logAutomodAction(message, violations, action, warningCount) {
  try {
    const serverSettings = getServerSettings(message.guild.id);
    if (!serverSettings?.logChannel) return;

    const logChannel = message.guild.channels.cache.get(serverSettings.logChannel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('🤖 AutoMod Action')
      .setColor(0xFF6B6B)
      .addFields(
        { name: 'User', value: `<@${message.author.id}> (${message.author.username})` },
        { name: 'Channel', value: `<#${message.channel.id}>` },
        { name: 'Action', value: action.charAt(0).toUpperCase() + action.slice(1) },
        { name: 'Violations', value: violations.map(v => `• ${v.reason}`).join('\n') },
        { name: 'Warning Count', value: `${warningCount}` }
      )
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging automod action:', error);
  }
}

console.log('[AutoMod Punishments] Loaded...');
module.exports = { executePunishment, getUserWarnings, resetWarnings };