require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

// WRITE: create one note
app.post('/api/note', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: 'title and content are required',
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO notes (title, content) VALUES (?, ?)',
      [title, content]
    );

    res.status(201).json({
      message: 'Note created',
      id: result.insertId,
    });
  } catch (error) {
    console.error('POST /api/note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// READ: get one note by id
app.get('/api/note', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        error: 'id query parameter is required',
      });
    }

    const [rows] = await pool.execute(
      'SELECT id, title, content, created_at FROM notes WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('GET /api/note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});