const { SlashCommandBuilder } = require('discord.js');
const { TESTER_ROLE_ID } = require('../config.json');
const firebase = require('../firebase.js');

// Owner role ID
const OWNER_ROLE_ID = '1434206330905825364';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetmonthlytest')
        .setDescription('Reset monthly test records (Owner only)')
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    async execute(interaction) {
        // Check if user has the required role
        if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return await interaction.reply({ 
                content: 'You need the required role to use this command.', 
                flags: 64
            });
        }

        try {
            // Defer reply immediately
            await interaction.deferReply({ flags: 64 });
            
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
            
            // Delete monthly test records
            let deletedCount = 0;
            const testRecordsRef = firebase.admin.firestore().collection('testRecords');
            
            for (const record of monthlyTests) {
                try {
                    await testRecordsRef.doc(record.id).delete();
                    deletedCount++;
                } catch (deleteError) {
                    console.error(`Error deleting test record ${record.id}:`, deleteError);
                }
            }
            
            // Reset tester stats for current month
            const testersRef = firebase.admin.firestore().collection('testers');
            const testersSnapshot = await testersRef.get();
            
            let resetCount = 0;
            testersSnapshot.forEach(async (doc) => {
                try {
                    await doc.ref.update({
                        monthlyTests: 0,
                        lastMonthlyReset: new Date()
                    });
                    resetCount++;
                } catch (updateError) {
                    console.error(`Error updating tester stats for ${doc.id}:`, updateError);
                }
            });
            
            // Send success message
            await interaction.editReply({
                embeds: [{
                    title: '🔄 Monthly Test Reset',
                    description: `Successfully reset monthly test data:\n\n• Deleted **${deletedCount}** test records\n• Reset stats for **${resetCount}** testers`,
                    color: 0xFFFF00,
                    footer: {
                        text: 'StunTier Testing System',
                        icon_url: interaction.guild.iconURL()
                    },
                    timestamp: new Date().toISOString()
                }]
            });
            
        } catch (error) {
            console.error('Error in reset monthly test command:', error);
            await interaction.editReply({
                content: '❌ Error: An unexpected error occurred while resetting monthly test data.'
            });
        }
    },
};