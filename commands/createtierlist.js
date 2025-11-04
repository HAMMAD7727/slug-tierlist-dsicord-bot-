const tierLists = require('../tierlists.js');

module.exports = {
    name: 'createtierlist',
    description: 'Create a new tier list. Usage: !createtierlist <listname>',
    execute(message, args) {
        // Check if a tier list name was provided
        if (args.length === 0) {
            return message.reply('Please provide a tier list name. Usage: !createtierlist <listname>');
        }
        
        const listName = args[0].toLowerCase();
        
        // Check if the tier list already exists
        if (tierLists[listName]) {
            return message.reply(`Tier list "${listName}" already exists.`);
        }
        
        // Create new tier list
        tierLists[listName] = {
            S: [],
            A: [],
            B: [],
            C: [],
            D: []
        };
        
        message.reply(`Created new tier list "${listName}".`);
    },
};