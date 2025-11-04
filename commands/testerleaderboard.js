const { SlashCommandBuilder } = require('discord.js');
const firebase = require('../firebase.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testerleaderboard')
        .setDescription('View tester leaderboard rankings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('monthly')
                .setDescription('View monthly tester leaderboard'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('alltime')
                .setDescription('View all-time tester leaderboard'))
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
        
        const subcommand = interaction.options.getSubcommand();
        
        try {
            // Defer reply immediately
            await interaction.deferReply({ flags: 64 });
            
            let title, description;
            
            if (subcommand === 'monthly') {
                title = '🏆 Monthly Tester Leaderboard';
                description = 'Top testers this month based on tests conducted';
                
                // Get current month/year for filtering
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                // Get all test records from Firebase
                const testRecords = await firebase.getAllTestRecords();
                
                // Filter for current month
                const monthlyTests = testRecords.filter(record => {
                    const testDate = record.timestamp.toDate ? record.timestamp.toDate() : new Date(record.timestamp);
                    return testDate.getMonth() === currentMonth && testDate.getFullYear() === currentYear;
                });
                
                // Count tests per tester
                const testerStats = {};
                monthlyTests.forEach(record => {
                    const testerId = record.testerId;
                    testerStats[testerId] = (testerStats[testerId] || 0) + 1;
                });
                
                // Sort testers by test count
                const sortedTesters = Object.entries(testerStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10); // Top 10
                
                if (sortedTesters.length === 0) {
                    description += '\n\nNo tests conducted this month yet.';
                } else {
                    description += '\n\n';
                    sortedTesters.forEach(([testerId, testCount], index) => {
                        const position = index + 1;
                        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`;
                        description += `${medal} <@${testerId}> - **${testCount}** tests\n`;
                    });
                }
                
            } else {
                title = '🏆 All-Time Tester Leaderboard';
                description = 'Top testers of all time based on tests conducted';
                
                // Get all test records from Firebase
                const testRecords = await firebase.getAllTestRecords();
                
                // Count tests per tester
                const testerStats = {};
                testRecords.forEach(record => {
                    const testerId = record.testerId;
                    testerStats[testerId] = (testerStats[testerId] || 0) + 1;
                });
                
                // Sort testers by test count
                const sortedTesters = Object.entries(testerStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10); // Top 10
                
                if (sortedTesters.length === 0) {
                    description += '\n\nNo tests conducted yet.';
                } else {
                    description += '\n\n';
                    sortedTesters.forEach(([testerId, testCount], index) => {
                        const position = index + 1;
                        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `#${position}`;
                        description += `${medal} <@${testerId}> - **${testCount}** tests\n`;
                    });
                }
            }
            
            // Send the embed
            await interaction.editReply({
                embeds: [{
                    title: title,
                    description: description,
                    color: 0xFFFF00,
                    footer: {
                        text: 'StunTier Testing System',
                        icon_url: interaction.guild.iconURL()
                    },
                    timestamp: new Date().toISOString()
                }]
            });
            
        } catch (error) {
            console.error('Error in tester leaderboard command:', error);
            await interaction.editReply({
                content: '❌ Error: An unexpected error occurred while fetching the leaderboard.'
            });
        }
    },
};