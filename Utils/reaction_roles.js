const fs = require('fs');

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

function saveSettings(settings) {
  fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 2));
}

// when user adds a reaction
async function handleReactionAdd(reaction, user) {
  if (user.bot) return;

  // fetch the reaction if it's partial
  if (reaction.partial) {
    try { await reaction.fetch(); }
    catch { return; }
  }

  const settings = loadSettings();
  const serverSettings = settings[reaction.message.guild.id];
  if (!serverSettings?.reactionRoles) return;

  // find a matching reaction role for this message + emoji
  const match = serverSettings.reactionRoles.find(
    rr => rr.messageId === reaction.message.id &&
          rr.emoji === reaction.emoji.name
  );
  if (!match) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id);
  const role = guild.roles.cache.get(match.roleId);
  if (!role) return;

  await member.roles.add(role);
}

// when user removes a reaction
async function handleReactionRemove(reaction, user) {
  if (user.bot) return;

  if (reaction.partial) {
    try { await reaction.fetch(); }
    catch { return; }
  }

  const settings = loadSettings();
  const serverSettings = settings[reaction.message.guild.id];
  if (!serverSettings?.reactionRoles) return;

  const match = serverSettings.reactionRoles.find(
    rr => rr.messageId === reaction.message.id &&
          rr.emoji === reaction.emoji.name
  );
  if (!match) return;

  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id);
  const role = guild.roles.cache.get(match.roleId);
  if (!role) return;

  await member.roles.remove(role);
}
console.log('[Reaction Roles Module] Loaded...');

module.exports = { handleReactionAdd, handleReactionRemove };