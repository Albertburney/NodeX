const { getServerSettings } = require('../Utils/settings');

async function handleWelcomeMessage(member) {
  try {
    const serverSettings = getServerSettings(member.guild.id);

    // Check if welcome channel and message are configured
    if (!serverSettings?.welcomeChannel || !serverSettings?.welcomeMessage) return;

    const welcomeChannel = member.guild.channels.cache.get(serverSettings.welcomeChannel);
    if (!welcomeChannel) return;

    // Replace {user} placeholder with user mention
    let welcomeMessage = serverSettings.welcomeMessage;
    welcomeMessage = welcomeMessage.replace(/{user}/g, `<@${member.id}>`);
    welcomeMessage = welcomeMessage.replace(/{username}/g, member.user.username);
    welcomeMessage = welcomeMessage.replace(/{server}/g, member.guild.name);
    welcomeMessage = welcomeMessage.replace(/{membercount}/g, member.guild.memberCount);

    await welcomeChannel.send(welcomeMessage);
  } catch (error) {
    console.error('Error in handleWelcomeMessage:', error);
  }
}

console.log('[Welcome Message Module] Loaded...');
module.exports = { handleWelcomeMessage };