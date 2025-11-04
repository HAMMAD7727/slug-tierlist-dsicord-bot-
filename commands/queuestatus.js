const { SlashCommandBuilder } = require('discord.js');
const { TESTER_ROLE_ID } = require('../config.json');
const queues = require('../queues.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queuestatus')
        .setDescription('Show the status of all queues')
        .setDefaultMemberPermissions(0), // Only members with roles can use this command
    async execute(interaction) {
        // Check if user has the required role
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return await interaction.reply({ 
                content: 'You need the required role to use this command.', 
                flags: 64
            });
        }
        
        let statusMessage = '**Queue Status**\n\n';
        
        for (const [gamemode, queue] of Object.entries(queues)) {
            const status = queue.isOpen ? '🟢 OPEN' : '🔴 CLOSED';
            const playerCount = queue.players ? queue.players.length : 0;
            
            if (queue.isOpen) {
                statusMessage += `**${gamemode.toUpperCase()}**: ${status} (${playerCount} players)\n`;
            } else {
                statusMessage += `**${gamemode.toUpperCase()}**: ${status}\n`;
            }
        }
        
        await interaction.reply({ 
            content: statusMessage, 
            flags: 64
        });
    },
};