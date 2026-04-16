import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import { Server as SocketIO } from "socket.io";
import app from "./api/index.js";

// ── Room types ────────────────────────────────────────────────────────────────
interface RoomPlayer {
  socketId: string;
  playerIndex: 0 | 1;
}

interface Room {
  id: string;
  players: RoomPlayer[];
}

const rooms = new Map<string, Room>();

function makeRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? makeRoomCode() : code;
}

// ── Server bootstrap ──────────────────────────────────────────────────────────
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const httpServer = createServer(app);

  const io = new SocketIO(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  // ── Socket.io room logic ────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    let currentRoomId: string | null = null;

    // Host creates a room
    socket.on("create_room", (cb: (code: string) => void) => {
      const code = makeRoomCode();
      rooms.set(code, { id: code, players: [{ socketId: socket.id, playerIndex: 0 }] });
      currentRoomId = code;
      socket.join(code);
      if (typeof cb === "function") cb(code);
    });

    // Guest joins a room
    socket.on("join_room", (code: string, cb: (result: { ok: boolean; playerIndex?: number; error?: string }) => void) => {
      const room = rooms.get(code.toUpperCase());
      if (!room) return cb({ ok: false, error: "Room not found" });
      if (room.players.length >= 2) return cb({ ok: false, error: "Room is full" });

      room.players.push({ socketId: socket.id, playerIndex: 1 });
      currentRoomId = code.toUpperCase();
      socket.join(currentRoomId);

      // Tell the joiner their index
      cb({ ok: true, playerIndex: 1 });

      // Tell the host the room is ready
      io.to(currentRoomId).emit("room_ready", {
        playerCount: 2,
        players: room.players.map((p) => ({ playerIndex: p.playerIndex })),
      });
    });

    // Relay game events to the other player in the room
    socket.on("game_event", (data: unknown) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit("game_event", data);
    });

    // Player sends a ready signal (game loaded)
    socket.on("player_ready", () => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit("opponent_ready");
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) {
        io.to(currentRoomId).emit("opponent_disconnected");
        rooms.delete(currentRoomId);
      }
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
