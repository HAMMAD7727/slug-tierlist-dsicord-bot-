const { SlashCommandBuilder } = require('discord.js');
const { TESTER_ROLE_ID } = require('../config.json');
const firebase = require('../firebase.js');

// Gamemode display names
const GAMEMODE_NAMES = {
    'vanilla': 'Vanilla',
    'uhc': 'UHC',
    'pot': 'Pot',
    'nethop': 'Nethop',
    'smp': 'SMP',
    'sword': 'Sword',
    'axe': 'Axe',
    'mace': 'Mace',
    'all': 'All Gamemodes'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleardata')
        .setDescription('Clear player gamemode ranking data')
        .addUserOption(option =>
            option.setName('player')
                .setDescription('Select the Discord user whose data to clear')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('gamemode')
                .setDescription('The gamemode to clear (or all)')
                .setRequired(true)
                .addChoices(
                    { name: 'Vanilla', value: 'vanilla' },
                    { name: 'UHC', value: 'uhc' },
                    { name: 'Pot', value: 'pot' },
                    { name: 'Nethop', value: 'nethop' },
                    { name: 'SMP', value: 'smp' },
                    { name: 'Sword', value: 'sword' },
                    { name: 'Axe', value: 'axe' },
                    { name: 'Mace', value: 'mace' },
                    { name: 'All Gamemodes', value: 'all' }
                ))
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    async execute(interaction) {
        // Check if user has the required role
        const { TESTER_ROLE_ID } = require('../config.json');
        if (!interaction.member.roles.cache.has(TESTER_ROLE_ID)) {
            return await interaction.reply({ 
                content: 'You need the required role to use this command.', 
                flags: 64
            });
        }

        // Get command options
        const discordUser = interaction.options.getUser('player');
        const gamemode = interaction.options.getString('gamemode');
        
        try {
            // Get the player by Discord ID
            const player = await firebase.getPlayerByDiscordId(discordUser.id);
            
            if (!player) {
                return await interaction.reply({ 
                    content: `❌ Player <@${discordUser.id}> not found in the database.`,
                    flags: 64
                });
            }
            
            // Prepare the updated ranks
            let updatedRanks = { ...player.ranks };
            let clearedGamemodes = [];
            
            if (gamemode === 'all') {
                // Clear all gamemode data
                updatedRanks = {};
                clearedGamemodes = Object.keys(player.ranks || {});
            } else {
                // Clear specific gamemode
                if (updatedRanks[gamemode]) {
                    delete updatedRanks[gamemode];
                    clearedGamemodes.push(gamemode);
                } else {
                    return await interaction.reply({ 
                        content: `❌ Player <@${discordUser.id}> doesn't have data for ${GAMEMODE_NAMES[gamemode]}.`,
                        flags: 64
                    });
                }
            }
            
            // Update the player's ranks in Firebase
            const playersRef = firebase.db.collection('players');
            const snapshot = await playersRef.where('discordId', '==', discordUser.id).limit(1).get();
            
            if (!snapshot.empty) {
                const playerDoc = snapshot.docs[0];
                await playerDoc.ref.update({
                    ranks: updatedRanks
                });
            }
            
            // Send confirmation message
            const clearedText = gamemode === 'all' 
                ? 'all gamemode data' 
                : `${GAMEMODE_NAMES[gamemode]} data`;
            
            await interaction.reply({ 
                content: `✅ Successfully cleared ${clearedText} for <@${discordUser.id}> (${player.name}).`,
                flags: 64
            });
            
            // Send message to result channel
            const resultChannelId = '1399727206288326730';
            const resultChannel = interaction.guild.channels.cache.get(resultChannelId);
            
            if (resultChannel) {
                try {
                    const member = await interaction.guild.members.fetch(discordUser.id);
                    
                    await resultChannel.send({
                        content: `🗑️ <@${discordUser.id}>'s data has been cleared by <@${interaction.user.id}>`,
                        embeds: [{
                            title: '╔═══════════════════════════════════════╗\n║        🗑️ DATA CLEARED        ║\n╚═══════════════════════════════════════╝',
                            color: 0xFF6B6B,
                            thumbnail: {
                                url: member.user.displayAvatarURL({ dynamic: true, size: 256 })
                            },
                            fields: [
                                {
                                    name: '👤 Discord User',
                                    value: `<@${discordUser.id}>`,
                                    inline: true
                                },
                                {
                                    name: '⚔️ Minecraft IGN',
                                    value: `\`${player.name}\``,
                                    inline: true
                                },
                                {
                                    name: '🗑️ Cleared',
                                    value: gamemode === 'all' ? '**All Gamemodes**' : `**${GAMEMODE_NAMES[gamemode]}**`,
                                    inline: true
                                },
                                {
                                    name: '✅ Cleared By',
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
            console.error('Error clearing player data:', error);
            await interaction.reply({ 
                content: '❌ Error: An unexpected error occurred while clearing player data.', 
                flags: 64
            });
        }
    },
};
