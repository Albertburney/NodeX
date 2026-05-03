const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

async function handleMemberLeave(member) {
  const settings = loadSettings();
  const serverSettings = settings[member.guild.id];
  if (!serverSettings?.logChannel) return;

  const logChannel = member.client.channels.cache.get(serverSettings.logChannel);
  if (!logChannel) return;

  // how long they were in the server
  const joinedAt = member.joinedAt;
  const timeInServer = joinedAt
    ? Math.floor((Date.now() - joinedAt) / (1000 * 60 * 60 * 24))
    : null;

  // list their roles
  const roles = member.roles.cache
    .filter(r => r.name !== '@everyone')
    .map(r => `<@&${r.id}>`)
    .join(', ') || 'None';

  const embed = new EmbedBuilder()
    .setTitle('📤 Member Left')
    .setColor(0xFFA500)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'Member',          value: `<@${member.id}> (${member.user.username})` },
      { name: 'Time In Server',  value: timeInServer !== null ? `${timeInServer} days` : 'Unknown' },
      { name: 'Roles They Had',  value: roles },
      { name: 'Member Count',    value: `${member.guild.memberCount}` },
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
}

module.exports = { handleMemberLeave };