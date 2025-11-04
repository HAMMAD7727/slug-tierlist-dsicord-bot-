const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display a list of all available commands'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('TLUG Discord Bot - Help')
            .setDescription('Here are all the commands you can use:')
            .setColor(0x0099FF)
            .addFields(
                {
                    name: '📝 Registration & Profile',
                    value: '/setupregistration - Set up the registration message (Admin only)\n/register - Register or update your Minecraft profile',
                    inline: false
                },
                {
                    name: '🎮 Queue Management',
                    value: '/startqueue <gamemode> <region> - Start a testing queue (Tester role required)\n/closequeue <gamemode> [reason] - Close a testing queue (Tester role required)\n/queuestatus [gamemode] - View queue status\n/pull <gamemode> - Pull next player from queue (Tester role required)\n/forcestop [reason] - Force stop all queues (Owner only)',
                    inline: false
                },
                {
                    name: '🏆 Tier Lists',
                    value: '!createtierlist <mode> - Create a new tier list\n!tierlist <mode> - Display a tier list\n!addtier <mode> <tier> <IGN> - Add a player to a tier',
                    inline: false
                },
                {
                    name: '📊 Statistics',
                    value: '!testerstats <IGN> - View tester statistics\n!testrecords <IGN> - View test records\n!testerleaderboard - View tester leaderboard',
                    inline: false
                },
                {
                    name: 'ℹ️ Utility',
                    value: '!ping - Check if the bot is responsive\n!help - Display this help message',
                    inline: false
                }
            )
            .setFooter({ text: 'TLUG Testing Bot - Happy Testing!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};