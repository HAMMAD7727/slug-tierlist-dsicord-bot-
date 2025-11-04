const { MongoClient } = require('mongodb');
const { connectionString, databaseName, collections } = require('./dbconfig');

class DatabaseService {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = new MongoClient(connectionString);
            await this.client.connect();
            this.db = this.client.db(databaseName);
            this.isConnected = true;
            console.log('Connected to MongoDB');
            return true;
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            return false;
        }
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.close();
                this.isConnected = false;
                console.log('Disconnected from MongoDB');
            }
        } catch (error) {
            console.error('Error disconnecting from MongoDB:', error);
        }
    }

    // Queue operations
    async saveQueueState(queueData) {
        if (!this.isConnected) return false;
        
        try {
            const collection = this.db.collection(collections.queues);
            const filter = { gamemode: queueData.gamemode };
            const update = { $set: queueData };
            const options = { upsert: true };
            
            await collection.updateOne(filter, update, options);
            return true;
        } catch (error) {
            console.error('Error saving queue state:', error);
            return false;
        }
    }

    async loadQueueState(gamemode) {
        if (!this.isConnected) return null;
        
        try {
            const collection = this.db.collection(collections.queues);
            const queue = await collection.findOne({ gamemode });
            return queue;
        } catch (error) {
            console.error('Error loading queue state:', error);
            return null;
        }
    }

    async loadAllQueues() {
        if (!this.isConnected) return {};
        
        try {
            const collection = this.db.collection(collections.queues);
            const queues = await collection.find({}).toArray();
            const queueMap = {};
            
            queues.forEach(queue => {
                queueMap[queue.gamemode] = queue;
            });
            
            return queueMap;
        } catch (error) {
            console.error('Error loading all queues:', error);
            return {};
        }
    }

    // Tester operations
    async saveTesterStats(testerId, stats) {
        if (!this.isConnected) return false;
        
        try {
            const collection = this.db.collection(collections.testers);
            const filter = { testerId };
            const update = { 
                $set: { testerId, lastUpdated: new Date() },
                $inc: stats 
            };
            const options = { upsert: true };
            
            await collection.updateOne(filter, update, options);
            return true;
        } catch (error) {
            console.error('Error saving tester stats:', error);
            return false;
        }
    }

    async getTesterStats(testerId) {
        if (!this.isConnected) return null;
        
        try {
            const collection = this.db.collection(collections.testers);
            const stats = await collection.findOne({ testerId });
            return stats;
        } catch (error) {
            console.error('Error getting tester stats:', error);
            return null;
        }
    }

    // Test record operations
    async saveTestRecord(record) {
        if (!this.isConnected) return false;
        
        try {
            const collection = this.db.collection(collections.testRecords);
            const result = await collection.insertOne({
                ...record,
                createdAt: new Date()
            });
            return result.insertedId;
        } catch (error) {
            console.error('Error saving test record:', error);
            return null;
        }
    }

    async getTestRecords(filter = {}) {
        if (!this.isConnected) return [];
        
        try {
            const collection = this.db.collection(collections.testRecords);
            const records = await collection.find(filter).sort({ createdAt: -1 }).toArray();
            return records;
        } catch (error) {
            console.error('Error getting test records:', error);
            return [];
        }
    }
}

module.exports = new DatabaseService();