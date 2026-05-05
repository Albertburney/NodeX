# Relay Bot Dashboard

A web dashboard for managing your Discord bot settings remotely.

## Features

- **Server Management**: View and manage all servers where you have admin permissions
- **AutoMod Control**: Enable/disable and configure AutoMod settings per server
- **Message Settings**: Configure greeting and welcome messages
- **Channel Management**: Set log and welcome channels
- **Real-time Updates**: Changes are applied immediately to the bot

## Setup Instructions

### 1. Discord Application Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application (or create a new one)
3. Copy the **Application ID** - this is your `DASHBOARD_CLIENT_ID`
4. Go to the **OAuth2** section
5. Copy the **Client Secret** - this is your `DASHBOARD_CLIENT_SECRET`
6. In **OAuth2 Redirects**, add: `http://localhost:3000/auth/discord/callback`

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Bot Configuration
TOKEN=your_discord_bot_token_here

# Dashboard Configuration
DASHBOARD_CLIENT_ID=your_application_id_here
DASHBOARD_CLIENT_SECRET=your_client_secret_here
DASHBOARD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
DASHBOARD_PORT=3000
SESSION_SECRET=generate_a_random_string_here
```

### 3. Permissions Required

For users to access the dashboard, they need **Manage Server** permission in the servers they want to manage.

### 4. Starting the Dashboard

The dashboard starts automatically when the bot starts. Access it at:
- **Local**: http://localhost:3000
- **Production**: Configure `DASHBOARD_CALLBACK_URL` for your domain

## Dashboard Pages

- **/** - Landing page with login
- **/dashboard** - Server selection and overview
- **/dashboard/:guildId** - Individual server settings management

## Security Notes

- Uses Discord OAuth2 for authentication
- Only shows servers where user has Manage Server permission
- All settings changes are validated
- Session-based authentication with secure cookies

## API Endpoints

- `POST /api/settings/:guildId` - Update server settings
- `GET /api/guilds/:guildId/channels` - Get server channels (future feature)

## Troubleshooting

**Dashboard not starting?**
- Check that `DASHBOARD_CLIENT_ID` and `DASHBOARD_CLIENT_SECRET` are set
- Verify the OAuth2 redirect URI matches

**Can't access server settings?**
- Make sure you have Manage Server permission in that server
- Try logging out and back in

**Changes not applying?**
- Check the bot console for error messages
- Ensure the bot has necessary permissions in the server