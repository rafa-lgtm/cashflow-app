const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

// Proxy para Airwallex
app.post('/proxy/auth', async (req, res) => {
  try {
    const { clientId, apiKey } = req.body;
    const r = await fetch('https://api.airwallex.com/api/v1/authentication/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-id': clientId, 'x-api-key': apiKey }
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/proxy/airwallex', async (req, res) => {
  try {
    const { endpoint, token } = req.query;
    const r = await fetch('https://api.airwallex.com' + endpoint, {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
