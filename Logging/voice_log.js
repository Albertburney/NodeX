const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

const voiceJoinTimes = new Map(); // track when someone joined voice

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

async function handleVoiceLog(oldState, newState) {
  const settings = loadSettings();
  const serverSettings = settings[newState.guild.id];
  if (!serverSettings?.logChannel) return;

  const logChannel = newState.client.channels.cache.get(serverSettings.logChannel);
  if (!logChannel) return;

  const member = newState.member;

  // joined a voice channel
  if (!oldState.channel && newState.channel) {
    voiceJoinTimes.set(member.id, Date.now());

    const embed = new EmbedBuilder()
      .setTitle('🔊 Joined Voice')
      .setColor(0x00FF00)
      .addFields(
        { name: 'Member',  value: `<@${member.id}>` },
        { name: 'Channel', value: newState.channel.name },
      )
      .setTimestamp();

    return logChannel.send({ embeds: [embed] });
  }

  // left a voice channel
  if (oldState.channel && !newState.channel) {
    const joinTime = voiceJoinTimes.get(member.id);
    const duration = joinTime
      ? Math.floor((Date.now() - joinTime) / 1000 / 60)
      : null;
    voiceJoinTimes.delete(member.id);

    const embed = new EmbedBuilder()
      .setTitle('🔇 Left Voice')
      .setColor(0xFF0000)
      .addFields(
        { name: 'Member',      value: `<@${member.id}>` },
        { name: 'Channel',     value: oldState.channel.name },
        { name: 'Time Spent',  value: duration !== null ? `${duration} minutes` : 'Unknown' },
      )
      .setTimestamp();

    return logChannel.send({ embeds: [embed] });
  }

  // moved between voice channels
  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    const embed = new EmbedBuilder()
      .setTitle('↔️ Moved Voice Channel')
      .setColor(0xFFA500)
      .addFields(
        { name: 'Member', value: `<@${member.id}>` },
        { name: 'From',   value: oldState.channel.name },
        { name: 'To',     value: newState.channel.name },
      )
      .setTimestamp();

    return logChannel.send({ embeds: [embed] });
  }
}

module.exports = { handleVoiceLog };