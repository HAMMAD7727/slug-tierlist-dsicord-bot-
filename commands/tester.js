const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tester')
        .setDescription('Display a comprehensive guide for testers on how to use the bot'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('TLUG Discord Bot - Tester Guide')
            .setDescription('This guide explains all the commands available to testers.')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: 'Queue Management Commands',
                    value: 'Commands for managing testing queues:',
                    inline: false
                },
                {
                    name: '/startqueue <gamemode> <region>',
                    value: 'Start a new testing queue for a specific game mode and region.\nAvailable game modes: NPOT, Sword, Crystal, Axe, Mace, SMP, DPOT, UHC\nAvailable regions: NA, EU, AS, ME, AU',
                    inline: false
                },
                {
                    name: '/closequeue <gamemode> [reason]',
                    value: 'Close an active testing queue for a specific game mode.\nOptionally provide a reason for closing the queue.',
                    inline: false
                },
                {
                    name: '/queuestatus [gamemode]',
                    value: 'View the status of all queues or a specific queue.',
                    inline: false
                },
                {
                    name: '/pull <gamemode>',
                    value: 'Pull the next player from the queue for testing.',
                    inline: false
                },
                {
                    name: 'Tier List Commands',
                    value: 'Commands for managing tier lists:',
                    inline: false
                },
                {
                    name: '!createtierlist <mode>',
                    value: 'Create a new tier list for a specific game mode (vanilla, pot, sword, nethop, crystal, axe, dpot, uhc, smp, mace).',
                    inline: false
                },
                {
                    name: '!tierlist <mode>',
                    value: 'Display the current tier list for a specific game mode.',
                    inline: false
                },
                {
                    name: '!addtier <mode> <tier> <IGN>',
                    value: 'Add a player to a specific tier in the tier list.\nExample: !addtier pot HT1 Zen',
                    inline: false
                },
                {
                    name: 'Utility Commands',
                    value: 'General utility commands:',
                    inline: false
                },
                {
                    name: '!ping',
                    value: 'Check if the bot is responsive.',
                    inline: false
                },
                {
                    name: '!help',
                    value: 'Display a list of all available commands.',
                    inline: false
                },
                {
                    name: '!testerstats <IGN>',
                    value: 'View statistics for a specific tester.',
                    inline: false
                },
                {
                    name: '!testrecords <IGN>',
                    value: 'View test records for a specific tester.',
                    inline: false
                },
                {
                    name: '!testerleaderboard',
                    value: 'Display the leaderboard of top testers.',
                    inline: false
                },
                {
                    name: 'Special Commands',
                    value: 'Administrative commands:',
                    inline: false
                },
                {
                    name: '!cleardata',
                    value: 'Clear all data (admin only).',
                    inline: false
                },
                {
                    name: '!resetmonthlytest',
                    value: 'Reset monthly test counts (admin only).',
                    inline: false
                },
                {
                    name: '!changeign <oldIGN> <newIGN>',
                    value: 'Change a player\'s IGN (admin only).',
                    inline: false
                }
            )
            .setFooter({ text: 'TLUG Testing Bot - Happy Testing!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};