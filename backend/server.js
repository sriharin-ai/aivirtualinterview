import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orgAdminRoutes from "./routes/orgAdminRoutes.js";
import orgRequestRoutes from "./routes/orgRequestRoutes.js";
import driveRoutes from "./routes/driveRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { startDigestCron } from "./cron/weeklyDigest.js";

dotenv.config();

connectDB().then(() => startDigestCron());

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE',  'OPTIONS'],
        credentials: false,
        allowedHeaders: ['Content-Type', 'Authorization'],
    }
})

app.use(cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization',"X-Requested-With"],
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("io", io);

app.get("/", (req, res) => {
    res.send("API is running");
});

app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/org-admin", orgAdminRoutes);
app.use("/api/org-requests", orgRequestRoutes);
app.use("/api/drives", driveRoutes);

io.on("connection", (socket) => {
    console.log(`A user Connected ${socket.id}`);
    const userId=socket.handshake.query.userId;
    if(userId){

        socket.join(userId);
        console.log(`User ${socket.id} joined room: ${userId}`);
    }

    socket.on("disconnect", () => {
        console.log(`User Disconnected ${socket.id}`);
    });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(
    PORT,
    '0.0.0.0',
    () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);


