const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { TESTER_ROLE_ID } = require('../config.json');
const queues = require('../queues.js');
const firebase = require('../firebase.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('closequeue')
        .setDescription('Close a testing queue for a specific game mode')
        .addStringOption(option =>
            option.setName('gamemode')
                .setDescription('The game mode to close the queue for')
                .setRequired(true)
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
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for closing the queue')
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

        const gamemode = interaction.options.getString('gamemode');
        const reason = interaction.options.getString('reason') || 'Manually closed by queue administrator';

        // Check if queue exists and is open
        if (!queues[gamemode]) {
            return await interaction.reply({ 
                content: `Queue for ${gamemode} not found.`, 
                flags: 64
            });
        }

        if (!queues[gamemode].isOpen) {
            return await interaction.reply({ 
                content: `Queue for ${gamemode} is already closed.`, 
                flags: 64
            });
        }

        // Close the queue
        queues[gamemode].isOpen = false;
        queues[gamemode].closedBy = interaction.user.id;
        queues[gamemode].closedAt = new Date();
        queues[gamemode].closeReason = reason;

        // Update the queue message in the channel
        const channelId = queues[gamemode].channelId;
        const messageId = queues[gamemode].messageId;
        
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
                        text: `Last testing session: ${queues[gamemode].lastOpenedAt ? queues[gamemode].lastOpenedAt.toLocaleString() : 'Unknown'}`
                    }
                };
                
                // Add first player info if there was one
                if (queues[gamemode].players && queues[gamemode].players.length > 0) {
                    embed.fields = [{
                        name: '🎮 First Player',
                        value: `<@${queues[gamemode].players[0]}>`,
                        inline: false
                    }];
                }
                
                await message.edit({
                    content: '',
                    embeds: [embed],
                    components: [] // Remove buttons
                });
            } catch (error) {
                console.error('Failed to update queue message:', error);
            }
        }

        // Save updated queue state to Firebase
        await firebase.saveQueueState(gamemode, queues[gamemode]);

        // Prepare response message
        let responseContent = `Queue for ${gamemode} has been closed.`;
        if (queues[gamemode].players && queues[gamemode].players.length > 0) {
            responseContent += ` First player: <@${queues[gamemode].players[0]}>.`;
        }
        
        await interaction.reply({ 
            content: responseContent, 
            flags: 64
        });
    },
};