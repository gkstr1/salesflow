require('dotenv').config();
const path = require('path');
const express = require('express');
const app = require('./app');
const { seedDatabase } = require('./db/seeds');

const PORT = process.env.PORT || 3001;
const DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist');

// Serve built React app (local dev only — Netlify handles this in production)
app.use(express.static(DIST_DIR));
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Seed DB then start
seedDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`SalesFlow AI running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
