const { getServerSettings } = require('../Utils/settings');

// Keywords that trigger greetings when found anywhere in message
const GREETING_KEYWORDS = [
  'hi', 'hey', 'hello', 'helo', 'hii', 'heey', 'howdy', 'sup', 'yo',
  'hai', 'hiya', 'greetings', 'morning', 'afternoon', 'evening',
  'how are you', 'how you doing', 'how\'s it going', 'how is it going',
  'what\'s up', 'whats up', 'wassup', 'how are we', 'how do you do'
];

// Cooldown tracking: userId -> lastGreetingTimestamp
const userGreetingCooldowns = new Map();
const GREETING_COOLDOWN = 30 * 60 * 1000; // 30 minutes cooldown per user

// Cleanup old cooldowns every hour
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamp] of userGreetingCooldowns) {
    if (now - timestamp > GREETING_COOLDOWN) {
      userGreetingCooldowns.delete(userId);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

async function handleGreeting(message) {
  try {
    const serverSettings = getServerSettings(message.guild.id);

    // no custom greeting message set, skip
    if (!serverSettings?.greetingMessage) return;

    const content = message.content.toLowerCase().trim();
    const userId = message.author.id;
    const now = Date.now();

    // Check if user is on cooldown
    const lastGreeting = userGreetingCooldowns.get(userId);
    if (lastGreeting && (now - lastGreeting) < GREETING_COOLDOWN) {
      return; // User is still on cooldown
    }

    // Skip if message contains URLs or @ mentions (spam prevention)
    if (content.includes('http') || content.includes('<@')) return;

    // Check if message contains any greeting keywords
    const containsGreetingKeyword = GREETING_KEYWORDS.some(keyword =>
      content.includes(keyword.toLowerCase())
    );

    if (containsGreetingKeyword) {
      // Set cooldown for this user
      userGreetingCooldowns.set(userId, now);

      // Reply with the custom greeting message
      await message.reply(serverSettings.greetingMessage);
    }

  } catch (error) {
    console.error('Error in handleGreeting:', error);
  }
}
console.log('[Greeting Module] Loaded...');
module.exports = { handleGreeting };