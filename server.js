// import dotenv from 'dotenv';
// dotenv.config(); 
// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import mqtt from 'mqtt';
// import axios from 'axios';
// import dns from 'dns';

// // --- 1. BYPASS ISP BLOCKS ---
// // Layman: This tells the server "Don't use the local slow maps, use Google's fast maps to find our Vault."
// dns.setServers(['8.8.8.8', '8.8.4.4']);

// const app = express();
// app.use(cors());
// app.use(express.json());

// // --- 2. THE VAULT (Database) ---
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ VAULT: Connected to MongoDB Atlas"))
//   .catch(err => console.log("❌ VAULT ERROR:", err));

// const Log = mongoose.model('MotionEvent', new mongoose.Schema({
//   device: String,
//   action: String,
//   timestamp: { type: Date, default: Date.now }
// }), 'MotionEvents');

// // --- 3. THE RADIO OPERATOR (MQTT) ---
// const mqttClient = mqtt.connect('mqtt://leopard.lmq.cloudamqp.com', {
//     username: process.env.MQTT_USER, 
//     password: process.env.MQTT_PASSWORD,
//     reconnectPeriod: 1000
// });

// mqttClient.on('connect', () => {
//     console.log("📡 RADIO: Online and listening to CloudAMQP");
//     mqttClient.subscribe("mqtt/"); 
// });

// // --- 4. THE SECRETARY (The Automation Brain) ---
// mqttClient.on('message', async (topic, message) => {
//     const payload = message.toString();
    
//     if (topic === "mqtt/" && payload.includes("Motion")) {
//         console.log(`📩 RECEIVED: ${payload}`);

//         try {
//             // STEP A: File the log
//             const newLog = new Log({
//                 device: "MOHZTEC_V2",
//                 action: payload,
//                 timestamp: new Date()
//             });
//             await newLog.save();
//             console.log("✍️ VAULT: Log filed successfully.");

//             // STEP B: Send Telegram using Axios (The Cloud Phone)
//             const token = "8712705004:AAHqmMGNeMh3V5paK0CJIoOajW8S86u446g";
//             const chat_id = "6644491901";
//             const url = `https://api.telegram.org/bot{token}/sendMessage?chat_id={chat_id}`;
            
//             await axios.get(url, {
//                 params: { chat_id: chat_id, text: `🚨 ALERT: ${payload}` }
//             });
//             console.log("🚀 TELEGRAM: Alert dispatched!");

//         } catch (err) {
//             console.log("❌ PROCESS ERROR:", err.message);
//         }
//     }
// });

// // --- 5. THE FRONT DESK (API Routes) ---
// app.post('/api/login', (req, res) => {
//   if (req.body.password === process.env.DASHBOARD_PASSWORD) res.json({ success: true });
//   else res.status(401).json({ success: false });
// });

// app.get('/api/data', async (req, res) => {
//   try {
//     const logs = await Log.find({ action: /motion/i }).sort({ timestamp: -1 }).limit(10);
//     res.json({ logs });
//   } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
// });

// app.post('/api/trigger', (req, res) => {
//     const { state } = req.body;
//     mqttClient.publish('commands/alarm', state);
//     console.log(`📡 COMMAND: Siren ${state}`);
//     res.json({ success: true });
// });

// // --- 6. POWER ON ---
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 FACTORY: Running on Port ${PORT}`));





import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import mqtt from 'mqtt';
import axios from 'axios';
import { createServer } from 'http'; // 👈 Needed for Megaphone
import { Server } from 'socket.io';   // 👈 The Megaphone
import dns from 'dns';


// --- 1. BYPASS ISP BLOCKS ---
// Layman: This tells the server "Don't use the local slow maps, use Google's fast maps to find our Vault."
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();
const httpServer = createServer(app); // Wrap express in a server
const io = new Server(httpServer, {
  cors: { origin: "*" } // Allow your phone and web to talk
});

app.use(cors());
app.use(express.json());

// 1. VAULT (MongoDB)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ VAULT: Connected"))
  .catch(err => console.log("❌ VAULT ERROR:", err));

const Log = mongoose.model('MotionEvent', new mongoose.Schema({
  device: String, action: String, timestamp: { type: Date, default: Date.now }
}), 'MotionEvents');

// 2. RADIO (MQTT)
const mqttClient = mqtt.connect('mqtt://leopard.lmq.cloudamqp.com', {
    username: process.env.MQTT_USER, password: process.env.MQTT_PASSWORD,
     reconnectPeriod: 1000

});

mqttClient.on('connect', () => {
    console.log("📡 RADIO: Online and listening to Mohztec Broker");
    mqttClient.subscribe("mqtt/"); 
});

// 3. THE MEGAPHONE LOGIC (Socket.io)
io.on('connection', (socket) => {
    console.log("📱 MOBILE: Phone App connected to Megaphone");
    
    // Listen for the "SIREN ON" button from your phone
    socket.on('trigger_siren', (state) => {
        mqttClient.publish('commands/alarm', state);
        console.log(`🎮 CMD: Phone sent ${state}`);
    });
});

// 4. THE SECRETARY (Handling Alarms)
mqttClient.on('message', async (topic, message) => {
    const payload = message.toString();
    if (topic === "mqtt/" && payload.includes("Motion")) {
        
        // A. SHOUT TO THE PHONE INSTANTLY
        io.emit('mqtt/', payload); 
        console.log("📣 MEGAPHONE: Shouting to Mobile App!");

        try {
            // B. SAVE TO VAULT
            const newLog = new Log({ 
                device: "MOHZTEC_V2", 
                action: payload,   timestamp:
                 new Date() });
            await newLog.save();
             console.log("✍️ VAULT: Log filed successfully.");

            // C. TELEGRAM ALERT
            const telUrl = `https://telegram.org{process.env.TELEGRAM_TOKEN}/sendMessage?chat_id=${process.env.CHAT_ID}&text=🚨 ${payload}`;
            await axios.get(telUrl);
        } catch (err) { console.log("❌ ERROR:", err.message); }
    }
});

// 5. API ROUTES (Existing)

app.post('/api/login', (req, res) => {
  if (req.body.password === process.env.DASHBOARD_PASSWORD) res.json({ success: true });
  else res.status(401).json({ success: false });
});

app.get('/api/data', async (req, res) => {
    const logs = await Log.find({ action: /motion/i }).sort({ timestamp: -1 }).limit(10);
    res.json({ logs });
});

app.post('/api/trigger', (req, res) => {
    const { state } = req.body;
    mqttClient.publish('commands/alarm', state);
    res.json({ success: true });
});

// 6. POWER ON (Use httpServer instead of app)
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 FACTORY: Running on Port ${PORT}`));



// import 'dotenv/config';
// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import mqtt from 'mqtt';
// import axios from 'axios';
// import { createServer } from 'http';
// import { Server } from 'socket.io';

// const app = express();
// const httpServer = createServer(app); // 👈 This allows the "Door" and "Radio" to exist together
// const io = new Server(httpServer, {
//   cors: { origin: "*" } // 👈 This allows both Vercel (Web) and Mobile to connect
// });

// app.use(cors());
// app.use(express.json());

// // --- DATABASE & MQTT (Same as before) ---
// mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ VAULT: Connected"));

// const Log = mongoose.model('MotionEvent', new mongoose.Schema({
//   device: String, action: String, timestamp: { type: Date, default: Date.now }
// }), 'MotionEvents');

// const mqttClient = mqtt.connect('mqtt://://cloudamqp.com', {
//     username: process.env.MQTT_USER, password: process.env.MQTT_PASSWORD
// });

// // --- THE NEW RADIO STATION (For Mobile) ---
// io.on('connection', (socket) => {
//     console.log("📱 NEW CONNECTION: A device (Mobile or Web) is on the line.");
    
//     socket.on('trigger_siren', (state) => {
//         mqttClient.publish('commands/alarm', state);
//         console.log(`🎮 CMD: Remote signal sent -> ${state}`);
//     });
// });

// // --- THE SECRETARY (The Logic) ---
// mqttClient.on('message', async (topic, message) => {
//     const payload = message.toString();
//     if (topic === "mqtt/motion" && payload.includes("Motion")) {
        
//         // 1. INSTANT SHOUT (For Mobile)
//         io.emit('mqtt/motion', payload); 

//         try {
//             // 2. SAVE TO VAULT (For Web/History)
//             const newLog = new Log({ device: "MOHZTEC_V2", action: payload });
//             await newLog.save();

//             // 3. TELEGRAM (For Alerts)
//             const telUrl = `https://telegram.org{process.env.TELEGRAM_TOKEN}/sendMessage?chat_id=${process.env.CHAT_ID}&text=🚨 ${payload}`;
//             await axios.get(telUrl);
//         } catch (err) { console.log("❌ ERROR:", err.message); }
//     }
// });

// // --- THE FRONT DESK (For Web Dashboard) ---
// app.post('/api/login', (req, res) => {
//   if (req.body.password === process.env.DASHBOARD_PASSWORD) res.json({ success: true });
//   else res.status(401).json({ success: false });
// });

// app.get('/api/data', async (req, res) => {
//     const logs = await Log.find({ action: /motion/i }).sort({ timestamp: -1 }).limit(10);
//     res.json({ logs });
// });

// app.post('/api/trigger', (req, res) => {
//     const { state } = req.body;
//     mqttClient.publish('commands/alarm', state);
//     res.json({ success: true });
// });

// // START
// const PORT = process.env.PORT || 5000;
// httpServer.listen(PORT, () => console.log(`🚀 MASTER FACTORY: Running on Port ${PORT}`));