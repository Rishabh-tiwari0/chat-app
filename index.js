var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
app.use(express.static(__dirname + "/node_modules"));
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");

require("dotenv").config();

const cors = require("cors");
const { name } = require("ejs");
const PORT = process.env.PORT || 3000;

// setting up middleware

app.use(express.static("public"));
app.use(cors());
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const users = {};
// creating a database connection
mongoose
  .connect(process.env.CONNECTION_URL)
  .then(console.log("database connected successfully"));
// creating userSchema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
// creating model
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

// creating socket connection
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

// socket connection

io.on("connection", (socket) => {
  // when new user joins
  socket.on("new-user-joined", (name) => {
    users[socket.id] = name;
    socket.broadcast.emit("user-joined", name);
  });
  // when user sent a mesage
  socket.on("send-msg", (message) => {
    socket.broadcast.emit("receive-msg", {
      message: message,
      name: users[socket.id],
    });
  });
  // on disconnect
  socket.on("disconnect", (message) => {
    socket.broadcast.emit("left", users[socket.id]);
    delete users[socket.id];
  });
});

server.listen(PORT, () => {
  console.log("listening on 3000");
});
