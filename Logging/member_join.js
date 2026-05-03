const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

async function handleMemberJoin(member) {
  const settings = loadSettings();
  const serverSettings = settings[member.guild.id];
  if (!serverSettings?.logChannel) return;

  const logChannel = member.client.channels.cache.get(serverSettings.logChannel);
  if (!logChannel) return;

  // calculate account age
  const accountAge = Math.floor((Date.now() - member.user.createdAt) / (1000 * 60 * 60 * 24));
  const isNewAccount = accountAge < 7;

  const embed = new EmbedBuilder()
    .setTitle('📥 Member Joined')
    .setColor(isNewAccount ? 0xFF0000 : 0x00FF00) // red if new account, green if not
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'Member',      value: `<@${member.id}> (${member.user.username})` },
      { name: 'Account Age', value: `${accountAge} days ${isNewAccount ? '⚠️ New Account!' : ''}` },
      { name: 'Created At',  value: `<t:${Math.floor(member.user.createdAt / 1000)}:F>` },
      { name: 'Member Count',value: `${member.guild.memberCount}` },
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });
}

module.exports = { handleMemberJoin };