require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const mqtt = require('mqtt');

// 1. BYPASS ISP BLOCKS
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
app.use(cors());
app.use(express.json());

// 2. VAULT (MongoDB)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ DATABASE: Vault is open"))
  .catch(err => console.log("❌ DATABASE ERROR:", err));

const Log = mongoose.model('MotionEvent', new mongoose.Schema({
  device: String,
  action: String,
  timestamp: { type: Date, default: Date.now }
}), 'MotionEvents');

// 3. RADIO (MQTT)
const mqttClient = mqtt.connect('mqtt://leopard.lmq.cloudamqp.com', {
    username: process.env.MQTT_USER, 
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 1000
});

mqttClient.on('connect', () => console.log("✅ MQTT: Connected to Radio Broker"));

// 4. API ROUTES
app.post('/api/login', (req, res) => {
  if (req.body.password === process.env.DASHBOARD_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get('/api/data', async (req, res) => {
  try {
    const logs = await Log.find({ action: { $regex: /motion/i } }).sort({ timestamp: -1 }).limit(10);
    res.json({ logs });
  } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

app.post('/api/trigger', (req, res) => {
    const { state } = req.body;
    mqttClient.publish('commands/alarm', state);
    console.log(`📡 COMMAND: Siren ${state}`);
    res.json({ success: true });
});

app.delete('/api/logs/:id', async (req, res) => {
  await Log.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// 5. HOSTING PORT (Standard Pro)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 MOHZTEC FACTORY: Running on Port ${PORT}`));