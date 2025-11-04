const { Client, GatewayIntentBits, Events, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { TOKEN } = require('./config.json');
const fs = require('fs');
const path = require('path');
const channelConfig = require('./channel-config.js');
const firebase = require('./firebase.js');
const queues = require('./queues.js');

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

client.commands = new Collection();
client.slashCommands = new Collection();

// Load traditional commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    // Only set commands that have a name (traditional commands)
    if (command.name) {
        client.commands.set(command.name, command);
    }
}

// Load slash commands
const commandsPath = path.join(__dirname, 'commands');
const commandFilesSlash = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFilesSlash) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.slashCommands.set(command.data.name, command);
    }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    
    // Load queue states from Firebase
    try {
        console.log('Loading queue states from Firebase...');
        const firebaseQueues = await firebase.getAllQueueStates();
        
        // Update local queue states with Firebase data
        for (const [gamemode, queueData] of Object.entries(firebaseQueues)) {
            if (queues[gamemode]) {
                // Preserve the basic structure but update with Firebase data
                queues[gamemode].isOpen = queueData.isOpen || false;
                queues[gamemode].players = queueData.players || [];
                queues[gamemode].channelId = queueData.channelId || null;
                queues[gamemode].messageId = queueData.messageId || null;
                queues[gamemode].openedBy = queueData.openedBy || null;
                queues[gamemode].openedAt = queueData.openedAt ? new Date(queueData.openedAt._seconds * 1000 + queueData.openedAt._nanoseconds / 1000000) : null;
                queues[gamemode].closedBy = queueData.closedBy || null;
                queues[gamemode].closedAt = queueData.closedAt ? new Date(queueData.closedAt._seconds * 1000 + queueData.closedAt._nanoseconds / 1000000) : null;
                queues[gamemode].closeReason = queueData.closeReason || null;
                queues[gamemode].lastOpenedAt = queueData.lastOpenedAt ? new Date(queueData.lastOpenedAt._seconds * 1000 + queueData.lastOpenedAt._nanoseconds / 1000000) : null;
            }
        }
        
        console.log('Queue states loaded successfully from Firebase');
    } catch (error) {
        console.error('Error loading queue states from Firebase:', error);
    }
});

// Listen for messages (traditional commands)
client.on(Events.MessageCreate, message => {
    // Don't respond to bots (including self)
    if (message.author.bot) return;
    
    // Check if message starts with our prefix
    if (!message.content.startsWith('!')) return;
    
    // Parse command and arguments
    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Check if command exists
    if (!client.commands.has(commandName)) return;
    
    // Execute command
    const command = client.commands.get(commandName);
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('There was an error trying to execute that command!');
    }
});

// Listen for slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    try {
        console.log(`Interaction received: ${interaction.type} from ${interaction.user.tag}`);
        
        // Handle slash command interactions
        if (interaction.isChatInputCommand()) {
            console.log(`Slash command: ${interaction.commandName}`);
            const command = interaction.client.slashCommands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Error executing slash command:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', flags: 64 });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', flags: 64 });
                }
            }
        }
        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'registration_modal') {
                try {
                    const minecraftName = interaction.fields.getTextInputValue('minecraft_name');
                    const region = interaction.fields.getTextInputValue('region').toUpperCase();
                    
                    // Validate region
                    const validRegions = ['NA', 'EU', 'AS', 'AU', 'AS/AU'];
                    if (!validRegions.includes(region) && !validRegions.includes(region.replace('/', ''))) {
                        return await interaction.reply({ 
                            content: 'Invalid region. Please use NA, EU, AS, AU, or AS/AU.', 
                            flags: 64
                        });
                    }
                    
                    // Save user registration to Firebase
                    const registrationData = {
                        discordId: interaction.user.id,
                        minecraftName: minecraftName,
                        region: region,
                        registeredAt: new Date()
                    };
                    
                    // Save to Firebase
                    const db = firebase.db;
                    const registrationsRef = db.collection('registrations');
                    const userRegistrationRef = registrationsRef.doc(interaction.user.id);
                    await userRegistrationRef.set(registrationData, { merge: true });
                    
                    await interaction.reply({ 
                        content: `✅ Successfully registered!\nMinecraft Name: ${minecraftName}\nRegion: ${region}`, 
                        flags: 64
                    });
                } catch (error) {
                    console.error('Error processing registration:', error);
                    await interaction.reply({ 
                        content: '❌ There was an error processing your registration. Please try again.', 
                        flags: 64
                    });
                }
            }
        }
        // Handle button interactions
        else if (interaction.isButton()) {
            // Handle Discord user linking
            if (interaction.customId.startsWith('link_')) {
                try {
                    const parts = interaction.customId.split('_');
                    const minecraftName = parts[1];
                    const discordId = parts[2];
                    
                    // Link the Discord user to the Minecraft player
                    const result = await firebase.linkDiscordUser(minecraftName, discordId);
                    
                    if (result.success) {
                        await interaction.reply({ 
                            content: result.message,
                            flags: 64
                        });
                    } else {
                        await interaction.reply({ 
                            content: result.message,
                            flags: 64
                        });
                    }
                } catch (error) {
                    console.error('Error linking Discord user:', error);
                    await interaction.reply({ 
                        content: '❌ Error: Failed to link Discord user.',
                        flags: 64
                    });
                }
            }
            // Handle registration button
            else if (interaction.customId === 'register_profile') {
                // Create modal for registration
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                
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
            }
            // Handle enter waitlist button
            else if (interaction.customId === 'enter_waitlist') {
                // For now, just acknowledge the interaction
                await interaction.reply({ 
                    content: 'The waitlist feature is coming soon!', 
                    flags: 64
                });
            }
            // Handle join/leave queue buttons
            else if (interaction.customId.startsWith('join_') || interaction.customId.startsWith('leave_')) {
                console.log(`Button received: ${interaction.customId} from ${interaction.user.tag}`);
                try {
                    const isJoin = interaction.customId.startsWith('join_');
                    const gamemode = interaction.customId.split('_')[1];
                    console.log(`Gamemode: ${gamemode}, Join: ${isJoin}`);

                    // Check if queue exists and is open
                    if (!queues[gamemode]) {
                        console.log(`Queue for ${gamemode} not found`);
                        if (!interaction.replied && !interaction.deferred) {
                            return await interaction.reply({
                                content: `Queue for ${gamemode} not found.`,
                                flags: 64
                            });
                        }
                        return;
                    }

                    if (!queues[gamemode].isOpen) {
                        console.log(`Queue for ${gamemode} is closed`);
                        if (!interaction.replied && !interaction.deferred) {
                            return await interaction.reply({
                                content: 'This queue is currently closed.',
                                flags: 64
                            });
                        }
                        return;
                    }
                    
                    const userId = interaction.user.id;
                    const queue = queues[gamemode];
                    
                    if (isJoin) {
                        // Prevent tester who opened the queue from joining
                        if (userId === queue.openedBy) {
                            console.log(`Tester ${userId} tried to join their own queue`);
                            if (!interaction.replied && !interaction.deferred) {
                                return await interaction.reply({
                                    content: 'You cannot join your own queue! You are the active tester for this session.',
                                    flags: 64
                                });
                            }
                            return;
                        }
                        
                        // Check if user is already in queue
                        if (queue.players.includes(userId)) {
                            console.log(`User ${userId} is already in queue`);
                            if (!interaction.replied && !interaction.deferred) {
                                return await interaction.reply({
                                    content: 'You are already in this queue!',
                                    flags: 64
                                });
                            }
                            return;
                        }
                        
                        // Add user to queue
                        queue.players.push(userId);
                        console.log(`User ${userId} added to queue. New queue length: ${queue.players.length}`);
                        
                        // Update the queue message
                        const channel = interaction.guild.channels.cache.get(queue.channelId);
                        if (channel) {
                            try {
                                console.log(`Fetching message ${queue.messageId} from channel ${queue.channelId}`);
                                const message = await channel.messages.fetch(queue.messageId);
                                const playerList = queue.players.length > 0 
                                    ? queue.players.map((id, index) => `${index + 1}. <@${id}>`).join('\n') 
                                    : 'No players in queue yet';
                                
                                // Get the tester who opened the queue
                                let testerInfo = 'Unknown';
                                try {
                                    const testerUser = await interaction.guild.members.fetch(queue.openedBy);
                                    testerInfo = `<@${testerUser.id}> (${testerUser.user.username})`;
                                } catch (error) {
                                    testerInfo = `<@${queue.openedBy}>`;
                                }
                                
                                console.log(`Editing queue message with player list: ${playerList}`);
                                await message.edit({
                                    embeds: [{
                                        title: `${gamemode.charAt(0).toUpperCase() + gamemode.slice(1)} Queue:`,
                                        description: '\nClick on the buttons to join/leave the queue.\n',
                                        color: 0x00FF00,
                                        fields: [
                                            {
                                                name: 'Region:',
                                                value: queue.region || 'AS/AU',
                                                inline: false
                                            },
                                            {
                                                name: 'Queue:',
                                                value: playerList,
                                                inline: false
                                            },
                                            {
                                                name: 'Available Testers:',
                                                value: queue.activeTesters ? queue.activeTesters.map(id => `<@${id}>`).join('\n') : `<@${queue.openedBy}>`,
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
                                console.error(`Failed to update queue message for ${gamemode}:`, error);
                            }
                        }
                        
                        // Save updated queue state to Firebase
                        await firebase.saveQueueState(gamemode, queues[gamemode]);
                        
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: `You have joined the ${gamemode} queue! You are #${queue.players.length} in line.`,
                                flags: 64
                            });
                        }
                    } else {
                        // Check if user is in queue
                        const playerIndex = queue.players.indexOf(userId);
                        if (playerIndex === -1) {
                            console.log(`User ${userId} is not in queue`);
                            if (!interaction.replied && !interaction.deferred) {
                                return await interaction.reply({
                                    content: 'You are not in this queue!',
                                    flags: 64
                                });
                            }
                            return;
                        }
                        
                        // Remove user from queue
                        queue.players.splice(playerIndex, 1);
                        console.log(`User ${userId} removed from queue. New queue length: ${queue.players.length}`);
                        
                        // Update the queue message
                        const channel = interaction.guild.channels.cache.get(queue.channelId);
                        if (channel) {
                            try {
                                console.log(`Fetching message ${queue.messageId} from channel ${queue.channelId}`);
                                const message = await channel.messages.fetch(queue.messageId);
                                const playerList = queue.players.length > 0 
                                    ? queue.players.map((id, index) => `${index + 1}. <@${id}>`).join('\n') 
                                    : 'No players in queue yet';
                                
                                // Get the tester who opened the queue
                                let testerInfo = 'Unknown';
                                try {
                                    const testerUser = await interaction.guild.members.fetch(queue.openedBy);
                                    testerInfo = `<@${testerUser.id}> (${testerUser.user.username})`;
                                } catch (error) {
                                    testerInfo = `<@${queue.openedBy}>`;
                                }
                                
                                console.log(`Editing queue message with player list: ${playerList}`);
                                await message.edit({
                                    embeds: [{
                                        title: `${gamemode.charAt(0).toUpperCase() + gamemode.slice(1)} Queue:`,
                                        description: '\nClick on the buttons to join/leave the queue.\n',
                                        color: 0x00FF00,
                                        fields: [
                                            {
                                                name: 'Region:',
                                                value: queue.region || 'AS/AU',
                                                inline: false
                                            },
                                            {
                                                name: 'Queue:',
                                                value: playerList,
                                                inline: false
                                            },
                                            {
                                                name: 'Available Testers:',
                                                value: queue.activeTesters ? queue.activeTesters.map(id => `<@${id}>`).join('\n') : `<@${queue.openedBy}>`,
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
                                console.error(`Failed to update queue message for ${gamemode}:`, error);
                            }
                        }
                        
                        // Save updated queue state to Firebase
                        await firebase.saveQueueState(gamemode, queues[gamemode]);
                        
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: `You have left the ${gamemode} queue!`,
                                flags: 64
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error handling join/leave interaction:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: 'There was an error processing your request. Please try again.', 
                            flags: 64
                        });
                    }
                }
            }
        }
        // Handle select menu interactions
        else if (interaction.isStringSelectMenu()) {
            console.log(`Select menu interaction: ${interaction.customId}`);
            if (interaction.customId === 'select-gamemode') {
                try {
                    console.log(`Select menu interaction received from ${interaction.user.tag}`);
                    const selectedGamemode = interaction.values[0];
                    console.log(`Selected gamemode: ${selectedGamemode}`);
                    
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
                        if (!interaction.replied && !interaction.deferred) {
                            return await interaction.update({
                                content: `Channel for ${selectedGamemode} not found. Please create the channel or update the configuration.`,
                                components: []
                            });
                        }
                        return;
                    }
                    
                    // Open the queue
                    queues[selectedGamemode].isOpen = true;
                    queues[selectedGamemode].openedBy = interaction.user.id;
                    queues[selectedGamemode].openedAt = new Date();
                    queues[selectedGamemode].channelId = channel.id;
                    queues[selectedGamemode].players = [];
                    queues[selectedGamemode].activeTesters = [interaction.user.id]; // Initialize with the tester who opened it
                    
                    // Save queue state to Firebase
                    await firebase.saveQueueState(selectedGamemode, queues[selectedGamemode]);
                    
                    // Send notification to channel with @here ping
                    const notificationMessage = await channel.send({
                        content: `@here <@${interaction.user.id}>`,
                        embeds: [{
                            title: `║  ${selectedGamemode.charAt(0).toUpperCase() + selectedGamemode.slice(1)} (AS/AU)  ║`,
                            description: `**Active Tester:** <@${interaction.user.id}>\n\n:clock1: The queue updates every 10 seconds. Use the leave button if you want to be removed from the wait list.`,
                            color: 0x00FF00,
                            fields: [
                                {
                                    name: 'Queue',
                                    value: 'No players in queue yet',
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
                    
                    // Update the original interaction
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.update({
                            content: `Queue for ${selectedGamemode} has been opened in <#${channel.id}>!`,
                            components: []
                        });
                    }
                } catch (error) {
                    console.error('Error handling select menu interaction:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: 'There was an error processing your request. Please try again.', 
                            flags: 64
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Unexpected error in interaction handler:', error);
    }
});

// Handle process shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    // Save all queue states to Firebase before shutting down
    try {
        for (const [gamemode, queueData] of Object.entries(queues)) {
            await firebase.saveQueueState(gamemode, queueData);
        }
        console.log('All queue states saved to Firebase');
    } catch (error) {
        console.error('Error saving queue states to Firebase:', error);
    }
    process.exit(0);
});

// Log in to Discord with your client's token
client.login(TOKEN);