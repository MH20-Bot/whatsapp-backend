const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function importPayloads() {
  try {
    await client.connect();
    const db = client.db('whatsapp');
    const messagesCollection = db.collection('messages');

    const payloadsDir = path.join(__dirname, 'payloads');
    const files = fs.readdirSync(payloadsDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(payloadsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Check if this data already exists to avoid duplicates
        const exists = await messagesCollection.findOne({ id: data.id });
        if (!exists) {
          await messagesCollection.insertOne(data);
          console.log(`Inserted: ${file}`);
        } else {
          console.log(`Skipped (already exists): ${file}`);
        }
      }
    }

    console.log('✅ Finished importing payloads');
    await client.close();
  } catch (err) {
    console.error('Error importing payloads:', err);
  }
}

importPayloads();
