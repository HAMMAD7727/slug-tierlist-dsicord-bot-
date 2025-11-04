const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { TESTER_ROLE_ID, TICKET_CATEGORY_ID } = require('../config.json');
const queues = require('../queues.js');
const firebase = require('../firebase.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pull')
        .setDescription('Pull the first player from a queue and create a ticket')
        .addStringOption(option =>
            option.setName('gamemode')
                .setDescription('The game mode to pull from')
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
                content: `Queue for ${gamemode} is not open.`, 
                flags: 64
            });
        }

        // Check if there are players in the queue
        if (!queues[gamemode].players || queues[gamemode].players.length === 0) {
            return await interaction.reply({ 
                content: `No players in the ${gamemode} queue.`, 
                flags: 64
            });
        }

        // Get the first player
        const firstPlayerId = queues[gamemode].players[0];
        
        // Remove the first player from the queue
        queues[gamemode].players.shift();

        // Try to create a ticket channel
        try {
            // Get the player's username to use in channel name
            const player = await interaction.guild.members.fetch(firstPlayerId);
            const playerName = player.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const channelName = `🎫-${playerName}-${gamemode}`;
            
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID !== "YOUR_TICKET_CATEGORY_ID_HERE" ? TICKET_CATEGORY_ID : null,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: firstPlayerId,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            // Send a welcome message in the ticket channel with embed
            await ticketChannel.send({
                content: `🎫 <@${interaction.user.id}> <@${firstPlayerId}>`,
                embeds: [{
                    title: '🎫 TEST TICKET CREATED',
                    color: 0x9B59B6,
                    fields: [
                        {
                            name: '👨‍🔬 Tester',
                            value: `<@${interaction.user.id}>`,
                            inline: true
                        },
                        {
                            name: '🎮 Player',
                            value: `<@${firstPlayerId}>`,
                            inline: true
                        },
                        {
                            name: '🏆 Gamemode',
                            value: `**${gamemode.charAt(0).toUpperCase() + gamemode.slice(1)}**`,
                            inline: true
                        },
                        {
                            name: '📋 Instructions',
                            value: 'Please conduct the testing session here.\nOnce complete, use `/result` to record the player\'s rank.',
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'Stun Tierlist • ' + new Date().toLocaleDateString(),
                        icon_url: interaction.guild.iconURL()
                    },
                    timestamp: new Date().toISOString()
                }]
            });

            // Update the queue message
            const channel = interaction.guild.channels.cache.get(queues[gamemode].channelId);
            if (channel) {
                try {
                    const message = await channel.messages.fetch(queues[gamemode].messageId);
                    const playerList = queues[gamemode].players.length > 0 
                        ? queues[gamemode].players.map((id, index) => `${index + 1}. <@${id}>`).join('\n') 
                        : 'No players in queue yet';
                    
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
                                    value: queues[gamemode].activeTesters ? queues[gamemode].activeTesters.map(id => `<@${id}>`).join('\n') : `<@${queues[gamemode].openedBy}>`,
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
            
            // Save test record
            await firebase.saveTestRecord({
                testerId: interaction.user.id,
                playerId: firstPlayerId,
                gamemode: gamemode,
                timestamp: new Date(),
                ticketChannelId: ticketChannel.id
            });
            
            // Update tester stats
            await firebase.saveTesterStats(interaction.user.id, { 
                testsConducted: 1,
                lastTestTime: new Date()
            });

            await interaction.reply({ 
                content: `Pulled <@${firstPlayerId}> from the ${gamemode} queue. Ticket created: <#${ticketChannel.id}>`, 
                flags: 0 // Not ephemeral so others can see the ticket was created
            });
        } catch (error) {
            console.error('Failed to create ticket channel:', error);
            await interaction.reply({ 
                content: `Pulled <@${firstPlayerId}> from the ${gamemode} queue, but failed to create a ticket channel.`, 
                flags: 64
            });
        }
    },
};