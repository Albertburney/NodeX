require('dotenv').config(); // Yeah i didnt know that it load  the token.

const { Client, Events, GatewayIntentBits, ActivityType } = require('discord.js'); // This is main module.
 const { handleSetup, handleSetupInteraction } = require('./Setup/setup'); 
 const { handleMessageEdit } = require('./Logging/message_edit');
 const { handleGreeting } = require('./Setup/greeting');
 const { handleReactionAdd, handleReactionRemove } = require('./Utils/reaction_roles');
const { handleMessageDelete } = require('./Logging/message_delete');
const { handleMemberJoin } = require('./Logging/member_join');
const { handleMemberLeave } = require('./Logging/member_leave');
const { handleMemberBan, handleMemberUnban } = require('./Logging/member_ban');
const { handleVoiceLog } = require('./Logging/voice_log');
const { cacheInvites, handleInviteJoin } = require('./Logging/invite_tracker');
const { handleRoleLog } = require('./Logging/role_log');

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildModeration,
] });
// Note GatewayIntentBits.MessageContent = This is used by the bot to send messages in the server. 
// Note GatewayIntentBits.GuildMessages = This is used by the bot to read messages in the server.
// Note GatewayIntentBits.Guilds = This is used by the bot to read the server information.
client.once(Events.ClientReady, (readyClient) => {
     client.user.setStatus('dnd'); // This sets the bot's status. If you want just change it, just change 'dnd' to 'online', 'idle', or 'invisible'.
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async(message) => {
  if (message.author.bot) return;   // ignore bots
  if (message.content === '!hello') {message.reply('Hello');}
  if (message.content === '!setup') {await handleSetup(message); }
  await handleGreeting(message);
});

client.on(Events.InteractionCreate, async (interaction) => {
  await handleSetupInteraction(interaction);
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {await handleMessageEdit(oldMessage, newMessage);});

client.on(Events.MessageDelete, async (message) => {await handleMessageDelete(message);});

client.on(Events.GuildMemberAdd, async (member) => {
  await cacheInvites(member.guild); // refresh cache first
  await handleInviteJoin(member);
  await handleMemberJoin(member);
});

client.on(Events.GuildMemberRemove, async (member) => {
  await handleMemberLeave(member);
});

client.on(Events.GuildBanAdd, async (ban) => {
  await handleMemberBan(ban.guild, ban.user);
});

client.on(Events.GuildBanRemove, async (ban) => {
  await handleMemberUnban(ban.guild, ban.user);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  await handleVoiceLog(oldState, newState);
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  await handleRoleLog(oldMember, newMember);
});

client.on(Events.InteractionCreate, async (interaction) => {
  await handleSetupInteraction(interaction);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  await handleReactionAdd(reaction, user);
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  await handleReactionRemove(reaction, user);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  await handleReactionAdd(reaction, user);
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  await handleReactionRemove(reaction, user);
});

client.login(process.env.TOKEN);
