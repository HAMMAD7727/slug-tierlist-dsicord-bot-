const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const firebase = require('../firebase.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register or update your Minecraft profile')
        .setDefaultMemberPermissions(0), // Only members with roles can use this command
    async execute(interaction) {
        // Check if user has the required role
        if (!interaction.member.roles.cache.has(TESTER_ROLE_ID)) {
            return await interaction.reply({ 
                content: 'You need the required role to use this command.', 
                flags: 64
            });
        }
        
        // Create modal for registration
        const modal = new ModalBuilder()
            .setCustomId('registration_modal')
            .setTitle('Register Your Profile');
        
        const minecraftNameInput = new TextInputBuilder()
            .setCustomId('minecraft_name')
            .setLabel('Minecraft Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your Minecraft username')
            .setRequired(true)
            .setMaxLength(16);
        
        const regionInput = new TextInputBuilder()
            .setCustomId('region')
            .setLabel('Region (NA, EU, AS/AU)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your preferred region')
            .setRequired(true)
            .setMaxLength(10);
        
        const firstActionRow = new ActionRowBuilder().addComponents(minecraftNameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(regionInput);
        
        modal.addComponents(firstActionRow, secondActionRow);
        
        await interaction.showModal(modal);
    },
};