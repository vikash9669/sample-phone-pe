// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Base64 from 'base-64';
import axios from 'axios';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_CALLBACK_URL,
} = process.env;

const PHONEPE_API_URL = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';

function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `TXN${random}${timestamp}`;
}

// Create Order Route
app.post('/create-order', async (req, res) => {
  try {
    const { amount, merchantUserId } = req.body;

    if (!amount || !merchantUserId) {
      return res.status(400).json({ error: 'Missing amount or user ID' });
    }

    const transactionId = generateTransactionId();

    const requestBody = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId,
      amount: parseInt(amount),
      callbackUrl: PHONEPE_CALLBACK_URL,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const payload = JSON.stringify(requestBody);
    const payloadBase64 = Base64.encode(payload);

    const dataToHash = `${payloadBase64}/pg/v1/pay${PHONEPE_SALT_KEY}`;
    const sha256Hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    const xVerify = `${sha256Hash}###${PHONEPE_SALT_INDEX}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerify,
    };

    const phonePeResponse = await axios.post(PHONEPE_API_URL, {
      request: payloadBase64,
    }, { headers });

    console.log('PhonePe response:', phonePeResponse.data);

    if (phonePeResponse.data.success !== true) {
      return res.status(400).json({
        error: 'PhonePe order creation failed',
        response: phonePeResponse.data,
      });
    }

    return res.json({
      payloadBase64,
      checksum: xVerify,
      transactionId,
    });
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
