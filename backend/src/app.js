import 'dotenv/config';
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

// App Configuration
app.set("port", process.env.PORT || 8000);
app.set("mongo_user", "admin"); // Set a meaningful value here

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

// Connect to DB and Start Server
const start = async () => {
  try {
    const connectionDb = await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MONGO Connected. DB Host: ${connectionDb.connection.host}`);

    server.listen(app.get("port"), () => {
      console.log(`LISTENING ON PORT ${app.get("port")}`);
    });

  } catch (error) {
    console.error(" MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

start();
