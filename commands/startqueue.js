const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { TESTER_ROLE_ID } = require('../config.json');
const queues = require('../queues.js');
const channelConfig = require('../channel-config.js');
const firebase = require('../firebase.js');
const admin = require('firebase-admin');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startqueue')
        .setDescription('Start a testing queue for a specific game mode')
        .addStringOption(option =>
            option.setName('gamemode')
                .setDescription('The game mode to start the queue for')
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
            option.setName('region')
                .setDescription('The region for the queue')
                .setRequired(true)
                .addChoices(
                    { name: 'NA', value: 'NA' },
                    { name: 'EU', value: 'EU' },
                    { name: 'AS', value: 'AS' },
                    { name: 'ME', value: 'ME' },
                    { name: 'AU', value: 'AU' }
                ))
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

        // Get command options
        const selectedGamemode = interaction.options.getString('gamemode');
        const region = interaction.options.getString('region');
        
        // Get the waitlist channel for this gamemode
        let channel = null;
        
        // First try to get channel by ID from config
        if (channelConfig.channels[selectedGamemode]) {
            channel = interaction.guild.channels.cache.get(channelConfig.channels[selectedGamemode]);
        }
        
        // If not found by ID, try to get by name
        if (!channel) {
            const channelName = channelConfig.channelNames[selectedGamemode];
            channel = interaction.guild.channels.cache.find(ch => ch.name === channelName);
        }
        
        if (!channel) {
            console.log(`Channel not found for ${selectedGamemode}`);
            return await interaction.reply({
                content: `Channel for ${selectedGamemode} not found. Please create the channel or update the configuration.`,
                flags: 64
            });
        }
        
        // Open the queue
        queues[selectedGamemode].isOpen = true;
        queues[selectedGamemode].openedBy = interaction.user.id;
        queues[selectedGamemode].openedAt = new Date(); // Use regular Date instead of Firestore server timestamp
        queues[selectedGamemode].channelId = channel.id;
        queues[selectedGamemode].players = [];
        queues[selectedGamemode].activeTesters = [interaction.user.id]; // Initialize with the tester who opened it
        queues[selectedGamemode].region = region; // Store the region
        queues[selectedGamemode].lastOpenedAt = new Date(); // Store last opened time
        
        // Save queue state to Firebase
        await firebase.saveQueueState(selectedGamemode, queues[selectedGamemode]);
        
        // Send notification to channel with @here ping
        const notificationMessage = await channel.send({
            content: `@here <@${interaction.user.id}>`,
            embeds: [{
                title: `${selectedGamemode.charAt(0).toUpperCase() + selectedGamemode.slice(1)} Queue:`,
                description: '\nClick on the buttons to join/leave the queue.\n',
                color: 0x00FF00,
                fields: [
                    {
                        name: 'Region:',
                        value: region,
                        inline: false
                    },
                    {
                        name: 'Queue:',
                        value: 'No players in queue yet',
                        inline: false
                    },
                    {
                        name: 'Available Testers:',
                        value: `<@${interaction.user.id}>`,
                        inline: false
                    }
                ],
                footer: {
                    text: 'Click the buttons below to join or leave the queue',
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date().toISOString()
            }],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            label: 'Join Queue',
                            style: 1, // Primary
                            custom_id: `join_${selectedGamemode}`
                        },
                        {
                            type: 2,
                            label: 'Leave Queue',
                            style: 4, // Danger
                            custom_id: `leave_${selectedGamemode}`
                        }
                    ]
                }
            ]
        });
        
        // Store the message ID for future updates
        queues[selectedGamemode].messageId = notificationMessage.id;
        
        // Save updated queue state to Firebase
        await firebase.saveQueueState(selectedGamemode, queues[selectedGamemode]);
        
        // Reply to the interaction
        await interaction.reply({
            content: `Queue for ${selectedGamemode} has been opened in <#${channel.id}>!`,
            flags: 64
        });
    },
};