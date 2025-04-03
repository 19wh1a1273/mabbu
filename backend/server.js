require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Enhanced MongoDB Connection
const uri = process.env.MONGODB_URI.includes('?')
  ? `${process.env.MONGODB_URI}&directConnection=true`
  : `${process.env.MONGODB_URI}?directConnection=true`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000, // 10 seconds timeout
  socketTimeoutMS: 45000, // 45 seconds socket timeout
});

let db;
let contactsCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME);
    contactsCollection = db.collection('contacts');
    
    // Verify connection
    await db.command({ ping: 1 });
    console.log('Successfully connected to MongoDB Atlas!');
    
    // Create indexes
    await Promise.all([
      contactsCollection.createIndex({ email: 1 }, { unique: true }),
      contactsCollection.createIndex({ createdAt: -1 })
    ]);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    
    // More detailed error handling
    if (err.name === 'MongoServerSelectionError') {
      console.error('Network/DNS issue detected. Please check:');
      console.error('1. Your internet connection');
      console.error('2. MongoDB Atlas IP whitelist settings');
      console.error('3. DNS resolution (try Google DNS: 8.8.8.8)');
    }
    
    process.exit(1);
  }
}

// Initialize connection immediately
connectDB();

// Enhanced Contact Form Route
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, favDestination, message, profilePic } = req.body;
    
    // Validation
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ 
        error: 'Name, email, and message are required fields' 
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }

    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      favDestination: favDestination?.trim() || 'Not specified',
      message: message.trim(),
      profilePic: profilePic || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await contactsCollection.insertOne(contactData);
    
    res.status(201).json({
      success: true,
      message: 'Thank you for your submission!',
      data: {
        insertedId: result.insertedId,
        timestamp: contactData.createdAt
      }
    });
  } catch (err) {
    console.error('Submission error:', err);
    
    if (err.code === 11000) {
      return res.status(409).json({ 
        error: 'This email has already been submitted' 
      });
    }
    
    res.status(500).json({ 
      error: 'Our servers are busy. Please try again later.' 
    });
  }
});

// GET contacts endpoint with improved error handling
app.get('/api/contacts', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 100) || 20;
    const parsedPage = Math.max(parseInt(page), 1) || 1;
    const skip = (parsedPage - 1) * parsedLimit;
    
    const [contacts, totalCount] = await Promise.all([
      contactsCollection.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .toArray(),
      contactsCollection.estimatedDocumentCount()
    ]);
    
    res.json({
      success: true,
      data: contacts,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(totalCount / parsedLimit)
      }
    });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ 
      error: 'Failed to retrieve contacts',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Production static file serving
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Enhanced health check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await client.db().admin().ping();
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date(),
      dbStatus: dbStatus.ok === 1 ? 'connected' : 'degraded',
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Server startup with connection verification
const server = app.listen(port, async () => {
  try {
    await client.db().admin().ping();
    console.log(`Server running on port ${port}`);
    console.log('Database connection verified');
  } catch (err) {
    console.error('Startup verification failed:', err);
    process.exit(1);
  }
});

// Graceful shutdown with improved logging
const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
shutdownSignals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    
    try {
      await Promise.race([
        (async () => {
          await client.close();
          console.log('MongoDB connection closed');
        })(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Shutdown timeout')), 5000)
        )
      ]);
      
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    } catch (err) {
      console.error('Shutdown error:', err);
      process.exit(1);
    }
  });
});