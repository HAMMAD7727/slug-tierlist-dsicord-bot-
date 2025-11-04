const admin = require('firebase-admin');
const serviceAccount = require('./firebase-config.json');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

class FirebaseService {
  constructor() {
    this.db = db;
    this.admin = admin;
  }

  // Player operations using Discord ID as main key
  async handleResultCommand(commandData) {
    const { discordId, ign, region, ranks } = commandData;

    if (!discordId || !ign || !region) {
      return { success: false, message: "Error: Discord ID, player name (ign) and region are all required." };
    }

    try {
      const playersRef = this.db.collection('players');
      // 1. Check if the player already exists by Discord ID
      const snapshot = await playersRef.where('discordId', '==', discordId).limit(1).get();

      if (snapshot.empty) {
        // --- Player does NOT exist. Create a new one. ---
        console.log(`Player with Discord ID ${discordId} not found. Creating new player...`);

        // 2a. Get player UUID from Mojang API
        const { default: fetch } = require('node-fetch');
        const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${ign}`);
        if (!mojangRes.ok) {
          return { success: false, message: `Error: Could not find a Minecraft player named '${ign}' on Mojang servers.` };
        }
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;

        // 2b. Create the new player object with Discord ID as main identifier
        const newPlayer = {
          discordId: discordId,
          uuid,
          name: ign,
          region: region,
          avatar: `https://crafatar.com/avatars/${uuid}?overlay`,
          ranks: { ...ranks } // Use the ranks from the command
        };
        
        // 2c. Add the new player to the 'players' collection
        await playersRef.add(newPlayer);
        
        return { success: true, message: `✅ New player ${ign} has been successfully added to the rankings.` };

      } else {
        // --- Player EXISTS. Update the existing one. ---
        const playerDoc = snapshot.docs[0];
        console.log(`Player with Discord ID ${discordId} found (ID: ${playerDoc.id}). Updating ranks...`);

        // 3a. Prepare the data to update. We merge the existing ranks with the new ones.
        const existingData = playerDoc.data();
        const updatedData = {
          name: ign, // Update the name in case it changed
          region: region, // Update the region
          ranks: {
            ...existingData.ranks, // Keep all old ranks
            ...ranks              // Overwrite with new ranks from the command
          }
        };

        // 3b. Update the document in Firestore
        await playerDoc.ref.update(updatedData);

        return { success: true, message: `✅ Player ${ign} has been successfully updated.` };
      }

    } catch (error) {
      console.error("Firebase update failed:", error);
      return { success: false, message: `❌ Error: An unexpected error occurred while updating the database.` };
    }
  }

  // Function to link Discord user to Minecraft player (alternative approach)
  async linkDiscordUser(minecraftName, discordId) {
    try {
      const playersRef = this.db.collection('players');
      const snapshot = await playersRef.where('name', '==', minecraftName).limit(1).get();

      if (snapshot.empty) {
        return { success: false, message: `Player ${minecraftName} not found in database.` };
      }

      const playerDoc = snapshot.docs[0];
      await playerDoc.ref.update({
        discordId: discordId
      });

      return { success: true, message: `✅ Player ${minecraftName} has been linked to Discord user.` };
    } catch (error) {
      console.error("Error linking Discord user:", error);
      return { success: false, message: `❌ Error: Failed to link Discord user.` };
    }
  }

  // Function to search for players by Discord ID
  async getPlayerByDiscordId(discordId) {
    try {
      const playersRef = this.db.collection('players');
      const snapshot = await playersRef.where('discordId', '==', discordId).limit(1).get();

      if (snapshot.empty) {
        return null;
      }

      const playerDoc = snapshot.docs[0];
      return {
        id: playerDoc.id,
        ...playerDoc.data()
      };
    } catch (error) {
      console.error("Error getting player by Discord ID:", error);
      return null;
    }
  }

  // Function to search for players by name (for autocomplete)
  async searchPlayersByName(searchTerm) {
    try {
      const playersRef = this.db.collection('players');
      const snapshot = await playersRef
        .where('name', '>=', searchTerm)
        .where('name', '<=', searchTerm + '\uf8ff')
        .limit(25)
        .get();

      const players = [];
      snapshot.forEach((doc) => {
        players.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return players;
    } catch (error) {
      console.error("Error searching players:", error);
      return [];
    }
  }

  // Queue operations
  async saveQueueState(gamemode, queueData) {
    try {
      const queuesRef = this.db.collection('queues');
      const queueRef = queuesRef.doc(gamemode);
      await queueRef.set({
        ...queueData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving queue state:', error);
      return false;
    }
  }

  async getQueueState(gamemode) {
    try {
      const queuesRef = this.db.collection('queues');
      const queueRef = queuesRef.doc(gamemode);
      const queueDoc = await queueRef.get();
      
      if (queueDoc.exists) {
        return {
          id: queueDoc.id,
          ...queueDoc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting queue state:', error);
      return null;
    }
  }

  async getAllQueueStates() {
    try {
      const queuesRef = this.db.collection('queues');
      const snapshot = await queuesRef.get();
      const queues = {};
      snapshot.forEach((doc) => {
        queues[doc.id] = {
          id: doc.id,
          ...doc.data()
        };
      });
      return queues;
    } catch (error) {
      console.error('Error getting all queue states:', error);
      return {};
    }
  }

  // Test record operations
  async saveTestRecord(record) {
    try {
      const testRecordsRef = this.db.collection('testRecords');
      const newRecordRef = await testRecordsRef.add({
        ...record,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return newRecordRef.id;
    } catch (error) {
      console.error('Error saving test record:', error);
      return null;
    }
  }

  // Get all test records
  async getAllTestRecords() {
    try {
      const testRecordsRef = this.db.collection('testRecords');
      const snapshot = await testRecordsRef.get();
      
      const records = [];
      snapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return records;
    } catch (error) {
      console.error('Error getting test records:', error);
      return [];
    }
  }

  // Tester stats operations
  async saveTesterStats(testerId, stats) {
    try {
      const testersRef = this.db.collection('testers');
      const testerRef = testersRef.doc(testerId);
      
      // Get existing stats
      const testerDoc = await testerRef.get();
      let existingStats = {};
      if (testerDoc.exists) {
        existingStats = testerDoc.data();
      }
      
      // Merge stats
      const updatedStats = {
        ...existingStats,
        ...stats,
        testsConducted: (existingStats.testsConducted || 0) + (stats.testsConducted || 0),
        monthlyTests: (existingStats.monthlyTests || 0) + (stats.testsConducted || 0),
        lastTestTime: stats.lastTestTime || existingStats.lastTestTime || admin.firestore.FieldValue.serverTimestamp()
      };
      
      await testerRef.set(updatedStats, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving tester stats:', error);
      return false;
    }
  }

  // Embed management methods
  async createEmbed(embedData) {
    try {
      const embedsRef = this.db.collection('embeds');
      const newEmbedRef = await embedsRef.add({
        ...embedData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return newEmbedRef.id;
    } catch (error) {
      console.error('Error creating embed:', error);
      return null;
    }
  }

  async getEmbed(embedId) {
    try {
      const embedsRef = this.db.collection('embeds');
      const embedDoc = await embedsRef.doc(embedId).get();
      
      if (embedDoc.exists) {
        return {
          id: embedDoc.id,
          ...embedDoc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting embed:', error);
      return null;
    }
  }

  async updateEmbed(embedId, embedData) {
    try {
      const embedsRef = this.db.collection('embeds');
      await embedsRef.doc(embedId).update({
        ...embedData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating embed:', error);
      return false;
    }
  }

  async deleteEmbed(embedId) {
    try {
      const embedsRef = this.db.collection('embeds');
      await embedsRef.doc(embedId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting embed:', error);
      return false;
    }
  }

  async getAllEmbeds() {
    try {
      const embedsRef = this.db.collection('embeds');
      const snapshot = await embedsRef.get();
      
      const embeds = [];
      snapshot.forEach((doc) => {
        embeds.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return embeds;
    } catch (error) {
      console.error('Error getting all embeds:', error);
      return [];
    }
  }
}

module.exports = new FirebaseService();