import express from 'express';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// In-memory store for demo links
const links = {};

// Utilidad segura para convertir valores numéricos
function safeDecimal(val, fallback = '0.00') {
  const num = Number(val);
  return isNaN(num) ? fallback : num.toFixed(2);
}

// Crear enlace de pago desde Voiceflow u otro cliente
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

  res.json({
    pay_url: `${process.env.BASE_URL || `http://localhost:${PORT}`}/pay/${id}`
  });
});

// Redirección a AZUL con los datos normalizados
app.get('/pay/:id', (req, res) => {
  const data = links[req.params.id];

  if (!data) {
    return res.status(404).send('Link not found');
  }

  const azulPayload = {
    MerchantId: process.env.AZUL_MERCHANT_ID,
    MerchantType: data.merchantType,
    CurrencyCode: data.currencyCode,
    OrderNumber: data.orderId,
    Amount: data.amount,
    ApprovedUrl: process.env.AZUL_APPROVED_URL,
    DeclinedUrl: process.env.AZUL_DECLINED_URL,
    CancelUrl: process.env.AZUL_CANCEL_URL
  };

  console.log('AZUL payload =>', azulPayload);

  // Redirigir a página de pago (aquí puedes construir el form POST real si lo deseas)
  res.json({
    message: 'Simulación de payload enviado a AZUL',
    payload: azulPayload
  });
});

// Endpoint de prueba para validar directamente con datos fijos
app.get('/test/azul', (req, res) => {
  const testPayload = {
    MerchantId: process.env.AZUL_MERCHANT_ID,
    MerchantType: 'C',
    CurrencyCode: '214',
    OrderNumber: 'TEST123',
    Amount: '100.00',
    ApprovedUrl: process.env.AZUL_APPROVED_URL,
    DeclinedUrl: process.env.AZUL_DECLINED_URL,
    CancelUrl: process.env.AZUL_CANCEL_URL
  };

  console.log('TEST PAYLOAD =>', testPayload);

  res.json({
    message: 'Payload de prueba para AZUL',
    payload: testPayload
  });
});

app.listen(PORT, () => {
  console.log(`AZUL PaymentLink server running on port ${PORT}`);
});
