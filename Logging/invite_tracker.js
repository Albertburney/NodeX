const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

const inviteCache = new Map(); // store invite uses per guild

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

// call this when bot starts and when someone joins
async function cacheInvites(guild) {
  const invites = await guild.invites.fetch();
  inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
}

async function handleInviteJoin(member) {
  const settings = loadSettings();
  const serverSettings = settings[member.guild.id];
  if (!serverSettings?.logChannel) return;

  const logChannel = member.client.channels.cache.get(serverSettings.logChannel);
  if (!logChannel) return;

  try {
    const newInvites = await member.guild.invites.fetch();
    const oldInvites = inviteCache.get(member.guild.id) || new Map();

    // find which invite was used by comparing old vs new use counts
    const usedInvite = newInvites.find(i => {
      const oldUses = oldInvites.get(i.code) || 0;
      return i.uses > oldUses;
    });

    // update the cache
    inviteCache.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses])));

    const embed = new EmbedBuilder()
      .setTitle('📨 Invite Used')
      .setColor(0x5865F2)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'Member',      value: `<@${member.id}> (${member.user.username})` },
        { name: 'Invited By',  value: usedInvite ? `<@${usedInvite.inviter.id}>` : 'Unknown' },
        { name: 'Invite Code', value: usedInvite ? usedInvite.code : 'Unknown' },
        { name: 'Total Uses',  value: usedInvite ? `${usedInvite.uses}` : 'Unknown' },
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Invite tracking error:', err);
  }
}

module.exports = { cacheInvites, handleInviteJoin };