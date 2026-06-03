const express = require('express');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const app = express();
app.use(express.json());

// ─── Proteccion por contraseña (Basic Auth) ───
// Protege TODO: la pagina y las llamadas al proxy.
const APP_PASSWORD = process.env.APP_PASSWORD;
const APP_USER = process.env.APP_USER || 'admin';

if (APP_PASSWORD) {
  app.use((req, res, next) => {
    const auth = req.headers.authorization || '';
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString();
      const idx = decoded.indexOf(':');
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      if (user === APP_USER && pass === APP_PASSWORD) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="CashFlow"');
    return res.status(401).send('Autenticacion requerida');
  });
} else {
  console.warn('AVISO: APP_PASSWORD no configurada — la app esta SIN proteger');
}

// Archivos estaticos (despues del auth, para que tambien esten protegidos)
app.use(express.static('.'));

// ─── Proxy Oxylabs (IP fija en whitelist de Airwallex) ───
const { PROXY_HOST, PROXY_PORT, PROXY_USER, PROXY_PASS } = process.env;
let agent;
if (PROXY_HOST && PROXY_PORT) {
  const a = (PROXY_USER && PROXY_PASS)
    ? encodeURIComponent(PROXY_USER) + ':' + encodeURIComponent(PROXY_PASS) + '@' : '';
  agent = new HttpsProxyAgent('http://' + a + PROXY_HOST + ':' + PROXY_PORT);
}

const AWX_CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID;
const AWX_API_KEY = process.env.AIRWALLEX_API_KEY;
const AWX_ACCOUNT_ID = process.env.AIRWALLEX_ACCOUNT_ID;

app.post('/proxy/auth', async (req, res) => {
  const clientId = req.body.clientId || AWX_CLIENT_ID;
  const apiKey = req.body.apiKey || AWX_API_KEY;
  console.log('AUTH attempt via proxy:', agent ? 'YES' : 'NO');
  try {
    const r = await fetch('https://api.airwallex.com/api/v1/authentication/login', {
      method: 'POST', agent,
      headers: { 'Content-Type': 'application/json', 'x-client-id': clientId, 'x-api-key': apiKey }
    });
    const text = await r.text();
    console.log('AUTH status:', r.status);
    try { res.status(r.status).json(JSON.parse(text)); }
    catch(e) { res.status(r.status).json({ error: 'Non-JSON', body: text.slice(0,200) }); }
  } catch(e) {
    console.log('AUTH error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/proxy/airwallex', async (req, res) => {
  const { endpoint, token } = req.query;
  console.log('PROXY GET:', endpoint);
  try {
    const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
    if (AWX_ACCOUNT_ID) headers['x-account-id'] = AWX_ACCOUNT_ID;
    const r = await fetch('https://api.airwallex.com' + endpoint, { agent, headers });
    const text = await r.text();
    console.log('PROXY status:', r.status);
    try { res.status(r.status).json(JSON.parse(text)); }
    catch(e) { res.status(r.status).json({ error: 'Non-JSON', body: text.slice(0,200) }); }
  } catch(e) {
    console.log('PROXY error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/proxy/config', (req, res) => {
  res.json({ hasCredentials: !!(AWX_CLIENT_ID && AWX_API_KEY) });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Server running on port ' + PORT
  + (agent ? ' (proxy ON)' : ' (proxy OFF)')
  + (APP_PASSWORD ? ' (password ON)' : ' (password OFF)')));
