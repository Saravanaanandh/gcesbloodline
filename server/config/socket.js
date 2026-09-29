import http from 'http'
import express from 'express'
import { Server } from 'socket.io'
const app = express()

const server = http.createServer(app)

// The same origin rules as Express CORS (server.js). Kept in sync: production locks
// down to the known domains; development opens to any RFC-1918 address so every
// laptop on the same Wi-Fi can connect without touching this file. If you add a
// domain here, add it there too - a socket blocked by CORS looks like a silent
// "the page never updates in real time" bug rather than a failed request.
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

const socketOrigin = (origin, cb) => {
    if (!origin) return cb(null, true)
    if (PRODUCTION_ORIGINS.includes(origin)) return cb(null, true)
    if (EXTRA_ORIGINS.includes(origin)) return cb(null, true)
    if (process.env.NODE_ENV !== 'production' &&
        LOCAL_PATTERNS.some(p => p.test(origin))) return cb(null, true)
    cb(new Error(`Socket.io CORS: origin ${origin} is not allowed`))
}

const io = new Server(server, {
    cors: {
        origin: socketOrigin,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type"],
        credentials: true
    }
})

const usersSocket = {}

export const getUserSocket = (userId) => {
    return usersSocket[userId]
}

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId
    console.log(`a user connected : ${socket.id}`)

    if (userId) usersSocket[userId] = socket.id

    socket.on("disconnect", () => {
        console.log(`A user disconnected : ${socket.id}`)
        delete usersSocket[userId]
    })
})

export { io, app, server }
