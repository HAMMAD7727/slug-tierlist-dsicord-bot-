# STUN Tier List Discord Bot

A Discord bot for creating and managing tier lists and testing queues.

## Commands

### Tier List Commands
- `!ping` - Check if the bot is responsive
- `!help` - Display all available commands
- `!tierlist <listname>` - Display a tier list
- `!createtierlist <listname>` - Create a new tier list
- `!addtier <listname> <tier> <item>` - Add an item to a tier list

### Queue Commands
- `/startqueue` - Start a testing queue (Tester role required)
- `/closequeue` - Close a testing queue (Tester role required)
- `/queuestatus` - Show the status of all queues

## Example Usage

### Tier Lists
1. `!tierlist example` - Display the example tier list
2. `!createtierlist games` - Create a new tier list named "games"
3. `!addtier games S "The Legend of Zelda: Breath of the Wild"` - Add a game to the S tier of the games list

### Queues
1. `/startqueue` - Opens the game mode selection menu
2. `/closequeue gamemode: sword reason: "Testing completed"` - Closes the sword queue with a reason
3. `/queuestatus` - Shows the status of all queues

## Setup

1. Clone this repository
2. Run `npm install` to install dependencies
3. Copy [config.example.json](file:///C:/Users/Mhk/Documents/slug%20tierlist%20discord%20bot/config.example.json) to [config.json](file:///C:/Users/Mhk/Documents/slug%20tierlist%20discord%20bot/config.json) and update with your bot token and client ID
4. Create channels for each game mode (e.g., #sword-waitlist, #crystal-waitlist, etc.)
5. Create a "tester" role in your Discord server
6. Run `node deploy-commands.js` to register slash commands
7. Run `npm start` to start the bot