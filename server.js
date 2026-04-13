require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mqtt = require('mqtt');
const axios = require('axios');
const dns = require('dns'); // 👈 The Navigator

// --- 1. BYPASS ISP BLOCKS ---
// Layman: This tells the server "Don't use the local slow maps, use Google's fast maps to find our Vault."
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.use(cors());
app.use(express.json());

// --- 2. THE VAULT (Database) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ VAULT: Connected to MongoDB Atlas"))
  .catch(err => console.log("❌ VAULT ERROR:", err));

const Log = mongoose.model('MotionEvent', new mongoose.Schema({
  device: String,
  action: String,
  timestamp: { type: Date, default: Date.now }
}), 'MotionEvents');

// --- 3. THE RADIO OPERATOR (MQTT) ---
const mqttClient = mqtt.connect('mqtt://leopard.lmq.cloudamqp.com', {
    username: process.env.MQTT_USER, 
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 1000
});

mqttClient.on('connect', () => {
    console.log("📡 RADIO: Online and listening to CloudAMQP");
    mqttClient.subscribe("mqtt/"); 
});

// --- 4. THE SECRETARY (The Automation Brain) ---
mqttClient.on('message', async (topic, message) => {
    const payload = message.toString();
    
    if (topic === "mqtt/" && payload.includes("Motion")) {
        console.log(`📩 RECEIVED: ${payload}`);

        try {
            // STEP A: File the log
            const newLog = new Log({
                device: "MOHZTEC_V2",
                action: payload,
                timestamp: new Date()
            });
            await newLog.save();
            console.log("✍️ VAULT: Log filed successfully.");

            // STEP B: Send Telegram using Axios (The Cloud Phone)
            const token = "8712705004:AAHqmMGNeMh3V5paK0CJIoOajW8S86u446g";
            const chat_id = "6644491901";
            const url = `https://api.telegram.org/bot{token}/sendMessage?chat_id={chat_id}`;
            
            await axios.get(url, {
                params: { chat_id: chat_id, text: `🚨 ALERT: ${payload}` }
            });
            console.log("🚀 TELEGRAM: Alert dispatched!");

        } catch (err) {
            console.log("❌ PROCESS ERROR:", err.message);
        }
    }
});

// --- 5. THE FRONT DESK (API Routes) ---
app.post('/api/login', (req, res) => {
  if (req.body.password === process.env.DASHBOARD_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get('/api/data', async (req, res) => {
  try {
    const logs = await Log.find({ action: /motion/i }).sort({ timestamp: -1 }).limit(10);
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

app.post('/api/trigger', (req, res) => {
    const { state } = req.body;
    mqttClient.publish('commands/alarm', state);
    console.log(`📡 COMMAND: Siren ${state}`);
    res.json({ success: true });
});

// --- 6. POWER ON ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 FACTORY: Running on Port ${PORT}`));


