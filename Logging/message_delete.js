const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getServerSettings } = require('../Utils/settings');

async function handleMessageDelete(message) {
  if (message.author?.bot) return;
  if (!message.guild) return;

  const serverSettings = getServerSettings(message.guild.id);
  if (!serverSettings?.logChannel) return;

  const logChannel = message.client.channels.cache.get(serverSettings.logChannel);
  if (!logChannel) return;

  // fetch audit log to find who deleted the message
  let deletedBy = 'Unknown';
  try {
    const auditLogs = await message.guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 1,
    });
    const entry = auditLogs.entries.first();
    if (entry && entry.target.id === message.author?.id) {
      deletedBy = `<@${entry.executor.id}>`;
    }
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Message Deleted')
    .setColor(0xFF0000)
    .addFields(
      { name: 'Author',     value: `<@${message.author?.id}> (${message.author?.username})` },
      { name: 'Channel',    value: `<#${message.channel.id}>` },
      { name: 'Deleted By', value: deletedBy },
      { name: 'Content',    value: message.content || '*No text content*' },
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
}

module.exports = { handleMessageDelete };