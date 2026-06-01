const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static('.'));

app.post('/proxy/auth', async (req, res) => {
  const { clientId, apiKey } = req.body;
  console.log('AUTH attempt, clientId:', clientId ? clientId.slice(0,8)+'...' : 'missing');
  try {
    const r = await fetch('https://api.airwallex.com/api/v1/authentication/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-api-key': apiKey
      }
    });
    const text = await r.text();
    console.log('AUTH response status:', r.status, 'body preview:', text.slice(0,100));
    try {
      res.status(r.status).json(JSON.parse(text));
    } catch(e) {
      res.status(r.status).json({ error: 'Non-JSON response', body: text.slice(0,200) });
    }
  } catch(e) {
    console.log('AUTH fetch error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/proxy/airwallex', async (req, res) => {
  const { endpoint, token } = req.query;
  console.log('PROXY GET:', endpoint);
  try {
    const r = await fetch('https://api.airwallex.com' + endpoint, {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    const text = await r.text();
    console.log('PROXY response status:', r.status, 'preview:', text.slice(0,80));
    try {
      res.status(r.status).json(JSON.parse(text));
    } catch(e) {
      res.status(r.status).json({ error: 'Non-JSON', body: text.slice(0,200) });
    }
  } catch(e) {
    console.log('PROXY fetch error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
