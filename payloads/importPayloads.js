const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('❌ MONGO_URI is not defined in your .env file');
  process.exit(1);
}

const client = new MongoClient(uri);

async function importPayloads() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('whatsapp'); // change if your DB name is different
    const messagesCollection = db.collection('messages');

    if (!messagesCollection) {
      console.error('❌ messagesCollection is undefined!');
      process.exit(1);
    }

    const payloadsDir = path.join(__dirname, 'payloads');

    if (!fs.existsSync(payloadsDir)) {
      console.error(`❌ Payloads directory not found: ${payloadsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(payloadsDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(payloadsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Make sure data.id exists, or change the field you want to check for uniqueness
        if (!data.id) {
          console.warn(`⚠️  Skipping ${file} because it has no 'id' field`);
          continue;
        }

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
  } catch (err) {
    console.error('❌ Error importing payloads:', err);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

importPayloads();
