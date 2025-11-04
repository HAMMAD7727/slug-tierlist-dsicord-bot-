const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupregistration')
        .setDescription('Set up the registration message in the request-test channel'),
    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ 
                content: 'You need administrator permissions to use this command.', 
                flags: 64
            });
        }

        try {
            // Get the request-test channel
            const channel = interaction.guild.channels.cache.get('1434206332696924353');
            
            if (!channel) {
                return await interaction.reply({ 
                    content: 'Could not find the request-test channel.', 
                    flags: 64
                });
            }

            // Create the registration message
            const registerButton = new ButtonBuilder()
                .setCustomId('register_profile')
                .setLabel('Register / Update Profile')
                .setStyle(ButtonStyle.Primary);

            const waitlistButton = new ButtonBuilder()
                .setCustomId('enter_waitlist')
                .setLabel('Enter Waitlist')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
                .addComponents(registerButton, waitlistButton);

            // Send the message
            await channel.send({
                content: '📜  Evaluation Testing Waitlist & Roles\n\n**Step 1: Register Your Profile**\n\nClick the Register / Update Profile button to set your in-game details.\n\n\n**Step 2: Get a Waitlist Role**\n\nAfter registering, click any gamemode button below to get the corresponding waitlist role. Each role has a 5-day cooldown.\n\n\n• Region: The server region you wish to test on (NA, EU, AS/AU).\n\n• Username: The name of the account you will be testing on.\n\n\n:gavel_gif~1: Failure to provide authentic information will result in a denied test.',
                components: [row]
            });

            await interaction.reply({ 
                content: 'Registration message has been set up in the request-test channel.', 
                flags: 64
            });
        } catch (error) {
            console.error('Error setting up registration message:', error);
            await interaction.reply({ 
                content: 'There was an error setting up the registration message.', 
                flags: 64
            });
        }
    },
};