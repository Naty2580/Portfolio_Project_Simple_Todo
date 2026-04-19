import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pool from './db.js';
import auth from './middleware/auth.js';

dotenv.config();

const app = express();

// Add after app initialization
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); 
}

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 150 }));
app.use(express.json());
app.use(cookieParser());

const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:5173';
app.use(cors({ 
  origin: frontendUrl, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.post('/api/auth/register',
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { username, password } = req.body;
      const hashed = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
        [username, hashed]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(400).json({ error: 'Username taken' });
    }
  }
);

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict' 
    });
    res.json({ id: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
  });
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/todos', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos WHERE user_id = $1 ORDER BY position ASC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/todos', auth, body('title').notEmpty(), async (req, res) => {
  try {
    const { title } = req.body;
    const maxPosRes = await pool.query('SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM todos WHERE user_id = $1', [req.user.id]);
    const result = await pool.query(
      'INSERT INTO todos (user_id, title, position, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, title, maxPosRes.rows[0].next_pos, '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/todos/:id', auth, async (req, res) => {
  try {
    const { completed, notes } = req.body;
    let query = 'UPDATE todos SET ';
    const values = [];
    let index = 1;

    if (typeof completed === 'boolean') {
      query += `completed = $${index}, `;
      values.push(completed);
      index++;
    }
    if (typeof notes === 'string') {
      query += `notes = $${index}, `;
      values.push(notes);
      index++;
    }

    if (values.length === 0) return res.status(400).json({ error: 'No data provided' });

    query = query.slice(0, -2) + ` WHERE id = $${index} AND user_id = $${index + 1} RETURNING *`;
    values.push(req.params.id, req.user.id);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/todos/reorder', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { items } = req.body;
    await client.query('BEGIN');
    for (const item of items) {
      await client.query('UPDATE todos SET position = $1 WHERE id = $2 AND user_id = $3', [item.position, item.id, req.user.id]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

app.delete('/api/todos/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend on ${PORT}`));
