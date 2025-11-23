import { Server } from "socket.io";
import { createServer } from "http";
import "dotenv/config";

// Get allowed origins from environment or use defaults
const allowedOrigins = process.env.ORIGIN 
  ? process.env.ORIGIN.split(",").map(origin => origin.trim())
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

console.log("Allowed CORS origins:", allowedOrigins);

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server attached to HTTP server
const chatIO = new Server(httpServer, {
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

interface Message {
  user: string;
  text: string;
  room: string;
  time: string;
}

chatIO.on("connection", (socket) => {
  console.log(`✅ Chat user connected: ${socket.id}`);
  console.log(`   Origin: ${socket.handshake.headers.origin}`);
  console.log(`   Query:`, socket.handshake.query);
  
  const room = socket.handshake.query.room as string;

  if (room) {
    socket.join(room);
    console.log(`   User ${socket.id} joined room: ${room}`);
  }

  // Handle explicit room joining
  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    console.log(`   User ${socket.id} joined room: ${roomId}`);
  });

  socket.on("sendMessage", (msg: Message) => {
    console.log(`📨 Message received in room ${msg.room} from ${msg.user}: ${msg.text}`);
    chatIO.to(msg.room).emit("receiveMessage", msg);
    console.log(`   Message broadcasted to room: ${msg.room}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Chat user disconnected: ${socket.id}, reason: ${reason}`);
  });

  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Health check endpoint
httpServer.on("request", (req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "chat-server", port }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// Handle HTTP server errors
httpServer.on("error", (error: any) => {
  console.error("❌ HTTP Server error:", error);
  if (error.code === "EADDRINUSE") {
    console.error(`   Port ${port} is already in use`);
  }
});

const port = Number(process.env.CHAT_PORT) || 3001;
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Chat server running on port ${port}`);
  console.log(`   Server ready to accept connections`);
  console.log(`   Health check: http://localhost:${port}/health`);
});
