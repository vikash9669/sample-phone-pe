// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import Base64 from "base-64";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_CALLBACK_URL,
} = process.env;

const PHONEPE_API_URL = "https://api.phonepe.com/apis/pg/checkout/v2/pay";

function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `TXN${random}${timestamp}`;
}

app.get("/", (req, res) => {
  return res.status(200).json({ success: true, message: "chal gaya" });
});

// Create Order Route
app.post("/create-order", async (req, res) => {
  try {
    const { amount, merchantUserId } = req.body;

    if (!amount || !merchantUserId) {
      return res.status(400).json({ error: "Missing amount or user ID" });
    }

    const transactionId = generateTransactionId();

    // const requestBody_old = {
    //   merchantId: PHONEPE_MERCHANT_ID,
    //   merchantTransactionId: transactionId,
    //   merchantUserId,
    //   amount: parseInt(amount),
    //   callbackUrl: PHONEPE_CALLBACK_URL,
    //   paymentInstrument: {
    //     type: 'PAY_PAGE',
    //   },
    // };

    const requestBody = {
      merchantOrderId: transactionId,
      amount: parseInt(amount),
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: "Payment message used for collect requests",
        merchantUrls: {
          redirectUrl: "https://www.healersmeet.com/",
        },
      },
    };

    console.log(JSON.stringify(requestBody, null, 2));

    const payload = JSON.stringify(requestBody);
    const payloadBase64 = Base64.encode(payload);

    const dataToHash = `${payloadBase64}/pg/v1/pay${PHONEPE_SALT_KEY}`;
    const sha256Hash = crypto
      .createHash("sha256")
      .update(dataToHash)
      .digest("hex");
    const xVerify = `${sha256Hash}###${PHONEPE_SALT_INDEX}`;

    const headers = {
      "Content-Type": "application/json",
      Authorization:
        "O-Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJpZGVudGl0eU1hbmFnZXIiLCJ2ZXJzaW9uIjoiNC4wIiwidGlkIjoiZTdhMGI2OGUtMjVjZS00MDc2LTliNGUtMWQ4MDlhMzEzZDdlIiwic2lkIjoiZTAxY2YwMzAtM2FlMS00Y2IxLWJlZDYtOTNjZjliNTQzZWE3IiwiaWF0IjoxNzUxMzgzMzg4LCJleHAiOjE3NTEzODY5ODh9.wLfM5bIg8aFiS6hg3zMy5Rwj8kU6_8LeB7sWNRAl-BEGOufxcLYGzEjhcQutMHq3YCZCta_EiTI7qDk9JGKG9A",
    };

    //	  console.log("Request paylod: ", JSON.stringify(JSON.parse(Buffer.from(payloadBase64).toString('utf8')), null, 2))

    const phonePeResponse = await axios.post(PHONEPE_API_URL, requestBody, {
      headers,
    });

    console.log("PhonePe response:", phonePeResponse.data);

    return res.json({
      payloadBase64,
      checksum: xVerify,
      transactionId,
      responseData: phonePeResponse.data,
    });
  } catch (err) {
    console.error("Error creating order:", err);
    console.log("error resp dta: ", err?.response?.data);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
