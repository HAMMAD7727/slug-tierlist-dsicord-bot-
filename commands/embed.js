const { SlashCommandBuilder } = require('discord.js');
const firebase = require('../firebase.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Manage custom embeds')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new embed')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('The title of the embed')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('The description of the embed')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('The color of the embed (HEX code or name)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer')
                        .setDescription('The footer text of the embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('Image URL for the embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('thumbnail')
                        .setDescription('Thumbnail URL for the embed')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an embed')
                .addStringOption(option =>
                    option.setName('embed_id')
                        .setDescription('The ID of the embed to delete')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing embed')
                .addStringOption(option =>
                    option.setName('embed_id')
                        .setDescription('The ID of the embed to edit')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('The new title of the embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('The new description of the embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('The new color of the embed (HEX code or name)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer')
                        .setDescription('The new footer text of the embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('New image URL for the embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('thumbnail')
                        .setDescription('New thumbnail URL for the embed')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Show an embed')
                .addStringOption(option =>
                    option.setName('embed_id')
                        .setDescription('The ID of the embed to show')
                        .setRequired(true)))
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
        
        const subcommand = interaction.options.getSubcommand();
        
        // Defer reply immediately
        await interaction.deferReply({ flags: 64 });
        
        try {
            if (subcommand === 'create') {
                await handleCreate(interaction);
            } else if (subcommand === 'delete') {
                await handleDelete(interaction);
            } else if (subcommand === 'edit') {
                await handleEdit(interaction);
            } else if (subcommand === 'show') {
                await handleShow(interaction);
            }
        } catch (error) {
            console.error(`Error in embed ${subcommand} command:`, error);
            await interaction.editReply({
                content: `❌ Error: An unexpected error occurred while processing your request.`
            });
        }
    },
};

async function handleCreate(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const colorInput = interaction.options.getString('color');
    const footer = interaction.options.getString('footer');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    
    // Convert color input to hex
    let color = 0xFFFF00; // Default yellow
    if (colorInput) {
        color = parseColor(colorInput) || 0xFFFF00;
    }
    
    // Create embed object
    const embedData = {
        title: title,
        description: description,
        color: color,
        footer: footer ? { text: footer } : undefined,
        image: image ? { url: image } : undefined,
        thumbnail: thumbnail ? { url: thumbnail } : undefined,
        timestamp: new Date().toISOString(),
        createdBy: interaction.user.id,
        createdAt: new Date()
    };
    
    // Save embed to Firebase
    const embedId = await firebase.createEmbed(embedData);
    
    if (!embedId) {
        return await interaction.editReply({
            content: `❌ Error: Failed to create embed.`
        });
    }
    
    await interaction.editReply({
        content: `✅ Embed created successfully!\n**Embed ID:** \`${embedId}\`\n\n**Preview:**`,
        embeds: [embedData]
    });
}

async function handleDelete(interaction) {
    const embedId = interaction.options.getString('embed_id');
    
    // Delete embed from Firebase
    const success = await firebase.deleteEmbed(embedId);
    
    if (!success) {
        return await interaction.editReply({
            content: `❌ Error: Failed to delete embed with ID \`${embedId}\`. It may not exist.`
        });
    }
    
    await interaction.editReply({
        content: `✅ Embed with ID \`${embedId}\` has been deleted.`
    });
}

async function handleEdit(interaction) {
    const embedId = interaction.options.getString('embed_id');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const colorInput = interaction.options.getString('color');
    const footer = interaction.options.getString('footer');
    const image = interaction.options.getString('image');
    const thumbnail = interaction.options.getString('thumbnail');
    
    // Get existing embed from Firebase
    const existingEmbed = await firebase.getEmbed(embedId);
    
    if (!existingEmbed) {
        return await interaction.editReply({
            content: `❌ Error: Embed with ID \`${embedId}\` not found.`
        });
    }
    
    // Update fields that were provided
    const updatedEmbedData = {
        ...existingEmbed,
        title: title || existingEmbed.title,
        description: description || existingEmbed.description,
        color: colorInput ? (parseColor(colorInput) || existingEmbed.color) : existingEmbed.color,
        footer: footer ? { text: footer } : existingEmbed.footer,
        image: image ? { url: image } : existingEmbed.image,
        thumbnail: thumbnail ? { url: thumbnail } : existingEmbed.thumbnail,
        updatedAt: new Date()
    };
    
    // Remove undefined fields
    Object.keys(updatedEmbedData).forEach(key => {
        if (updatedEmbedData[key] === undefined) {
            delete updatedEmbedData[key];
        }
    });
    
    // Update embed in Firebase
    const success = await firebase.updateEmbed(embedId, updatedEmbedData);
    
    if (!success) {
        return await interaction.editReply({
            content: `❌ Error: Failed to update embed with ID \`${embedId}\`.`
        });
    }
    
    // Remove Firebase timestamp fields for display
    const displayEmbed = { ...updatedEmbedData };
    delete displayEmbed.createdAt;
    delete displayEmbed.updatedAt;
    
    await interaction.editReply({
        content: `✅ Embed with ID \`${embedId}\` has been updated.\n\n**Preview:**`,
        embeds: [displayEmbed]
    });
}

async function handleShow(interaction) {
    const embedId = interaction.options.getString('embed_id');
    
    // Get embed from Firebase
    const embedData = await firebase.getEmbed(embedId);
    
    if (!embedData) {
        return await interaction.editReply({
            content: `❌ Error: Embed with ID \`${embedId}\` not found.`
        });
    }
    
    // Remove Firebase timestamp fields for display
    const displayEmbed = { ...embedData };
    delete displayEmbed.createdAt;
    delete displayEmbed.updatedAt;
    
    await interaction.editReply({
        content: `**Embed ID:** \`${embedId}\``,
        embeds: [displayEmbed]
    });
}

// Helper function to generate a simple embed ID
function generateEmbedId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Remove this function since we're using Firebase now
// Helper function to parse color input
function parseColor(colorInput) {
    // Handle named colors
    const namedColors = {
        'red': 0xFF0000,
        'green': 0x00FF00,
        'blue': 0x0000FF,
        'yellow': 0xFFFF00,
        'purple': 0x800080,
        'orange': 0xFFA500,
        'pink': 0xFFC0CB,
        'black': 0x000000,
        'white': 0xFFFFFF,
        'gray': 0x808080,
        'grey': 0x808080
    };
    
    // Check if it's a named color
    const lowerColor = colorInput.toLowerCase();
    if (namedColors[lowerColor]) {
        return namedColors[lowerColor];
    }
    
    // Check if it's a hex color (with or without #)
    let hex = colorInput;
    if (hex.startsWith('#')) {
        hex = hex.substring(1);
    }
    
    if (hex.length === 6 && /^[0-9A-F]{6}$/i.test(hex)) {
        return parseInt(hex, 16);
    }
    
    // Invalid color
    return null;
}

// Helper function to generate a simple embed ID
function generateEmbedId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}