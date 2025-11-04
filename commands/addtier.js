const tierLists = require('../tierlists.js');
const fs = require('fs');

module.exports = {
    name: 'addtier',
    description: 'Add an item to a tier list. Usage: !addtier <listname> <tier> <item>',
    execute(message, args) {
        // Check if enough arguments were provided
        if (args.length < 3) {
            return message.reply('Please provide a tier list name, tier, and item. Usage: !addtier <listname> <tier> <item>');
        }
        
        const listName = args[0].toLowerCase();
        const tier = args[1].toUpperCase();
        const item = args.slice(2).join(' ');
        
        // Validate tier
        const validTiers = ['S', 'A', 'B', 'C', 'D'];
        if (!validTiers.includes(tier)) {
            return message.reply('Invalid tier. Please use S, A, B, C, or D.');
        }
        
        // Initialize tier list if it doesn't exist
        if (!tierLists[listName]) {
            tierLists[listName] = {
                S: [],
                A: [],
                B: [],
                C: [],
                D: []
            };
        }
        
        // Add item to tier
        tierLists[listName][tier].push(item);
        
        // In a real implementation, you would save to a file or database here
        // For now, we'll just confirm the addition
        message.reply(`Added "${item}" to ${tier} tier in "${listName}" tier list.`);
    },
};