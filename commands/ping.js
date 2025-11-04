module.exports = {
    name: 'ping',
    description: 'Ping command to check if bot is responsive',
    execute(message, args) {
        message.reply('Pong!');
    },
};