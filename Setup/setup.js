const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle, MessageFlags  } = require('discord.js');
const fs = require('fs');

function loadSettings() {
  if (!fs.existsSync('./settings.json')) return {};
  return JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
}

function saveSettings(settings) {
  fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 2));
}

async function handleSetup(message) {
  if (message.author.id !== message.guild.ownerId) {
    return message.reply('❌ Only the server owner can run this command.');
  }

  const textChannels = message.guild.channels.cache
    .filter(c => c.isTextBased())
    .map(c => ({ label: `# ${c.name}`, value: c.id }))
    .slice(0, 25);
  const reactionRoleRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('setup_reaction_role')
    .setLabel('Set Reaction Roles')
    .setStyle(ButtonStyle.Secondary)
);

  const logRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_log_channel')
      .setPlaceholder('📋 Pick your log channel...')
      .addOptions(textChannels)
  );
  const greetingRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_greeting_message')
      .setLabel('Set Greeting Message')
      .setStyle(ButtonStyle.Primary)
  );

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Server Setup')
    .setDescription(
      '**Step 1 —** Pick your log channel\n' +
      '**Step 2 —** Click the button to set your greeting message\n\n' +
      'Use `{user}` in your greeting to mention the new member!'
    )
    .setColor(0x5865F2);
  await message.reply({ embeds: [embed], components: [logRow, greetingRow, reactionRoleRow] });
}


async function handleSetupInteraction(interaction) {
  // ─── Log channel dropdown ────────────────────────────────────────────────
  // ─── Reaction role channel picked → show role dropdown ──────────────────
if (interaction.isStringSelectMenu() && interaction.customId === 'setup_reaction_role_channel') {
  const selectedChannelId = interaction.values[0];

  // save channel temporarily
  const settings = loadSettings();
  settings[interaction.guild.id] = {
    ...settings[interaction.guild.id],
    pendingReactionRoleChannel: selectedChannelId,
  };
  saveSettings(settings);

  // build role dropdown from all server roles
  const roles = interaction.guild.roles.cache
    .filter(r => !r.managed && r.name !== '@everyone') // filter out bot roles and @everyone
    .map(r => ({ label: r.name, value: r.id }))
    .slice(0, 25);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_reaction_role_pick_role')
      .setPlaceholder('Pick a role to assign...')
      .addOptions(roles)
  );

  return interaction.reply({
    content: 'Now pick the role to give when someone reacts:',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ─── Role picked → open modal for emoji + message ───────────────────────
if (interaction.isStringSelectMenu() && interaction.customId === 'setup_reaction_role_pick_role') {
  const selectedRoleId = interaction.values[0];

  // save role ID temporarily
  const settings = loadSettings();
  settings[interaction.guild.id] = {
    ...settings[interaction.guild.id],
    pendingReactionRoleId: selectedRoleId,
  };
  saveSettings(settings);

  // now open the modal — only asks for emoji + message now
  const modal = new ModalBuilder()
    .setCustomId('setup_reaction_role_modal')
    .setTitle('Set Reaction Role');

  const emojiInput = new TextInputBuilder()
    .setCustomId('rr_emoji')
    .setLabel('Emoji (e.g. ⭐)')
    .setPlaceholder('Paste an emoji here')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const messageInput = new TextInputBuilder()
    .setCustomId('rr_message')
    .setLabel('Message to show in the embed')
    .setPlaceholder('e.g. React with ⭐ to get the Star role!')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  // only two inputs now — no role ID field anymore
  modal.addComponents(
    new ActionRowBuilder().addComponents(emojiInput),
    new ActionRowBuilder().addComponents(messageInput),
  );

  return interaction.showModal(modal);
}

// ─── Modal submitted ─────────────────────────────────────────────────────
if (interaction.isModalSubmit() && interaction.customId === 'setup_reaction_role_modal') {
  const emoji     = interaction.fields.getTextInputValue('rr_emoji');
  const rrMessage = interaction.fields.getTextInputValue('rr_message');

  const settings  = loadSettings();
  const channelId = settings[interaction.guild.id]?.pendingReactionRoleChannel;
  const roleId    = settings[interaction.guild.id]?.pendingReactionRoleId; // 👈 grab saved role

  if (!channelId || !roleId) {
    return interaction.reply({ content: '❌ Something went wrong, try again.', flags: MessageFlags.Ephemeral });
  }

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({ content: '❌ Channel not found.', flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle('🎭 Reaction Roles')
    .setDescription(rrMessage)
    .setColor(0x5865F2)
    .setFooter({ text: `React with ${emoji} to get your role!` });

  const sentMessage = await channel.send({ embeds: [embed] });
  await sentMessage.react(emoji);

  if (!settings[interaction.guild.id].reactionRoles) {
    settings[interaction.guild.id].reactionRoles = [];
  }

  settings[interaction.guild.id].reactionRoles.push({
    messageId: sentMessage.id,
    emoji: emoji,
    roleId: roleId, // 👈 comes from dropdown now not modal
  });

  // clean up both temp values
  delete settings[interaction.guild.id].pendingReactionRoleChannel;
  delete settings[interaction.guild.id].pendingReactionRoleId;
  saveSettings(settings);

  return interaction.reply({
    content: `✅ Reaction role set up in <#${channelId}>!`,
    flags: MessageFlags.Ephemeral,
  });

}

  // ─── Reaction role button → pick channel ────────────────────────────────
if (interaction.isButton() && interaction.customId === 'setup_reaction_role') {
  const textChannels = interaction.guild.channels.cache
    .filter(c => c.isTextBased())
    .map(c => ({ label: `# ${c.name}`, value: c.id }))
    .slice(0, 25);

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_reaction_role_channel')
      .setPlaceholder('Pick channel for reaction role message...')
      .addOptions(textChannels)
  );

  return interaction.reply({
    content: 'Pick the channel to send the reaction role message in:',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

// ─── Reaction role channel picked → open modal ──────────────────────────
if (interaction.isStringSelectMenu() && interaction.customId === 'setup_reaction_role_channel') {
  const selectedChannelId = interaction.values[0];

  const settings = loadSettings();
  settings[interaction.guild.id] = {
    ...settings[interaction.guild.id],
    pendingReactionRoleChannel: selectedChannelId,
  };
  saveSettings(settings);

  const modal = new ModalBuilder()
    .setCustomId('setup_reaction_role_modal')
    .setTitle('Set Reaction Role');

  const emojiInput = new TextInputBuilder()
    .setCustomId('rr_emoji')
    .setLabel('Emoji (e.g. ⭐)')
    .setPlaceholder('Paste an emoji here')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const roleInput = new TextInputBuilder()
    .setCustomId('rr_role_id')
    .setLabel('Role ID')
    .setPlaceholder('Right click role → Copy Role ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const messageInput = new TextInputBuilder()
    .setCustomId('rr_message')
    .setLabel('Message to show in the embed')
    .setPlaceholder('e.g. React with ⭐ to get the Star role!')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(emojiInput),
    new ActionRowBuilder().addComponents(roleInput),
    new ActionRowBuilder().addComponents(messageInput),
  );

  return interaction.showModal(modal);
}

// ─── Reaction role modal submitted ──────────────────────────────────────
if (interaction.isModalSubmit() && interaction.customId === 'setup_reaction_role_modal') {
  const emoji   = interaction.fields.getTextInputValue('rr_emoji');
  const roleId  = interaction.fields.getTextInputValue('rr_role_id');
  const rrMessage = interaction.fields.getTextInputValue('rr_message');

  const settings = loadSettings();
  const channelId = settings[interaction.guild.id]?.pendingReactionRoleChannel;
  if (!channelId) return interaction.reply({ content: '❌ Something went wrong, try again.', flags: MessageFlags.Ephemeral });

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) return interaction.reply({ content: '❌ Channel not found.', flags: MessageFlags.Ephemeral });

  // send the reaction role embed
  const embed = new EmbedBuilder()
    .setTitle('🎭 Reaction Roles')
    .setDescription(rrMessage)
    .setColor(0x5865F2)
    .setFooter({ text: `React with ${emoji} to get your role!` });

  const sentMessage = await channel.send({ embeds: [embed] });

  // react with the emoji automatically so users can click it
  await sentMessage.react(emoji);

  // save to settings.json
  if (!settings[interaction.guild.id].reactionRoles) {
    settings[interaction.guild.id].reactionRoles = [];
  }

  settings[interaction.guild.id].reactionRoles.push({
    messageId: sentMessage.id,
    emoji: emoji,
    roleId: roleId,
  });

  // clean up the temp channel id
  delete settings[interaction.guild.id].pendingReactionRoleChannel;
  saveSettings(settings);

  return interaction.reply({
    content: `✅ Reaction role set up in <#${channelId}>!`,
    flags: MessageFlags.Ephemeral,
  });
}
  // ─── Welcome channel dropdown ────────────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'setup_welcome_channel') {
    const selectedChannelId = interaction.values[0];

    const settings = loadSettings();
    settings[interaction.guild.id] = {
      ...settings[interaction.guild.id],
      welcomeChannel: selectedChannelId,
    };
    saveSettings(settings);

    return interaction.reply({
      content: `✅ Welcome channel set to <#${selectedChannelId}>!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // ─── Greeting button → open modal ───────────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'setup_greeting_message') {
    const modal = new ModalBuilder()
      .setCustomId('setup_greeting_modal')
      .setTitle('Set Greeting Reply');

    const input = new TextInputBuilder()
      .setCustomId('greeting_input')
      .setLabel('What should the bot reply when someone says hi?')
      .setPlaceholder('e.g. Welcome! Hope you enjoy your stay 🎉')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ─── Greeting modal submitted ────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId === 'setup_greeting_modal') {
    const greetingMessage = interaction.fields.getTextInputValue('greeting_input');

    const settings = loadSettings();
    settings[interaction.guild.id] = {
      ...settings[interaction.guild.id],
      greetingMessage: greetingMessage,
    };
    saveSettings(settings);

    return interaction.reply({
      content: `✅ Greeting message saved!`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
console.log('[Setup Module] Loaded...');
module.exports = { handleSetup, handleSetupInteraction };