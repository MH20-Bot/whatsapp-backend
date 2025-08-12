require('dotenv').config(); // Load environment variables

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let messagesCollection;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB and setup the collection
async function connectDB() {
  try {
    await client.connect();
    const db = client.db('whatsapp');
    messagesCollection = db.collection('messages');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}

// Insert payload files from the /payloads folder
async function insertPayloadFiles() {
  const payloadsDir = path.join(__dirname, 'payloads');

  try {
    const files = fs.readdirSync(payloadsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(payloadsDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(data);

        if (json.id) {
          const exists = await messagesCollection.findOne({ id: json.id });
          if (exists) {
            console.log(`⏭️ Skipping ${file}: ID ${json.id} already exists`);
            continue;
          }
        }

        await messagesCollection.insertOne(json);
        console.log(`✅ Inserted ${file}`);
      }
    }
  } catch (err) {
    console.error('❌ Error inserting payloads:', err);
  }
}

// Get all messages
app.get('/messages', async (req, res) => {
  try {
    const messages = await messagesCollection.find().toArray();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Save a new message
app.post('/messages', async (req, res) => {
  try {
    const message = req.body;

    if (!message.id) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const exists = await messagesCollection.findOne({ id: message.id });
    if (exists) {
      return res.status(409).json({ error: 'Message ID already exists' });
    }

    await messagesCollection.insertOne(message);
    res.status(201).json({ message: 'Message saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Update message status
app.put('/messages/status/:id', async (req, res) => {
  const messageId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required in the request body' });
  }

  try {
    const result = await messagesCollection.updateOne(
      { id: messageId },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Start server
app.listen(port, async () => {
  await connectDB();
  await insertPayloadFiles();
  console.log(`🚀 Server running at http://localhost:${port}`);
});
