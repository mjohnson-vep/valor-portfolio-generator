const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes');
const { requireBasicAuth } = require('./src/requireBasicAuth');

const app = express();
const PORT = process.env.PORT || 4000;

// Restrict to the deployed frontend origin in production via CORS_ORIGIN
// (comma-separated if you need more than one); defaults to allow-all for local dev.
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : '*';
// Content-Disposition must be explicitly exposed — CORS hides all but a small
// safelist of response headers from client JS by default, and the frontend
// reads this one to name the downloaded .pptx file.
app.use(cors({ origin: corsOrigin, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '2mb' }));

app.use('/api', requireBasicAuth, apiRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Valor Portfolio Generator API listening on port ${PORT}`);
});
