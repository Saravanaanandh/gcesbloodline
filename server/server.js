import dotenv from 'dotenv'
import express from 'express'
import { connectDB } from './config/dbConn.js'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.route.js'
import bloodReqRouter from './routes/reqBlood.route.js'
import donorRouter from './routes/donor.route.js'
import otpRouter from './routes/otp.route.js'
import recipientRouter from './routes/recipient.route.js'
import aiRouter from './routes/ai.route.js'
import { verifyJWT } from './middleware/auth.middleware.js'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url';
import { app, server } from './config/socket.js'
import rateLimit from 'express-rate-limit'
import { startExpiryScheduler } from './jobs/expiry.js'

dotenv.config()
const PORT = process.env.PORT || 5000

app.set("trust proxy", 1)

// ---------------------------------------------------------------------------
// CORS origin resolver
// In production only the known deployment domains are allowed, keeping the
// server locked down even if NODE_ENV somehow leaks. In development every RFC-
// 1918 / link-local address is permitted so any laptop on the same Wi-Fi can
// reach the dev server without editing this file.  An optional ALLOWED_ORIGINS
// env var (comma-separated) lets you whitelist extra origins either way.
//
// bloodline.gces.net.in is the live domain; the older two stay listed so any
// link still pointing at them keeps working. Both www and apex are allowed
// because a browser sends whichever one the user typed.
// ---------------------------------------------------------------------------
const PRODUCTION_ORIGINS = [
    "https://bloodline.gces.net.in",
    "https://www.bloodline.gces.net.in",
    "https://gces-bloodline.web.app",
    "https://blood-donation-o7z9.onrender.com",
]
const LOCAL_PATTERNS = [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
]
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(o => o.trim()).filter(Boolean)

const corsOrigin = (origin, cb) => {
    // server-to-server, curl or Postman sends no Origin header
    if (!origin) return cb(null, true)
    if (PRODUCTION_ORIGINS.includes(origin)) return cb(null, true)
    if (EXTRA_ORIGINS.includes(origin)) return cb(null, true)
    if (process.env.NODE_ENV !== 'production' &&
        LOCAL_PATTERNS.some(p => p.test(origin))) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} is not allowed`))
}

app.use(cors({
    origin: corsOrigin,
    methods: "GET,POST,PATCH,PUT,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}))

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser())
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: true
})

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/api/v1/auth', apiLimiter, authRouter)
app.use('/api/v1/request', apiLimiter, verifyJWT, bloodReqRouter)
app.use('/api/v1/recipient', apiLimiter, verifyJWT, recipientRouter)
app.use('/api/v1/donate', apiLimiter, verifyJWT, donorRouter)
app.use('/api/v1/otp', apiLimiter, verifyJWT, otpRouter)
app.use('/api/v1/ai', apiLimiter, verifyJWT, aiRouter)


if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, '../client/dist')))

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, "../client", "dist", "index.html"))
    })
}
// 0.0.0.0 = all interfaces → both localhost and the Wi-Fi LAN IP work.
// Render sets its own PORT and does not need HOST; locally you can override with HOST=127.0.0.1.
const HOST = process.env.HOST || '0.0.0.0'
server.listen(PORT, HOST, async () => {
    console.log(`server running on http://${HOST}:${PORT}`)
    await connectDB()
    // owns request/blood-request expiry now that the TTL indexes are gone
    await startExpiryScheduler()
})