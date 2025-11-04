// Channel configuration for different game modes
// This file maps game modes to their respective waitlist channels
// Update these channel IDs to match your server's channels

module.exports = {
    // Channel IDs for each game mode's waitlist
    channels: {
        sword: "1399727244569739285",
        uhc: "1399727246167773244",
        axe: "1399727250072670379",
        crystal: "1399727252379537582",
        smp: "1428285266476531832",
        npot: "1428285345895809114",
        dpot: "1428285376887521290"
    },
    
    // Default channel naming convention
    // The bot will look for channels with these names if IDs are not set
    channelNames: {
        npot: 'npot-waitlist',
        sword: 'sword-waitlist',
        crystal: 'crystal-waitlist',
        axe: 'axe-waitlist',
        mace: 'mace-waitlist',
        smp: 'smp-waitlist',
        dpot: 'dpot-waitlist',
        uhc: 'uhc-waitlist'
    }
};