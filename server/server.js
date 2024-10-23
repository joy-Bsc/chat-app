const auth = require("json-server-auth");
const jsonServer = require("json-server");
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH"],
    },
});

global.io = io;

const router = jsonServer.router("db.json");

// Response middleware
router.render = (req, res) => {
    const path = req.path;
    const method = req.method;
    if (path.includes("/conversations") && (method === "POST" || method === "PATCH")) {
        // Emit socket event
        io.emit("conversation", {
            data: res.locals.data,
        });
    }

    if (path.includes("/messages") && method === "POST") {
        // Emit socket event
        io.emit("message", {
            data: res.locals.data,
        });
    }
    res.json(res.locals.data);
};

const middlewares = jsonServer.defaults();
const port = process.env.PORT || 9000;

// Bind the router db to the app
app.db = router.db;

app.use(cors());
app.use(middlewares);

const rules = auth.rewriter({
    users: 640,
    conversations: 660,
    messages: 660,
});

app.use(rules);
app.use(auth);
app.use(router);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});