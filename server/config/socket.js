import http from 'http'
import express from 'express'
import { Server } from 'socket.io' 
const app = express()

const server = http.createServer(app)

const io = new Server(server,{
    cors:{
        origin:["https://gces-bloodline.web.app","http://192.168.56.1:5173","http://10.45.38.231:5173","https://blood-donation-o7z9.onrender.com","http://localhost:5173","http://localhost:5000/"], 
        methods: ["GET","POST","PATCH","PUT","DELETE"],
        allowedHeaders: ["Content-Type"],
        credentials:true
    }
})

const usersSocket = {}

export const getUserSocket = (userId)=>{
    return usersSocket[userId]
}

io.on("connection",(socket)=>{ 
    const userId = socket.handshake.query.userId  
    console.log(`a user connected : ${socket.id}`) 

    if(userId) usersSocket[userId] = socket.id 

    socket.on("disconnect",()=>{
        console.log(`A user disconnected : ${socket.id}`) 
        delete usersSocket[userId]
    })
})

export {io, app, server}


