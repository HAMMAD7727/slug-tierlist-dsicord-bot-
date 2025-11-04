const { SlashCommandBuilder } = require('discord.js');
const { TESTER_ROLE_ID } = require('../config.json');
const queues = require('../queues.js');
const firebase = require('../firebase.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Join an active queue as a tester')
        .addStringOption(option =>
            option.setName('gamemode')
                .setDescription('The game mode queue to join as a tester')
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

        const gamemode = interaction.options.getString('gamemode');

        // Check if queue exists and is open
        if (!queues[gamemode]) {
            return await interaction.reply({ 
                content: `Queue for ${gamemode} not found.`, 
                flags: 64
            });
        }

        if (!queues[gamemode].isOpen) {
            return await interaction.reply({ 
                content: `Queue for ${gamemode} is not currently open.`, 
                flags: 64
            });
        }

        // Initialize active testers array if it doesn't exist
        if (!queues[gamemode].activeTesters) {
            queues[gamemode].activeTesters = [queues[gamemode].openedBy];
        }

        // Check if tester is already in the active testers list
        if (queues[gamemode].activeTesters.includes(interaction.user.id)) {
            return await interaction.reply({ 
                content: `You are already an active tester for the ${gamemode} queue!`, 
                flags: 64
            });
        }

        // Add tester to active testers list
        queues[gamemode].activeTesters.push(interaction.user.id);

        // Update the queue message
        const channel = interaction.guild.channels.cache.get(queues[gamemode].channelId);
        if (channel) {
            try {
                const message = await channel.messages.fetch(queues[gamemode].messageId);
                const playerList = queues[gamemode].players.length > 0 
                    ? queues[gamemode].players.map((id, index) => `${index + 1}. <@${id}>`).join('\n') 
                    : 'No players in queue yet';
                
                // Get all active testers
                const testersList = queues[gamemode].activeTesters
                    .map(id => `<@${id}>`)
                    .join('\n');
                
                await message.edit({
                    embeds: [{
                        title: `${gamemode.charAt(0).toUpperCase() + gamemode.slice(1)} Queue:`,
                        description: '\nClick on the buttons to join/leave the queue.\n',
                        color: 0x00FF00,
                        fields: [
                            {
                                name: 'Region:',
                                value: queues[gamemode].region || 'AS/AU',
                                inline: false
                            },
                            {
                                name: 'Queue:',
                                value: playerList || 'No players in queue yet',
                                inline: false
                            },
                            {
                                name: 'Available Testers:',
                                value: testersList || `<@${queues[gamemode].openedBy}>`,
                                inline: false
                            }
                        ],
                        footer: {
                            text: 'Click the buttons below to join or leave the queue',
                            icon_url: interaction.guild.iconURL()
                        },
                        timestamp: new Date().toISOString()
                    }],
                    components: message.components
                });
            } catch (error) {
                console.error('Failed to update queue message:', error);
            }
        }

        // Save updated queue state to Firebase
        await firebase.saveQueueState(gamemode, queues[gamemode]);

        await interaction.reply({ 
            content: `✅ You have joined the ${gamemode} queue as an active tester! You can now use \`/pull\` to test players.`, 
            flags: 64
        });
    },
};
