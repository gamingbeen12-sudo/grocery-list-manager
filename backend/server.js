require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Normalize phone to E.164 if missing country code
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned.startsWith('+')) {
    // Default to +91 if 10-digit Indian number, else prepend +
    if (/^\d{10}$/.test(cleaned)) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

// -------------------------------------------------------------
// Endpoint 1: POST /api/auth/send-otp
// Send OTP via Minimoth API
// -------------------------------------------------------------
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const rawPhone = req.body?.phone;
    if (!rawPhone || typeof rawPhone !== 'string') {
      return res.status(400).json({ error: 'Valid phone number is required.' });
    }

    const phone = normalizePhone(rawPhone);
    const apiKey = process.env.MINIMOTH_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'MINIMOTH_API_KEY is not configured in backend environment.' });
    }

    const response = await axios.post(
      'https://api.minimoth.dev/v1/otp/send',
      { phone },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      }
    );

    return res.status(200).json({
      message: 'OTP sent successfully via Minimoth.',
      phone,
      otpId: response.data?.otp_id || null
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Failed to send OTP via Minimoth.';
    console.error('[Send OTP Error]:', status, msg);
    return res.status(status).json({ error: msg });
  }
});

// -------------------------------------------------------------
// Endpoint 2: POST /api/auth/verify-otp
// Verify OTP with Minimoth & register/login user
// -------------------------------------------------------------
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone: rawPhone, code } = req.body || {};
    if (!rawPhone || !code) {
      return res.status(400).json({ error: 'Both phone and 6-digit OTP code are required.' });
    }

    const phone = normalizePhone(rawPhone);
    const apiKey = process.env.MINIMOTH_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'MINIMOTH_API_KEY is not configured in backend environment.' });
    }

    const response = await axios.post(
      'https://api.minimoth.dev/v1/otp/verify',
      { phone, code: String(code).trim() },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      }
    );

    // Verify response success (Minimoth returns 200 with tokens or verified: true)
    if (response.status === 200) {
      let user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({ data: { phone } });
      }

      return res.status(200).json({
        message: 'Authentication successful.',
        user: {
          id: user.id,
          phone: user.phone
        },
        token: response.data?.access_token || null
      });
    }

    return res.status(401).json({ error: 'Invalid or expired OTP code.' });
  } catch (err) {
    const status = err.response?.status || 500;
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      'Invalid or expired OTP code.';
    console.error('[Verify OTP Error]:', status, msg);
    return res.status(status === 200 ? 401 : status).json({ error: msg });
  }
});

// -------------------------------------------------------------
// Endpoint 3: GET /api/lists
// Fetch all grocery lists for a given user (including items)
// -------------------------------------------------------------
app.get('/api/lists', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ error: 'A valid numeric userId is required.' });
    }

    const lists = await prisma.list.findMany({
      where: { userId: Number(userId) },
      include: {
        items: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(lists);
  } catch (err) {
    console.error('[Get Lists Error]:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve grocery lists.' });
  }
});

// -------------------------------------------------------------
// Endpoint 4: POST /api/lists
// Create a new grocery list
// -------------------------------------------------------------
app.post('/api/lists', async (req, res) => {
  try {
    const { userId, title } = req.body || {};
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ error: 'A valid numeric userId is required.' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'List title is required.' });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const list = await prisma.list.create({
      data: {
        userId: Number(userId),
        title: title.trim()
      },
      include: {
        items: true
      }
    });

    return res.status(201).json(list);
  } catch (err) {
    console.error('[Create List Error]:', err.message);
    return res.status(500).json({ error: 'Failed to create grocery list.' });
  }
});

// -------------------------------------------------------------
// Endpoint 5: POST /api/items
// Add a new grocery item to a list
// -------------------------------------------------------------
app.post('/api/items', async (req, res) => {
  try {
    const { listId, name, quantity } = req.body || {};
    if (!listId || isNaN(Number(listId))) {
      return res.status(400).json({ error: 'A valid numeric listId is required.' });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required.' });
    }

    // Verify list exists
    const list = await prisma.list.findUnique({ where: { id: Number(listId) } });
    if (!list) {
      return res.status(404).json({ error: 'Grocery list not found.' });
    }

    const item = await prisma.item.create({
      data: {
        listId: Number(listId),
        name: name.trim(),
        quantity: quantity && typeof quantity === 'string' ? quantity.trim() : null
      }
    });

    return res.status(201).json(item);
  } catch (err) {
    console.error('[Add Item Error]:', err.message);
    return res.status(500).json({ error: 'Failed to add grocery item.' });
  }
});

// Health check / root
app.get('/', (req, res) => {
  res.json({ message: 'Grocery List Manager Backend API is running.', endpoints: ['/api/auth/send-otp', '/api/auth/verify-otp', '/api/lists', '/api/items'] });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
