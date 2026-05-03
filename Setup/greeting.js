const fs = require('fs');

// list of words that count as a greeting
const GREETINGS = ['hi', 'hey', 'hello', 'helo', 'hii', 'heey', 'howdy', 'sup', 'yo'];

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

async function handleGreeting(message) {
  const settings = loadSettings();
  const serverSettings = settings[message.guild.id];

  // no custom greeting message set, skip
  if (!serverSettings?.greetingMessage) return;

  // check if the message is just a greeting word
  const content = message.content.toLowerCase().trim();
  const isGreeting = GREETINGS.includes(content);
  if (!isGreeting) return;

  // reply with the owner's custom message
  message.reply(serverSettings.greetingMessage);
}
console.log('[Greeting Module] Loaded...');
module.exports = { handleGreeting };