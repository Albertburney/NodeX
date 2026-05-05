const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const path = require('path');

// Import bot settings system
const { getServerSettings, updateServerSettings } = require('../Utils/settings');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Discord OAuth2 Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DASHBOARD_CLIENT_ID,
  clientSecret: process.env.DASHBOARD_CLIENT_SECRET,
  callbackURL: process.env.DASHBOARD_CALLBACK_URL || `http://localhost:${PORT}/auth/discord/callback`,
  scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Routes
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.render('index', {
      title: 'Relay Bot Dashboard',
      user: req.user
    });
  }
});

// Authentication routes
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login - Relay Bot Dashboard'
  });
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    res.redirect('/');
  });
});

// Dashboard routes
app.get('/dashboard', isAuthenticated, (req, res) => {
  // Filter guilds where user has manage server permission AND bot is in the server
  const manageableGuilds = req.user.guilds.filter(guild =>
    (guild.permissions & 0x20) === 0x20 && // MANAGE_GUILD permission
    discordClient && discordClient.guilds.cache.has(guild.id) // Bot is in the server
  );

  res.render('dashboard', {
    title: 'Dashboard - Relay Bot',
    user: req.user,
    guilds: manageableGuilds
  });
});

app.get('/dashboard/:guildId', isAuthenticated, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);

  // Check if user has permission for this guild
  if (!userGuild || (userGuild.permissions & 0x20) !== 0x20) {
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to manage this server.'
    });
  }

  // Get bot settings for this guild
  const settings = getServerSettings(guildId);

  res.render('guild-settings', {
    title: `${userGuild.name} - Settings`,
    user: req.user,
    guild: userGuild,
    settings: settings
  });
});

// API routes for settings management
app.post('/api/settings/:guildId', isAuthenticated, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);

  // Check permissions
  if (!userGuild || (userGuild.permissions & 0x20) !== 0x20) {
    return res.status(403).json({ error: 'No permission' });
  }

  const { setting, value, settings } = req.body;

  try {
    if (settings) {
      // Bulk update all settings
      updateServerSettings(guildId, settings);
    } else {
      // Update specific setting
      if (setting === 'automod.enabled') {
        updateServerSettings(guildId, { automod: { ...getServerSettings(guildId).automod, enabled: value } });
      } else if (setting === 'greetingMessage') {
        updateServerSettings(guildId, { greetingMessage: value });
      } else if (setting === 'welcomeMessage') {
        updateServerSettings(guildId, { welcomeMessage: value });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// API route to get guild channels
app.get('/api/guilds/:guildId/channels', isAuthenticated, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);

  // Check permissions
  if (!userGuild || (userGuild.permissions & 0x20) !== 0x20) {
    return res.status(403).json({ error: 'No permission' });
  }

  // Check if bot is in the guild
  if (!discordClient || !discordClient.guilds.cache.has(guildId)) {
    return res.status(404).json({ error: 'Bot is not in this server' });
  }

  try {
    const guild = discordClient.guilds.cache.get(guildId);
    const channels = guild.channels.cache
      .filter(channel => channel.type === 0) // TEXT CHANNELS only
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    res.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Store client reference
let discordClient = null;

// Start server function (to be called from main bot)
function startDashboard(client) {
  if (!process.env.DASHBOARD_CLIENT_ID || !process.env.DASHBOARD_CLIENT_SECRET) {
    console.log('⚠️  Dashboard credentials not found. Set DASHBOARD_CLIENT_ID and DASHBOARD_CLIENT_SECRET in .env');
    return;
  }

  discordClient = client;

  app.listen(PORT, () => {
    console.log(`🌐 Dashboard running at http://localhost:${PORT}`);
  });
}

module.exports = { startDashboard };

console.log('[Dashboard] Module loaded...');