const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle, MessageFlags  } = require('discord.js');
const { getServerSettings, updateServerSettings, saveSettings } = require('../Utils/settings');

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

  const welcomeChannelRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_welcome_channel')
      .setPlaceholder('🏠 Pick your welcome channel...')
      .addOptions(textChannels)
  );

  const messagesRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_greeting_message')
      .setLabel('Set Greeting')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('setup_welcome_message')
      .setLabel('Set Welcome')
      .setStyle(ButtonStyle.Success)
  );

  const automodRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_automod')
      .setLabel('Configure AutoMod')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('setup_reaction_role')
      .setLabel('Reaction Roles')
      .setStyle(ButtonStyle.Secondary)
  );

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Server Setup')
    .setDescription(
      '**Step 1 —** Pick your log channel\n' +
      '**Step 2 —** Pick your welcome channel\n' +
      '**Step 3 —** Set greeting & welcome messages\n' +
      '**Step 4 —** Configure AutoMod & reaction roles\n\n' +
      '**Placeholders:**\n' +
      '• `{user}` - Mention the new member\n' +
      "• `{username}` - Member's username\n" +
      '• `{server}` - Server name\n' +
      '• `{membercount}` - Server member count'
    )
    .setColor(0x5865F2);
  await message.reply({ embeds: [embed], components: [logRow, welcomeChannelRow, messagesRow, automodRow] });
}


async function handleSetupInteraction(interaction) {
  // ─── Log channel dropdown ────────────────────────────────────────────────
  // ─── Reaction role channel picked → show role dropdown ──────────────────
if (interaction.isStringSelectMenu() && interaction.customId === 'setup_reaction_role_channel') {
  const selectedChannelId = interaction.values[0];

  // save channel temporarily
  const { updateServerSettings } = require('../Utils/settings');
  updateServerSettings(interaction.guild.id, { pendingReactionRoleChannel: selectedChannelId });

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

// ─── AutoMod button → show automod menu ────────────────────────────────
if (interaction.isButton() && interaction.customId === 'setup_automod') {
  const automodRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_automod_menu')
      .setPlaceholder('Choose AutoMod setting...')
      .addOptions([
        { label: 'Enable/Disable AutoMod', value: 'automod_toggle' },
        { label: 'Configure Bad Words', value: 'automod_badwords' },
        { label: 'Set Spam Protection', value: 'automod_spam' },
        { label: 'Configure Caps Filter', value: 'automod_caps' },
        { label: 'Set Link/Invite Filters', value: 'automod_links' },
        { label: 'Configure Mention Limits', value: 'automod_mentions' },
        { label: 'Set Punishment Actions', value: 'automod_punishment' },
        { label: 'Manage Whitelist', value: 'automod_whitelist' }
      ])
  );

  return interaction.reply({
    content: 'Select an AutoMod setting to configure:',
    components: [automodRow],
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

  const { updateServerSettings } = require('../Utils/settings');
  updateServerSettings(interaction.guild.id, { pendingReactionRoleChannel: selectedChannelId });

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

  const { getServerSettings, updateServerSettings } = require('../Utils/settings');
  const serverSettings = getServerSettings(interaction.guild.id);
  const channelId = serverSettings?.pendingReactionRoleChannel;
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
  const currentSettings = getServerSettings(interaction.guild.id);
  const reactionRoles = currentSettings.reactionRoles || [];
  reactionRoles.push({
    messageId: sentMessage.id,
    emoji: emoji,
    roleId: roleId,
  });

  updateServerSettings(interaction.guild.id, {
    reactionRoles,
    pendingReactionRoleChannel: undefined
  });

  return interaction.reply({
    content: `✅ Reaction role set up in <#${channelId}>!`,
    flags: MessageFlags.Ephemeral,
  });
}
  // ─── Welcome channel dropdown ────────────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'setup_welcome_channel') {
    const selectedChannelId = interaction.values[0];

    const { updateServerSettings } = require('../Utils/settings');
    updateServerSettings(interaction.guild.id, { welcomeChannel: selectedChannelId });

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
      .setLabel('Greeting reply for "hi" commands')
      .setPlaceholder('e.g. Welcome! Hope you enjoy your stay 🎉')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ─── Welcome message button → open modal ────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'setup_welcome_message') {
    const modal = new ModalBuilder()
      .setCustomId('setup_welcome_modal')
      .setTitle('Set Welcome Message');

    const input = new TextInputBuilder()
      .setCustomId('welcome_input')
      .setLabel('Message to send when someone joins')
      .setPlaceholder('e.g. Welcome {user} to {server}! You are member #{membercount}.')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // ─── Greeting modal submitted ────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId === 'setup_greeting_modal') {
    const greetingMessage = interaction.fields.getTextInputValue('greeting_input');

    const { updateServerSettings } = require('../Utils/settings');
    updateServerSettings(interaction.guild.id, { greetingMessage });

    return interaction.reply({
      content: `✅ Greeting message saved!`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // ─── Welcome modal submitted ─────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId === 'setup_welcome_modal') {
    const welcomeMessage = interaction.fields.getTextInputValue('welcome_input');

    // Validate message length
    if (welcomeMessage.length > 2000) {
      return interaction.reply({
        content: '❌ Welcome message is too long (max 2000 characters).',
        flags: MessageFlags.Ephemeral,
      });
    }

    const { updateServerSettings } = require('../Utils/settings');
    updateServerSettings(interaction.guild.id, { welcomeMessage });

    return interaction.reply({
      content: `✅ Welcome message saved! New members will receive this message in the welcome channel.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // ─── AutoMod menu selection ──────────────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'setup_automod_menu') {
    const choice = interaction.values[0];
    const { getServerSettings } = require('../Utils/settings');
    const currentSettings = getServerSettings(interaction.guild.id);
    const automod = currentSettings.automod || {};

    switch (choice) {
      case 'automod_toggle':
        return interaction.reply({
          content: `AutoMod is currently **${automod.enabled ? 'ENABLED' : 'DISABLED'}**.\n\nTo toggle, use the buttons below:`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('automod_enable')
                .setLabel('Enable AutoMod')
                .setStyle(ButtonStyle.Success)
                .setDisabled(automod.enabled),
              new ButtonBuilder()
                .setCustomId('automod_disable')
                .setLabel('Disable AutoMod')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(!automod.enabled)
            )
          ],
          flags: MessageFlags.Ephemeral,
        });

      case 'automod_badwords':
        return interaction.reply({
          content: `Current bad words: ${automod.badWords?.length ? automod.badWords.join(', ') : 'None'}\n\nReply with a comma-separated list of bad words to set (or "clear" to remove all):`,
          flags: MessageFlags.Ephemeral,
        });

      case 'automod_spam':
        return interaction.reply({
          content: `Current spam limit: **${automod.spamLimit || 5}** messages per 5 seconds\n\nReply with a number (1-20) to set the spam limit:`,
          flags: MessageFlags.Ephemeral,
        });

      case 'automod_caps':
        return interaction.reply({
          content: `Current caps limit: **${automod.maxCaps || 70}%** uppercase\n\nReply with a percentage (0-100) to set the caps limit:`,
          flags: MessageFlags.Ephemeral,
        });

      case 'automod_links':
        return interaction.reply({
          content: `Links: **${automod.allowLinks ? 'ALLOWED' : 'BLOCKED'}**\nInvites: **${automod.allowInvites ? 'ALLOWED' : 'BLOCKED'}**\n\nReply with "links on/off" or "invites on/off":`,
          flags: MessageFlags.Ephemeral,
        });

      case 'automod_mentions':
        return interaction.reply({
          content: `Current mention limit: **${automod.maxMentions || 5}** mentions per message\n\nReply with a number (0-20) to set the mention limit:`,
          flags: MessageFlags.Ephemeral,
        });

      case 'automod_punishment':
        return interaction.reply({
          content: `Current punishment: **${automod.punishment?.warnLimit || 3}** warnings = **${automod.punishment?.action || 'timeout'}**\nTimeout duration: **${automod.timeoutDuration || 10}** minutes\n\nReply with "warns [number]" or "action [timeout/kick/ban]" or "duration [minutes]":`,
          flags: MessageFlags.Ephemeral,
        });

      case 'automod_whitelist':
        const whitelist = automod.whitelist || {};
        return interaction.reply({
          content: `**Whitelist Settings:**\nRoles: ${whitelist.roles?.length || 0}\nUsers: ${whitelist.users?.length || 0}\nChannels: ${whitelist.channels?.length || 0}\n\nReply with "add role @role", "add user @user", "add channel #channel", or "clear [type]":`,
          flags: MessageFlags.Ephemeral,
        });
    }
  }

  // ─── AutoMod toggle buttons ──────────────────────────────────────────────
  if (interaction.isButton() && (interaction.customId === 'automod_enable' || interaction.customId === 'automod_disable')) {
    const { updateServerSettings } = require('../Utils/settings');
    const enabled = interaction.customId === 'automod_enable';

    updateServerSettings(interaction.guild.id, {
      automod: {
        ...getServerSettings(interaction.guild.id).automod,
        enabled
      }
    });

    return interaction.reply({
      content: `✅ AutoMod ${enabled ? 'ENABLED' : 'DISABLED'}!`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
console.log('[Setup Module] Loaded...');
module.exports = { handleSetup, handleSetupInteraction };