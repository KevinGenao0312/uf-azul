// Dentro del handler de /pay/:id justo antes de construir el body para AZUL
function toNumberOr(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

// 1) Toma del body o de env; fuerza 214 si viene mal
const currencyCode =
  toNumberOr(linkPayload.currencyCode, null) ??
  toNumberOr(process.env.AZUL_CURRENCY_CODE, 214);

// 2) MerchantType por defecto 'C'
const merchantType = (linkPayload.merchantType || process.env.AZUL_MERCHANT_TYPE || 'C').toString();

// 3) Monto en decimal con 2 decimales (según tu implementación).
const amount = Number(linkPayload.amount).toFixed(2);

// 4) Construye el payload a PaymentPage de AZUL **con CurrencyCode numérico**
const azulPayload = {
  OrderNumber: linkPayload.orderId,      // o como lo llames internamente
  Amount: amount,                        // "1500.00"
  CurrencyCode: currencyCode,            // 214  <- CLAVE
  MerchantType: merchantType,            // "C"
  ApprovedUrl: process.env.AZUL_APPROVED_URL,
  DeclinedUrl: process.env.AZUL_DECLINED_URL,
  CancelUrl: process.env.AZUL_CANCEL_URL,
  // ... cualquier otro campo requerido por tu implementación
};

// OPCIONAL: log seguro para depurar (sin claves)
console.log('AZUL payload =>', {
  OrderNumber: azulPayload.OrderNumber,
  Amount: azulPayload.Amount,
  CurrencyCode: azulPayload.CurrencyCode,
  MerchantType: azulPayload.MerchantType
});
