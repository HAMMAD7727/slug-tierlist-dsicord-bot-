const { SlashCommandBuilder } = require('discord.js');
const { TOKEN, CLIENT_ID, TESTER_ROLE_ID, RANKED_PLAYER_ROLE_ID, TIER_ROLES } = require('../config.json');
const firebase = require('../firebase.js');

// Valid tiers
const VALID_TIERS = ['HT1', 'LT1', 'HT2', 'LT2', 'HT3', 'LT3', 'HT4', 'LT4', 'HT5', 'LT5'];

// Gamemode display names
const GAMEMODE_NAMES = {
    'vanilla': 'Vanilla',
    'uhc': 'UHC',
    'pot': 'Pot',
    'nethop': 'Nethop',
    'smp': 'SMP',
    'sword': 'Sword',
    'axe': 'Axe',
    'mace': 'Mace'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('result')
        .setDescription('Update player rankings in the database')
        .addUserOption(option =>
            option.setName('player')
                .setDescription('Select the Discord user to rank')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ign')
                .setDescription('The player\'s Minecraft username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('region')
                .setDescription('The player\'s geographical region')
                .setRequired(true)
                .addChoices(
                    { name: 'NA', value: 'NA' },
                    { name: 'EU', value: 'EU' },
                    { name: 'AS', value: 'AS' },
                    { name: 'ME', value: 'ME' },
                    { name: 'AU', value: 'AU' }
                ))
        .addStringOption(option =>
            option.setName('gamemode')
                .setDescription('The gamemode to rank')
                .setRequired(true)
                .addChoices(
                    { name: 'Vanilla', value: 'vanilla' },
                    { name: 'UHC', value: 'uhc' },
                    { name: 'Pot', value: 'pot' },
                    { name: 'Nethop', value: 'nethop' },
                    { name: 'SMP', value: 'smp' },
                    { name: 'Sword', value: 'sword' },
                    { name: 'Axe', value: 'axe' },
                    { name: 'Mace', value: 'mace' }
                ))
        .addStringOption(option =>
            option.setName('tier')
                .setDescription('The tier to assign')
                .setRequired(true)
                .addChoices(...VALID_TIERS.map(tier => ({ name: tier, value: tier }))))
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
        const ign = interaction.options.getString('ign');
        const region = interaction.options.getString('region');
        const gamemode = interaction.options.getString('gamemode');
        const tier = interaction.options.getString('tier');
        
        // Defer reply immediately to prevent timeout
        await interaction.deferReply({ flags: 64 });
        
        try {
            // First, get the player's current rank for this gamemode
            const existingPlayer = await firebase.getPlayerByDiscordId(discordUser.id);
            const currentRank = existingPlayer && existingPlayer.ranks && existingPlayer.ranks[gamemode] 
                ? existingPlayer.ranks[gamemode] 
                : 'N/A';
            
            // Create ranks object with the selected gamemode
            const ranks = {
                [gamemode]: tier
            };
            
            // Use the website's Firebase structure with Discord ID as main key
            const result = await firebase.handleResultCommand({
                discordId: discordUser.id,
                ign: ign,
                region: region,
                ranks: ranks
            });

            // If successful, assign the ranked player role and tier role
            if (result.success && RANKED_PLAYER_ROLE_ID && RANKED_PLAYER_ROLE_ID !== "YOUR_RANKED_PLAYER_ROLE_ID_HERE") {
                try {
                    const member = await interaction.guild.members.fetch(discordUser.id);
                    if (member && !member.roles.cache.has(RANKED_PLAYER_ROLE_ID)) {
                        await member.roles.add(RANKED_PLAYER_ROLE_ID);
                        console.log(`Added ranked player role to ${discordUser.username}`);
                    }
                } catch (roleError) {
                    console.error('Error assigning ranked player role:', roleError);
                }
            }

            // Assign tier role based on gamemode and tier
            if (result.success && TIER_ROLES && TIER_ROLES[gamemode] && TIER_ROLES[gamemode][tier]) {
                try {
                    const member = await interaction.guild.members.fetch(discordUser.id);
                    const tierRoleId = TIER_ROLES[gamemode][tier];
                    
                    if (member && tierRoleId) {
                        // Remove all other tier roles for this gamemode first
                        const allTierRolesForGamemode = Object.values(TIER_ROLES[gamemode]);
                        const rolesToRemove = member.roles.cache.filter(role => 
                            allTierRolesForGamemode.includes(role.id) && role.id !== tierRoleId
                        );
                        
                        if (rolesToRemove.size > 0) {
                            await member.roles.remove(rolesToRemove);
                            console.log(`Removed old ${gamemode} tier roles from ${discordUser.username}`);
                        }
                        
                        // Add the new tier role
                        if (!member.roles.cache.has(tierRoleId)) {
                            await member.roles.add(tierRoleId);
                            console.log(`Added ${gamemode} ${tier} role to ${discordUser.username}`);
                        }
                    }
                } catch (roleError) {
                    console.error('Error assigning tier role:', roleError);
                }
            }

            // Create the result embed with skin thumbnail
            const resultEmbed = {
                title: '🏆 Tier Test Results',
                color: 0xFFFF00,
                thumbnail: {
                    url: `https://render.crafty.gg/3d/head/${ign}?format=webp&size=256`
                },
                fields: [
                    {
                        name: 'IGN',
                        value: `**${ign}**`,
                        inline: false
                    },
                    {
                        name: 'Gamemode',
                        value: `**${GAMEMODE_NAMES[gamemode]}**`,
                        inline: false
                    },
                    {
                        name: 'Region',
                        value: `**${region || 'Not specified'}**`,
                        inline: false
                    },
                    {
                        name: 'Current Rank',
                        value: `**${currentRank}**`,
                        inline: false
                    },
                    {
                        name: 'Earned Rank',
                        value: `**${tier}**`,
                        inline: false
                    },
                    {
                        name: 'Tester',
                        value: `<@${interaction.user.id}>`,
                        inline: false
                    }
                ],
                footer: {
                    text: 'StunTier • ' + new Date().toLocaleDateString(),
                    icon_url: interaction.guild.iconURL()
                },
                timestamp: new Date().toISOString()
            };

            // Send response to tester with the result
            await interaction.editReply({ 
                content: `✅ Successfully ranked <@${discordUser.id}>!`,
                embeds: [resultEmbed]
            });

            // Send message to result channel if successful
            if (result.success) {
                const resultChannelId = '1399727206288326730';
                const resultChannel = interaction.guild.channels.cache.get(resultChannelId);
                
                if (resultChannel) {
                    try {
                        // Send the same embed to result channel
                        await resultChannel.send({
                            content: `<@${discordUser.id}>`,
                            embeds: [resultEmbed]
                        });

                    } catch (error) {
                        console.error('Error sending message to result channel:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error in result command:', error);
            await interaction.editReply({ 
                content: '❌ Error: An unexpected error occurred while processing your request.'
            });
        }
    },
};