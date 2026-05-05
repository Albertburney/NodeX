const { EmbedBuilder } = require('discord.js');
const { getServerSettings } = require('./settings');

async function handleHelp(message) {
  try {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Relay Bot Commands')
      .setDescription('Here are all available commands:')
      .setColor(0x5865F2)
      .addFields(
        { name: '🔧 Setup', value: '`!setup` - Configure bot settings (server owner only)', inline: false },
        { name: '👋 Greetings', value: 'Say messages containing `hi`, `how are you`, `what\'s up`, etc. to get a custom response (30min cooldown per user)', inline: false },
        { name: '🎉 Welcome Messages', value: 'New members receive custom welcome messages in the designated channel', inline: false },
        { name: '🛡️ Moderation', value:
          '`!kick @user [reason]` - Kick a member\n' +
          '`!ban @user [reason]` - Ban a member\n' +
          '`!mute @user <duration> [reason]` - Timeout a member (e.g., 10m, 1h, 1d)\n' +
          '`!warn @user [reason]` - Warn a member\n' +
          '`!clear <amount>` - Delete messages (max 100)', inline: false },
        { name: '🎭 Reaction Roles', value: 'React to configured messages to get roles', inline: false },
        { name: '📋 Info', value: '`!help` - Show this help message', inline: false }
      )
      .setFooter({ text: 'Bot developed by Ray' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in handleHelp:', error);
  }
}

console.log('[Help Module] Loaded...');
module.exports = { handleHelp };