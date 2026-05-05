const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getServerSettings } = require('../Utils/settings');

async function handleMemberBan(guild, user) {
  const serverSettings = getServerSettings(guild.id);
  if (!serverSettings?.logChannel) return;

  const logChannel = guild.client.channels.cache.get(serverSettings.logChannel);
  if (!logChannel) return;

  // fetch who did the ban and the reason
  let bannedBy = 'Unknown';
  let reason = 'No reason provided';
  try {
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 1,
    });
    const entry = auditLogs.entries.first();
    if (entry) {
      bannedBy = `<@${entry.executor.id}>`;
      reason = entry.reason || 'No reason provided';
    }
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle('🔨 Member Banned')
    .setColor(0xFF0000)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Member',    value: `<@${user.id}> (${user.username})` },
      { name: 'Banned By', value: bannedBy },
      { name: 'Reason',    value: reason },
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
}

async function handleMemberUnban(guild, user) {
  const serverSettings = getServerSettings(guild.id);
  if (!serverSettings?.logChannel) return;

  const logChannel = guild.client.channels.cache.get(serverSettings.logChannel);
  if (!logChannel) return;

  let unbannedBy = 'Unknown';
  try {
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanRemove,
      limit: 1,
    });
    const entry = auditLogs.entries.first();
    if (entry) unbannedBy = `<@${entry.executor.id}>`;
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle('✅ Member Unbanned')
    .setColor(0x00FF00)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Member',      value: `<@${user.id}> (${user.username})` },
      { name: 'Unbanned By', value: unbannedBy },
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
}

module.exports = { handleMemberBan, handleMemberUnban };