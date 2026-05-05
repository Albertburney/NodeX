const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getServerSettings } = require('../Utils/settings');

// Moderation commands
async function handleKick(message) {
  try {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply('❌ You need Kick Members permission.');
    }

    const args = message.content.split(' ').slice(1);
    if (args.length < 1) return message.reply('Usage: `!kick @user [reason]`');

    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Please mention a user to kick.');

    const member = message.guild.members.cache.get(user.id);
    if (!member) return message.reply('❌ User not found in this server.');

    if (!member.kickable) return message.reply('❌ I cannot kick this user.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await member.kick(reason);

    // Log the action
    const serverSettings = getServerSettings(message.guild.id);
    if (serverSettings?.logChannel) {
      const logChannel = message.guild.channels.cache.get(serverSettings.logChannel);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('👢 Member Kicked')
          .setColor(0xFFA500)
          .addFields(
            { name: 'Member', value: `<@${user.id}> (${user.username})` },
            { name: 'Kicked By', value: `<@${message.author.id}>` },
            { name: 'Reason', value: reason }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    }

    await message.reply(`✅ Kicked ${user.username} for: ${reason}`);
  } catch (error) {
    console.error('Error in handleKick:', error);
    message.reply('❌ An error occurred while trying to kick the user.');
  }
}

async function handleBan(message) {
  try {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('❌ You need Ban Members permission.');
    }

    const args = message.content.split(' ').slice(1);
    if (args.length < 1) return message.reply('Usage: `!ban @user [reason]`');

    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Please mention a user to ban.');

    const member = message.guild.members.cache.get(user.id);
    if (member && !member.bannable) return message.reply('❌ I cannot ban this user.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    await message.guild.members.ban(user, { reason });

    // Log the action
    const serverSettings = getServerSettings(message.guild.id);
    if (serverSettings?.logChannel) {
      const logChannel = message.guild.channels.cache.get(serverSettings.logChannel);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🔨 Member Banned')
          .setColor(0xFF0000)
          .addFields(
            { name: 'Member', value: `<@${user.id}> (${user.username})` },
            { name: 'Banned By', value: `<@${message.author.id}>` },
            { name: 'Reason', value: reason }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    }

    await message.reply(`✅ Banned ${user.username} for: ${reason}`);
  } catch (error) {
    console.error('Error in handleBan:', error);
    message.reply('❌ An error occurred while trying to ban the user.');
  }
}

async function handleMute(message) {
  try {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ You need Moderate Members permission.');
    }

    const args = message.content.split(' ').slice(1);
    if (args.length < 2) return message.reply('Usage: `!mute @user <duration> [reason]`\nDuration examples: 10m, 1h, 1d');

    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Please mention a user to mute.');

    const member = message.guild.members.cache.get(user.id);
    if (!member) return message.reply('❌ User not found in this server.');
    if (!member.moderatable) return message.reply('❌ I cannot mute this user.');

    const durationStr = args[1];
    const reason = args.slice(2).join(' ') || 'No reason provided';

    // Parse duration
    const duration = parseDuration(durationStr);
    if (!duration) return message.reply('❌ Invalid duration format. Use: 10m, 1h, 1d, etc.');

    await member.timeout(duration, reason);

    // Log the action
    const serverSettings = getServerSettings(message.guild.id);
    if (serverSettings?.logChannel) {
      const logChannel = message.guild.channels.cache.get(serverSettings.logChannel);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🤐 Member Muted')
          .setColor(0xFFFF00)
          .addFields(
            { name: 'Member', value: `<@${user.id}> (${user.username})` },
            { name: 'Muted By', value: `<@${message.author.id}>` },
            { name: 'Duration', value: formatDuration(duration) },
            { name: 'Reason', value: reason }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    }

    await message.reply(`✅ Muted ${user.username} for ${formatDuration(duration)}: ${reason}`);
  } catch (error) {
    console.error('Error in handleMute:', error);
    message.reply('❌ An error occurred while trying to mute the user.');
  }
}

async function handleWarn(message) {
  try {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ You need Moderate Members permission.');
    }

    const args = message.content.split(' ').slice(1);
    if (args.length < 1) return message.reply('Usage: `!warn @user [reason]`');

    const user = message.mentions.users.first();
    if (!user) return message.reply('❌ Please mention a user to warn.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    // Log the warning
    const serverSettings = getServerSettings(message.guild.id);
    if (serverSettings?.logChannel) {
      const logChannel = message.guild.channels.cache.get(serverSettings.logChannel);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Member Warned')
          .setColor(0xFFA500)
          .addFields(
            { name: 'Member', value: `<@${user.id}> (${user.username})` },
            { name: 'Warned By', value: `<@${message.author.id}>` },
            { name: 'Reason', value: reason }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    }

    await message.reply(`✅ Warned ${user.username}: ${reason}`);
  } catch (error) {
    console.error('Error in handleWarn:', error);
    message.reply('❌ An error occurred while trying to warn the user.');
  }
}

async function handleClear(message) {
  try {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply('❌ You need Manage Messages permission.');
    }

    const args = message.content.split(' ').slice(1);
    if (args.length < 1) return message.reply('Usage: `!clear <amount>` (max 100)');

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('❌ Please specify a number between 1 and 100.');
    }

    const deleted = await message.channel.bulkDelete(amount, true);

    // Log the action
    const serverSettings = getServerSettings(message.guild.id);
    if (serverSettings?.logChannel) {
      const logChannel = message.guild.channels.cache.get(serverSettings.logChannel);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🗑️ Messages Cleared')
          .setColor(0x00FF00)
          .addFields(
            { name: 'Channel', value: `<#${message.channel.id}>` },
            { name: 'Cleared By', value: `<@${message.author.id}>` },
            { name: 'Amount', value: `${deleted.size} messages` }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    }

    const reply = await message.reply(`✅ Cleared ${deleted.size} messages.`);
    setTimeout(() => reply.delete(), 5000); // Delete confirmation after 5 seconds
  } catch (error) {
    console.error('Error in handleClear:', error);
    message.reply('❌ An error occurred while trying to clear messages.');
  }
}

function parseDuration(str) {
  const regex = /^(\d+)([smhd])$/;
  const match = str.match(regex);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

console.log('[Moderation Module] Loaded...');
module.exports = { handleKick, handleBan, handleMute, handleWarn, handleClear };