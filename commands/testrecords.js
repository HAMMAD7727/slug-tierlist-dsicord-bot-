const { SlashCommandBuilder } = require('discord.js');
const database = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testrecords')
        .setDescription('View test records')
        .addStringOption(option =>
            option.setName('gamemode')
                .setDescription('Filter by game mode')
                .setRequired(false)
                .addChoices(
                    { name: 'NPOT', value: 'npot' },
                    { name: 'Sword', value: 'sword' },
                    { name: 'Crystal', value: 'crystal' },
                    { name: 'Axe', value: 'axe' },
                    { name: 'Mace', value: 'mace' },
                    { name: 'SMP', value: 'smp' },
                    { name: 'DPOT', value: 'dpot' },
                    { name: 'UHC', value: 'uhc' }
                ))
        .addUserOption(option =>
            option.setName('tester')
                .setDescription('Filter by tester')
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
        
        if (!database.isConnected) {
            return await interaction.reply({ 
                content: 'Database is not connected.', 
                flags: 64
            });
        }

        // Build filter
        const filter = {};
        const gamemode = interaction.options.getString('gamemode');
        const tester = interaction.options.getUser('tester');
        
        if (gamemode) {
            filter.gamemode = gamemode;
        }
        
        if (tester) {
            filter.testerId = tester.id;
        }

        // Get test records from database
        const records = await database.getTestRecords(filter);
        
        if (records.length === 0) {
            return await interaction.reply({ 
                content: 'No test records found matching the criteria.', 
                flags: 64
            });
        }

        // Format the records message (limit to 10 most recent)
        let recordsMessage = `**Test Records**\n\n`;
        const displayRecords = records.slice(0, 10);
        
        for (const record of displayRecords) {
            recordsMessage += `**${record.gamemode.toUpperCase()}** - <@${record.testerId}> → <@${record.playerId}>\n`;
            recordsMessage += `Time: <t:${Math.floor(new Date(record.createdAt).getTime() / 1000)}:f>\n`;
            if (record.ticketChannelId) {
                recordsMessage += `Ticket: <#${record.ticketChannelId}>\n`;
            }
            recordsMessage += `\n`;
        }
        
        if (records.length > 10) {
            recordsMessage += `... and ${records.length - 10} more records.`;
        }

        await interaction.reply({ 
            content: recordsMessage, 
            flags: 64
        });
    },
};