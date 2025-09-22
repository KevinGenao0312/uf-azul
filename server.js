import express from 'express';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.json());

const links = {};

function safeDecimal(val, fallback = '0.00') {
  const num = Number(val);
  return isNaN(num) ? fallback : num.toFixed(2);
}

// Crea link desde Voiceflow
app.post('/vf/azul/create-link', (req, res) => {
  const {
    orderId = uuidv4(),
    amount = 0,
    itbis = 0,
    currencyCode,
    merchantType
  } = req.body;

  const id = uuidv4();

  links[id] = {
    orderId: orderId.toString().trim(),
    amount: safeDecimal(amount),
    itbis: safeDecimal(itbis),
    currencyCode: (currencyCode || process.env.AZUL_CURRENCY_CODE || '214').toString().trim(),
    merchantType: (merchantType || process.env.AZUL_MERCHANT_TYPE || 'C').toString().trim()
  };

  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    return res.status(500).json({ error: 'BASE_URL not set in environment' });
  }

  res.json({
    pay_url: `${baseUrl}/pay/${id}`
  });
});

// Endpoint de redirección real a AZUL (form auto-submit)
app.get('/pay/:id', (req, res) => {
  const data = links[req.params.id];

  if (!data) return res.status(404).send('Link not found');

  const azulPayload = {
    MerchantId: process.env.AZUL_MERCHANT_ID,
    MerchantType: data.merchantType,
    CurrencyCode: data.currencyCode,
    OrderNumber: data.orderId,
    Amount: data.amount,
    ApprovedUrl: process.env.AZUL_RETURN_URL,
    DeclinedUrl: process.env.AZUL_RETURN_URL,
    CancelUrl: process.env.AZUL_RETURN_URL
  };

  console.log('AZUL payload =>', azulPayload);

  const azulURL = 'https://sandbox.azul.com.do/webservices/PaymentPage.aspx';

  const formHtml = `
    <html>
      <body onload="document.forms[0].submit()">
        <form action="${azulURL}" method="post">
          ${Object.entries(azulPayload)
            .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`)
            .join('\n')}
          <noscript><button type="submit">Click para pagar</button></noscript>
        </form>
      </body>
    </html>
  `;

  res.send(formHtml);
});

// Test de debug
app.get('/test/azul', (req, res) => {
  const testPayload = {
    MerchantId: process.env.AZUL_MERCHANT_ID,
    MerchantType: 'C',
    CurrencyCode: '214',
    OrderNumber: 'TEST123',
    Amount: '100.00',
    ApprovedUrl: process.env.AZUL_RETURN_URL,
    DeclinedUrl: process.env.AZUL_RETURN_URL,
    CancelUrl: process.env.AZUL_RETURN_URL
  };

  console.log('TEST PAYLOAD =>', testPayload);
  res.json({ message: 'Payload de prueba para AZUL', payload: testPayload });
});

app.listen(PORT, () => {
  console.log(`AZUL PaymentLink server running on port ${PORT}`);
});
