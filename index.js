const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
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

// Creating a socket user collection
const users = {};

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

// Creating socket connection
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const newUser = new User({ username, password });
  await newUser.save();
  res.redirect("/");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    req.session.user = username;
    res.redirect("/chat");
  } else {
    res.send("Invalid login credentials.");
  }
});

app.get("/chat", isAuthenticated, (req, res) => {
  const name = req.session.user;
  res.render("chat.ejs", { name: name });
});

// Socket connection
io.on("connection", (socket) => {
  // When a new user joins
  socket.on("new-user-joined", (name) => {
    users[socket.id] = name;
    socket.broadcast.emit("user-joined", name);
  });

  // When a user sends a message
  socket.on("send-msg", (message) => {
    socket.broadcast.emit("receive-msg", {
      message: message,
      name: users[socket.id],
    });
  });

  // On disconnect
  socket.on("disconnect", () => {
    socket.broadcast.emit("left", users[socket.id]);
    delete users[socket.id];
  });

  // Handle errors
  socket.on("error", (err) => {
    console.error(`Socket error: ${err}`);
  });
});

// Server listening
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
