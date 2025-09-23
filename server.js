import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== CONFIG =====
const CFG = {
  MID: process.env.AZUL_MERCHANT_ID || '39402060016',
  MNAME: process.env.AZUL_MERCHANT_NAME || 'UNIVERSAL FITNESS ECOM',
  MTYPE: process.env.AZUL_MERCHANT_TYPE || 'MerchantType',
  CCODE: process.env.AZUL_CURRENCY_CODE || '214', // ← Esto puede ser "214" o "RD$" según configuración de AZUL
  KEY: process.env.AZUL_AUTH_KEY || 'ExgdHfSFJTuRBQCnIUNdrdVfcatDazTCrsSDpuJPtHnHzXwEgOaEkrNvSgWkbiXdfnmuanzqadgqtusmrputcbnhtyssvnkawygpljrsictuccpxfetrwpkbvgcjhrig',
  PAGE: 'https://pagos.azul.com.do/PaymentPage/Default.aspx',
  RETURN: process.env.AZUL_RETURN_URL || 'https://universalfitness.com.do/azul-response/'
};

const TOKENS = new Map();
const toMinor = n => Math.round(Number(n) * 100).toString();
const h512 = (s, key) => crypto.createHmac('sha512', key).update(s, 'utf8').digest('hex');

function buildRequestHash(p) {
  const concat = [
    p.MerchantId, p.MerchantName, p.MerchantType, p.CurrencyCode,
    p.OrderNumber, p.Amount, p.ITBIS,
    p.ApprovedUrl, p.DeclinedUrl, p.CancelUrl,
    '', '', '', '', '', '', CFG.KEY
  ].join('');
  return h512(concat, CFG.KEY);
}

// 1) Crear link desde Voiceflow u otro
app.post('/vf/azul/create-link', (req, res) => {
  const { orderId, amount, itbis = 0 } = req.body || {};
  if (!orderId || !amount) return res.status(400).json({ error: 'orderId y amount son obligatorios' });
  if (!CFG.KEY) return res.status(500).json({ error: 'AZUL_AUTH_KEY no configurada' });

  const token = uuidv4();
  TOKENS.set(token, {
    orderId,
    amountMinor: toMinor(amount),
    itbisMinor: toMinor(itbis),
    expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutos
  });

  const origin = `https://${req.headers.host}`;
  const pay_url = `${origin}/pay/${token}`;
  res.json({ pay_url });
});

// 2) Página de redirección a Azul con form auto-submit
app.get('/pay/:token', (req, res) => {
  const data = TOKENS.get(req.params.token);
  if (!data || Date.now() > data.expiresAt) {
    return res.status(410).send('Este enlace expiró. Solicita uno nuevo.');
  }

  const payload = {
    MerchantId: CFG.MID,
    MerchantName: CFG.MNAME,
    MerchantType: CFG.MTYPE,
    CurrencyCode: CFG.CCODE,
    OrderNumber: data.orderId,
    Amount: data.amountMinor,
    ITBIS: data.itbisMinor,
    ApprovedUrl: CFG.RETURN,
    DeclinedUrl: CFG.RETURN,
    CancelUrl: CFG.RETURN
  };
  payload.AuthHash = buildRequestHash(payload);

  const inputs = Object.entries(payload)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v)}">`) 
    .join('\n');

  const html = `
  <!doctype html>
  <html>
    <head><meta charset="utf-8"><title>Conectando con AZUL…</title></head>
    <body onload="document.forms[0].submit()">
      <form action="${CFG.PAGE}" method="post">
        ${inputs}
        <noscript><button type="submit">Pagar</button></noscript>
      </form>
    </body>
  </html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Health check (opcional)
app.get('/health', (_, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('UF AZUL server on :' + PORT));
