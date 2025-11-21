import { Server } from "socket.io";
import "dotenv/config";

const chatIO = new Server({
  cors: { origin: process.env.ORIGIN?.split(",") || ["http://localhost:5174"] || ["http://localhost:5173"]},
});

interface Message {
  user: string;
  text: string;
  room: string;
  time: string;
}

chatIO.on("connection", (socket) => {
  console.log(`Chat user connected: ${socket.id}`);
  const room = socket.handshake.query.room as string;

  if (room) {
    socket.join(room);
  }

  socket.on("sendMessage", (msg: Message) => {
    chatIO.to(msg.room).emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log(`Chat user disconnected: ${socket.id}`);
  });
});

const port = Number(process.env.CHAT_PORT) || 3001;
chatIO.listen(port);
console.log(`Chat server running on port ${port}`);
