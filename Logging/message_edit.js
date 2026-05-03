const {EmbedBuilder} = require('discord.js'); 
const fs = require('fs');// This is main module.

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

async function handleMessageEdit(oldMessage, newMessage) {
   if (!newMessage.content) return;
   if (newMessage.author.bot) return;
   if (oldMessage.content === newMessage.content) return; // ignore embed-only updates
 
   const settings = loadSettings();                          // 👈 call it
  const serverSettings = settings[newMessage.guild.id];    // 👈 define it
  if (!serverSettings?.logChannel) return;          

   const logChannel = newMessage.client.channels.cache.get(serverSettings.logChannel);
   if (!logChannel) return;
 
   const embed = new EmbedBuilder()
     .setTitle('Message Edited')
     .setColor(0xFFA500)
     .addFields(
       { name: 'Before', value: oldMessage.content || '*Unknown (not cached)*' },
       { name: 'After',  value: newMessage.content },
     )
     .setAuthor({
       name: newMessage.author.username,
       iconURL: newMessage.author.displayAvatarURL(),
     })
     .setFooter({ text: `#${newMessage.channel.name}` })
     .setTimestamp();
 
   logChannel.send({ embeds: [embed] });
 };
console.log('[Message Edit Logger] Loaded...');
 module.exports = { handleMessageEdit };