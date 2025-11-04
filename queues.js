// Queue data structure to track open/closed status for different game modes
const queues = {
    npot: {
        isOpen: false,
        players: [],
        channelId: null,
        messageId: null,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastOpenedAt: null
    },
    sword: {
        isOpen: false,
        players: [],
        channelId: null,
        messageId: null,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastOpenedAt: null
    },
    crystal: {
        isOpen: false,
        players: [],
        channelId: null,
        messageId: null,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastOpenedAt: null
    },
    axe: {
        isOpen: false,
        players: [],
        channelId: null,
        messageId: null,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastOpenedAt: null
    },
    mace: {
        isOpen: false,
        players: [],
        channelId: null,
        messageId: null,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastOpenedAt: null
    },
    smp: {
        isOpen: false,
        players: [],
        channelId: null,
        messageId: null,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastOpenedAt: null
    },
    dpot: {
        isOpen: false,
        players: [],
        channelId: null,
        messageId: null,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastOpenedAt: null
    },
    uhc: {
        isOpen: false,
        players: [],
        channelId: null,
        messageId: null,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
        closeReason: null,
        lastOpenedAt: null
    }
};

module.exports = queues;