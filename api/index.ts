/**
 * @fileoverview Connectify Chat Server - Real-time chat server using Socket.IO
 * Provides real-time messaging functionality with room-based chat support.
 * @version 1.0.0
 * @author Connectify Team
 */

import { Server } from "socket.io";
import { createServer } from "http";
import "dotenv/config";

/**
 * Array of allowed CORS origins for the chat server.
 * Origins can be configured via the ORIGIN environment variable (comma-separated).
 * Defaults to common development ports if not specified.
 * @type {string[]}
 */
const allowedOrigins = process.env.ORIGIN 
  ? process.env.ORIGIN.split(",").map(origin => origin.trim())
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

console.log("Allowed CORS origins:", allowedOrigins);

/**
 * HTTP server instance used as the foundation for the Socket.IO server.
 * @type {import('http').Server}
 */
const httpServer = createServer();

/**
 * Socket.IO server instance configured with CORS settings and transport options.
 * Handles real-time bidirectional communication for the chat application.
 * @type {Server}
 */
const chatIO = new Server(httpServer, {
  cors: { 
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

/**
 * Represents a chat message structure used throughout the application.
 * @interface Message
 * @property {string} user - The username of the message sender
 * @property {string} text - The content of the message
 * @property {string} room - The room ID where the message was sent
 * @property {string} time - Timestamp when the message was created (ISO string format)
 */
interface Message {
  user: string;
  text: string;
  room: string;
  time: string;
}

/**
 * Handles new client connections to the chat server.
 * Sets up event listeners for message sending, room joining, disconnections, and errors.
 * Automatically joins clients to rooms if specified in connection query parameters.
 * 
 * @param {import('socket.io').Socket} socket - The connected client socket
 * @listens connection
 */
chatIO.on("connection", (socket) => {
  console.log(`✅ Chat user connected: ${socket.id}`);
  console.log(`   Origin: ${socket.handshake.headers.origin}`);
  console.log(`   Query:`, socket.handshake.query);
  
  const room = socket.handshake.query.room as string;

  if (room) {
    socket.join(room);
    console.log(`   User ${socket.id} joined room: ${room}`);
  }

  /**
   * Handles explicit room joining requests from clients.
   * @param {string} roomId - The ID of the room to join
   * @listens joinRoom
   */
  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    console.log(`   User ${socket.id} joined room: ${roomId}`);
  });

  /**
   * Handles incoming chat messages and broadcasts them to all clients in the same room.
   * @param {Message} msg - The message object containing user, text, room, and time information
   * @listens sendMessage
   * @emits receiveMessage - Broadcasts the message to all clients in the specified room
   */
  socket.on("sendMessage", (msg: Message) => {
    console.log(`📨 Message received in room ${msg.room} from ${msg.user}: ${msg.text}`);
    chatIO.to(msg.room).emit("receiveMessage", msg);
    console.log(`   Message broadcasted to room: ${msg.room}`);
  });

  /**
   * Handles client disconnections and logs the disconnect reason.
   * @param {string} reason - The reason for the disconnection
   * @listens disconnect
   */
  socket.on("disconnect", (reason) => {
    console.log(`❌ Chat user disconnected: ${socket.id}, reason: ${reason}`);
  });

  /**
   * Handles socket errors and logs them for debugging.
   * @param {Error} error - The error object
   * @listens error
   */
  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

/**
 * HTTP request handler for health check and basic routing.
 * Provides a simple health check endpoint and handles 404 responses for unknown routes.
 * 
 * @param {import('http').IncomingMessage} req - The HTTP request object
 * @param {import('http').ServerResponse} res - The HTTP response object
 * @listens request
 */
httpServer.on("request", (req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "chat-server", port }));
    return;
  }
  res.writeHead(404);
  res.end();
});

/**
 * HTTP server error handler.
 * Logs server errors and provides specific handling for port conflicts.
 * 
 * @param {NodeJS.ErrnoException} error - The error object
 * @listens error
 */
httpServer.on("error", (error: any) => {
  console.error("❌ HTTP Server error:", error);
  if (error.code === "EADDRINUSE") {
    console.error(`   Port ${port} is already in use`);
  }
});

/**
 * The port number on which the chat server will listen.
 * Can be configured via the CHAT_PORT environment variable, defaults to 3001.
 * @type {number}
 */
const port = Number(process.env.CHAT_PORT) || 3001;

/**
 * Starts the HTTP server and begins listening for connections.
 * The server binds to all network interfaces (0.0.0.0) on the specified port.
 * Logs startup information including the port and health check URL.
 */
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Chat server running on port ${port}`);
  console.log(`   Server ready to accept connections`);
  console.log(`   Health check: http://localhost:${port}/health`);
});
