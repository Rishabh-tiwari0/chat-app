// Importing necessary modules and setting up the server
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serving static files and configuring middleware
app.use(express.static(__dirname + "/node_modules"));
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
require("dotenv").config();
const cors = require("cors");
const PORT = process.env.PORT || 3000;

// Setting up middleware
app.use(express.static("public"));
app.use(cors());
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Creating a socket user collection and game player arrays
const users = {};
const allPlayer = [];
const playingArray = [];

// Creating a database connection
mongoose.connect(process.env.CONNECTION_URL).then(() => {
  console.log("Database connected successfully");
});

// Creating userSchema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

// Creating model
const User = mongoose.model("User", userSchema);

// Configuring session middleware for user authentication
app.use(
  session({ secret: "your-secret-key", resave: true, saveUninitialized: true })
);

// Custom middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    res.redirect("/login");
  }
};

// Routes for rendering different pages
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  // Handling user signup
  const { username, password } = req.body;
  const newUser = new User({ username, password });
  await newUser.save();
  res.redirect("/");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  // Handling user login
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    req.session.user = username;
    res.redirect("/choose");
  } else {
    res.send("Invalid login credentials.");
  }
});
// choose weather to chat or play game
app.get("/choose", isAuthenticated, (req, res) => {
  // Rendering chat page if user is authenticated
  const name = req.session.user;
  res.render("choose.ejs");
});

app.get("/chat", isAuthenticated, (req, res) => {
  // Rendering chat page if user is authenticated
  const name = req.session.user;
  res.render("chat.ejs", { name: name });
});

// Socket connection
io.on("connection", (socket) => {
  // Handling user connections, disconnections, and messages
  socket.on("new-user-joined", (name) => {
    users[socket.id] = name;
    socket.broadcast.emit("user-joined", name);
  });

  socket.on("send-msg", (message) => {
    socket.broadcast.emit("receive-msg", {
      message: message,
      name: users[socket.id],
    });
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("left", users[socket.id]);
    delete users[socket.id];
  });

  // Handling game-related socket events
  socket.on("find", (e) => {
    // Finding players for a game
    if (e.name !== null) {
      allPlayer.push(e.name);

      // Logic to pair players and start a game
      if (allPlayer.length >= 2) {
        let p1Obj = { p1Name: allPlayer[0], p1Value: "X", p1Move: "" };
        let p2Obj = { p2Name: allPlayer[1], p2Value: "O", p2Move: "" };
        let obj = { p1: p1Obj, p2: p2Obj };
        playingArray.push(obj);
        allPlayer.splice(0, 2);

        // Emitting events for both players
        socket.broadcast.emit("found", { players: playingArray });
        socket.emit("found", { players: playingArray });
      }
    }
  });

  socket.on("playing-move", (data) => {
    // Broadcasting move made during the game
    socket.broadcast.emit("move-made", {
      value: data.value,
      id: data.id,
      userName: data.userName,
    });
  });

  socket.on("game-over", (data) => {
    // Broadcasting game-over event to all connected clients
    io.emit("game-over-res", data);
  });

  socket.on("change-turn", (data) => {
    // Broadcasting turn change event to all connected clients
    io.emit("current-turn", { message: data.message });
  });

  // Handling errors
  socket.on("error", (err) => {
    console.error(`Socket error: ${err}`);
  });
});

// Rendering Tic Tac Toe game page
app.get("/ticTacToe", (req, res) => {
  const name = req.session.user;
  res.render("tictactoe.ejs", { name: name });
});

// Server listening
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
