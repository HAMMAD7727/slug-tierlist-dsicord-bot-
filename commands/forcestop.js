const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const queues = require('../queues.js');
const firebase = require('../firebase.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcestop')
        .setDescription('Force stop all testing queues (Owner only)')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for force stopping all queues')
                .setRequired(false))
        .setDefaultMemberPermissions(0) // Only members with roles can use this command
        .setDMPermission(false),
    async execute(interaction) {
        // Check if user has the required role
        if (!interaction.member.roles.cache.has(TESTER_ROLE_ID)) {
            return await interaction.reply({ 
                content: 'You need the required role to use this command.', 
                flags: 64
            });
        }

        const reason = interaction.options.getString('reason') || 'Force stopped by server owner';
        let closedQueues = 0;

        // Close all open queues
        for (const [gamemode, queue] of Object.entries(queues)) {
            if (queue.isOpen) {
                // Close the queue
                queue.isOpen = false;
                queue.closedBy = interaction.user.id;
                queue.closedAt = new Date();
                queue.closeReason = reason;

                // Update the queue message in the channel
                const channelId = queue.channelId;
                const messageId = queue.messageId;
                
                if (channelId && messageId) {
                    try {
                        const channel = await interaction.guild.channels.fetch(channelId);
                        const message = await channel.messages.fetch(messageId);
                        
                        // Update message to show closed queue
                        const embed = {
                            title: `${gamemode.charAt(0).toUpperCase() + gamemode.slice(1)} Queue - CLOSED`,
                            description: '**No Tester  Online**\nNo testers for your region are available at this time. You will be pinged when a tester is available.\n\nCheck back later.',
                            color: 0xFF0000,
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: `Last testing session: ${queue.lastOpenedAt ? queue.lastOpenedAt.toLocaleString() : 'Unknown'}`
                            }
                        };
                        
                        // Add first player info if there was one
                        if (queue.players && queue.players.length > 0) {
                            embed.fields = [{
                                name: '🎮 First Player',
                                value: `<@${queue.players[0]}>`,
                                inline: false
                            }];
                        }
                        
                        await message.edit({
                            content: '',
                            embeds: [embed],
                            components: [] // Remove buttons
                        });
                    } catch (error) {
                        console.error(`Failed to update queue message for ${gamemode}:`, error);
                    }
                }

                // Save updated queue state to Firebase
                await firebase.saveQueueState(gamemode, queue);
                closedQueues++;
            }
        }

        // Prepare response message
        let responseContent = `Force stopped all queues. Closed ${closedQueues} queue(s).`;
        
        await interaction.reply({ 
            content: responseContent, 
            flags: 64
        });
    },
};