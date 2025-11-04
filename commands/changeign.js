const { SlashCommandBuilder } = require('discord.js');
const { TESTER_ROLE_ID } = require('../config.json');
const firebase = require('../firebase.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changeign')
        .setDescription('Change a player\'s Minecraft username')
        .addUserOption(option =>
            option.setName('player')
                .setDescription('Select the Discord user whose IGN to change')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('new_ign')
                .setDescription('The new Minecraft username')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(16))
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

        // Get command options
        const discordUser = interaction.options.getUser('player');
        const newIgn = interaction.options.getString('new_ign');
        
        try {
            // Get the player by Discord ID
            const player = await firebase.getPlayerByDiscordId(discordUser.id);
            
            if (!player) {
                return await interaction.reply({ 
                    content: `❌ Player <@${discordUser.id}> not found in the database.`,
                    flags: 64
                });
            }
            
            const oldIgn = player.name;
            
            // Get new UUID from Mojang API
            const { default: fetch } = require('node-fetch');
            const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${newIgn}`);
            
            if (!mojangRes.ok) {
                return await interaction.reply({ 
                    content: `❌ Error: Could not find a Minecraft player named '${newIgn}' on Mojang servers.`,
                    flags: 64
                });
            }
            
            const mojangData = await mojangRes.json();
            const newUuid = mojangData.id;
            const newAvatar = `https://crafatar.com/avatars/${newUuid}?overlay`;
            
            // Update the player's IGN, UUID, and avatar in Firebase
            const playersRef = firebase.db.collection('players');
            const snapshot = await playersRef.where('discordId', '==', discordUser.id).limit(1).get();
            
            if (!snapshot.empty) {
                const playerDoc = snapshot.docs[0];
                await playerDoc.ref.update({
                    name: newIgn,
                    uuid: newUuid,
                    avatar: newAvatar
                });
            }
            
            // Send confirmation message
            await interaction.reply({ 
                content: `✅ Successfully changed <@${discordUser.id}>'s Minecraft username from \`${oldIgn}\` to \`${newIgn}\`.`,
                flags: 64
            });
            
            // Send message to result channel
            const resultChannelId = '1399727206288326730';
            const resultChannel = interaction.guild.channels.cache.get(resultChannelId);
            
            if (resultChannel) {
                try {
                    const member = await interaction.guild.members.fetch(discordUser.id);
                    
                    await resultChannel.send({
                        content: `📝 <@${discordUser.id}>'s IGN has been changed by <@${interaction.user.id}>`,
                        embeds: [{
                            title: '╔═══════════════════════════════════════╗\n║        📝 IGN CHANGED        ║\n╚═══════════════════════════════════════╝',
                            color: 0x3498DB,
                            thumbnail: {
                                url: newAvatar
                            },
                            fields: [
                                {
                                    name: '👤 Discord User',
                                    value: `<@${discordUser.id}>`,
                                    inline: true
                                },
                                {
                                    name: '⚔️ Old IGN',
                                    value: `\`${oldIgn}\``,
                                    inline: true
                                },
                                {
                                    name: '🌍 Region',
                                    value: `\`${player.region}\``,
                                    inline: true
                                },
                                {
                                    name: '✨ New IGN',
                                    value: `\`${newIgn}\``,
                                    inline: true
                                },
                                {
                                    name: '🔑 New UUID',
                                    value: `\`${newUuid}\``,
                                    inline: true
                                },
                                {
                                    name: '✅ Changed By',
                                    value: `<@${interaction.user.id}>`,
                                    inline: true
                                }
                            ],
                            footer: {
                                text: 'StunTier Ranking System',
                                icon_url: interaction.guild.iconURL()
                            },
                            timestamp: new Date().toISOString()
                        }]
                    });
                } catch (error) {
                    console.error('Error sending message to result channel:', error);
                }
            }
        } catch (error) {
            console.error('Error changing player IGN:', error);
            
            if (error.message && error.message.includes('Mojang')) {
                await interaction.reply({ 
                    content: `❌ Error: Could not find a Minecraft player named '${newIgn}' on Mojang servers.`,
                    flags: 64
                });
            } else {
                await interaction.reply({ 
                    content: '❌ Error: An unexpected error occurred while changing the IGN.', 
                    flags: 64
                });
            }
        }
    },
};
