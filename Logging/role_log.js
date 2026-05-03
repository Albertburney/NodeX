const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const fs = require('fs');

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

async function handleRoleLog(oldMember, newMember) {
  const settings = loadSettings();
  const serverSettings = settings[newMember.guild.id];
  if (!serverSettings?.logChannel) return;

  const logChannel = newMember.client.channels.cache.get(serverSettings.logChannel);
  if (!logChannel) return;

  const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (addedRoles.size === 0 && removedRoles.size === 0) return;

  // find who changed the role
  let changedBy = 'Unknown';
  try {
    const auditLogs = await newMember.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberRoleUpdate,
      limit: 1,
    });
    const entry = auditLogs.entries.first();
    if (entry) changedBy = `<@${entry.executor.id}>`;
  } catch {}

  if (addedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setTitle('➕ Role Added')
      .setColor(0x00FF00)
      .addFields(
        { name: 'Member',     value: `<@${newMember.id}>` },
        { name: 'Role Added', value: addedRoles.map(r => `<@&${r.id}>`).join(', ') },
        { name: 'Changed By', value: changedBy },
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }

  if (removedRoles.size > 0) {
    const embed = new EmbedBuilder()
      .setTitle('➖ Role Removed')
      .setColor(0xFF0000)
      .addFields(
        { name: 'Member',       value: `<@${newMember.id}>` },
        { name: 'Role Removed', value: removedRoles.map(r => `<@&${r.id}>`).join(', ') },
        { name: 'Changed By',   value: changedBy },
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }
}

module.exports = { handleRoleLog };