const tierLists = require('../tierlists.js');

module.exports = {
    name: 'tierlist',
    description: 'Display a tier list. Usage: !tierlist <listname>',
    execute(message, args) {
        // Check if a tier list name was provided
        if (args.length === 0) {
            return message.reply('Please provide a tier list name. Usage: !tierlist <listname>');
        }
        
        const listName = args[0].toLowerCase();
        
        // Check if the tier list exists
        if (!tierLists[listName]) {
            return message.reply(`Tier list "${listName}" not found.`);
        }
        
        // Build the tier list display
        const tierList = tierLists[listName];
        let response = `**${listName.toUpperCase()} Tier List**\n\n`;
        
        // Display tiers in order
        const tiers = ['S', 'A', 'B', 'C', 'D'];
        for (const tier of tiers) {
            if (tierList[tier] && tierList[tier].length > 0) {
                response += `**${tier} Tier:** ${tierList[tier].join(', ')}\n`;
            }
        }
        
        message.channel.send(response);
    },
};