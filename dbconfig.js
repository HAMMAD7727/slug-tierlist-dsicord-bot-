// MongoDB configuration
module.exports = {
    // Replace with your MongoDB connection string
    // Format: mongodb://username:password@host:port/database
    connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017/stun_tierlist',
    
    // Database name
    databaseName: 'stun_tierlist',
    
    // Collection names
    collections: {
        queues: 'queues',
        testers: 'testers',
        testRecords: 'test_records'
    }
};