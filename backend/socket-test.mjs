import { io } from "socket.io-client";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";
const TOKEN = process.env.TOKEN; // paste JWT
const PROJECT_ID = process.env.PROJECT_ID; // paste projectId

if (!TOKEN || !PROJECT_ID) {
  console.error("Set TOKEN and PROJECT_ID env vars");
  process.exit(1);
}

const socket = io(SERVER_URL, {
  auth: { token: `Bearer ${TOKEN}` },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("connected:", socket.id);

  socket.emit("join-project", PROJECT_ID, (ack) => {
    console.log("join ack:", ack);

    socket.emit(
      "send-message",
      { projectId: PROJECT_ID, content: "hello from CLI", messageType: "text" },
      (ack2) => console.log("send ack:", ack2)
    );

    socket.emit("typing", PROJECT_ID);
    setTimeout(() => socket.emit("stop-typing", PROJECT_ID), 800);
  });
});

socket.on("new-message", (msg) => console.log("new-message:", msg));
socket.on("user-typing", (p) => console.log("user-typing:", p));
socket.on("user-stop-typing", (p) => console.log("user-stop-typing:", p));
socket.on("connect_error", (err) => console.error("connect_error:", err.message));
