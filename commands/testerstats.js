const { SlashCommandBuilder } = require('discord.js');
const database = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testerstats')
        .setDescription('View tester statistics')
        .addUserOption(option =>
            option.setName('tester')
                .setDescription('The tester to view stats for (leave empty for your own stats)')
                .setRequired(false))
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    async execute(interaction) {
        // Check if user has the required role
        if (!interaction.member.roles.cache.has(TESTER_ROLE_ID)) {
            return await interaction.reply({ 
                content: 'You need the required role to use this command.', 
                flags: 64
            });
        }
        
        // Get the tester to view stats for
        const tester = interaction.options.getUser('tester') || interaction.user;
        
        // Check if user has the "tester" role or is viewing their own stats
        const isOwnStats = tester.id === interaction.user.id;
        let hasTesterRole = false;
        
        if (!isOwnStats) {
            // Check if the user has tester role to view others' stats
            const { TESTER_ROLE_ID } = require('../config.json');
            if (TESTER_ROLE_ID && TESTER_ROLE_ID !== "") {
                hasTesterRole = interaction.member.roles.cache.has(TESTER_ROLE_ID);
            } else {
                const testerRole = interaction.guild.roles.cache.find(role => role.name === 'tester');
                if (testerRole) {
                    hasTesterRole = interaction.member.roles.cache.has(testerRole.id);
                }
            }
            
            if (!hasTesterRole) {
                return await interaction.reply({ 
                    content: 'You need the "tester" role to view other testers\' stats.', 
                    flags: 64
                });
            }
        }

        // Get tester stats from database
        if (!database.isConnected) {
            return await interaction.reply({ 
                content: 'Database is not connected.', 
                flags: 64
            });
        }

        const stats = await database.getTesterStats(tester.id);
        
        if (!stats) {
            return await interaction.reply({ 
                content: `${isOwnStats ? 'You have' : `${tester.username} has`} not conducted any tests yet.`, 
                flags: 64
            });
        }

        // Format the stats message
        let statsMessage = `**${tester.username}'s Testing Statistics**\n\n`;
        statsMessage += `Tests Conducted: ${stats.testsConducted || 0}\n`;
        statsMessage += `Last Test: ${stats.lastTestTime ? `<t:${Math.floor(new Date(stats.lastTestTime).getTime() / 1000)}:R>` : 'Never'}\n`;
        
        await interaction.reply({ 
            content: statsMessage, 
            flags: 64
        });
    },
};