require('dotenv').config(); // Load environment variables
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

console.log('Loaded MONGO_URI:', process.env.MONGO_URI);

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let messagesCollection;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB and set the collection
async function connectDB() {
  try {
    await client.connect();
    const db = client.db('whatsapp');
    messagesCollection = db.collection('messages');
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// Middleware to ensure DB collection is ready
function ensureCollection(req, res, next) {
  if (!messagesCollection) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  next();
}

app.use(ensureCollection);

// Insert JSON payload files from the payloads folder into the DB
async function insertPayloadFiles() {
  if (!messagesCollection) {
    console.error('Messages collection is not initialized. Skipping payload insert.');
    return;
  }

  const payloadsDir = path.join(__dirname, 'payloads');

  try {
    const files = fs.readdirSync(payloadsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(payloadsDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(data);

        if (json.id) {
          const existing = await messagesCollection.findOne({ id: json.id });
          if (existing) {
            console.log(`Skipping ${file}: message with id ${json.id} already exists`);
            continue;
          }
        }

        await messagesCollection.insertOne(json);
        console.log(`Inserted ${file} successfully`);
      }
    }
  } catch (err) {
    console.error('Error inserting payload files:', err);
  }
}

// GET all messages
app.get('/messages', async (req, res) => {
  try {
    const messages = await messagesCollection.find().toArray();
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ✅ GET messages by conversationId
app.get('/messages/conversation/:id', async (req, res) => {
  const convId = req.params.id;
  try {
    const messages = await messagesCollection.find({ conversationId: convId }).toArray();
    res.json(messages);
  } catch (err) {
    console.error('Error fetching conversation messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST new message
app.post('/messages', async (req, res) => {
  try {
    const message = req.body;
    console.log('Received message to save:', message);

    if (!message.id) {
      return res.status(400).json({ error: 'Message id is required' });
    }

    const existing = await messagesCollection.findOne({ id: message.id });
    if (existing) {
      return res.status(409).json({ error: 'Message ID already exists' });
    }

    await messagesCollection.insertOne(message);
    res.status(201).json({ message: 'Message saved successfully' });
  } catch (err) {
    console.error('Error saving message:', err);
    res.status(500).json({ error: 'Failed to save message', details: err.message });
  }
});

// PUT update message status by message id
app.put('/messages/status/:id', async (req, res) => {
  const messageId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required in the body' });
  }

  try {
    console.log(`Updating message ID: ${messageId} with status: ${status}`);
    const result = await messagesCollection.updateOne(
      { id: messageId },
      { $set: { status } }
    );
    console.log('Mongo update result:', result);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
});

// Start server and initialize DB + insert payloads
app.listen(port, async () => {
  await connectDB();
  await insertPayloadFiles();
  console.log(`🚀 Server running at http://localhost:${port}`);
});
