// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import Base64 from "base-64";
import axios from "axios";
import qs from "qs";

dotenv.config();
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SALT_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_CALLBACK_URL,
  PHONEPE_MERCHANT_USER_ID,
} = process.env;

const PHONEPE_API_URL_AUTH =
  "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
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

    const data = qs.stringify({
      client_id: PHONEPE_MERCHANT_USER_ID,
      client_version: "1",
      client_secret: PHONEPE_SALT_INDEX,
      grant_type: "client_credentials",
    });

    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const transactionId = generateTransactionId();

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
        `O-Bearer ${response.data.access_token}`,
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
