var socket = io();
const msgINP = document.getElementById("messageTXT");
const BTN = document.getElementById("btn");
const messageContainer = document.querySelector(".container");
var audio = new Audio("/ting.mp3");
const name = prompt("enter your name to join");

const appendMSG = (message, position) => {
  const msgElement = document.createElement("div");
  msgElement.innerText = message;
  msgElement.classList.add("message");
  msgElement.classList.add(position);
  messageContainer.append(msgElement);
  if (position == "left") {
    audio.play();
  }
};

const appendChatUser = (message, isJoined) => {
  const chatUser = document.createElement("div");
  chatUser.innerText = message;
  chatUser.classList.add("alert");
  chatUser.classList.add(isJoined);
  messageContainer.append(chatUser);

  audio.play();
};

// sending the message

BTN.addEventListener("click", (e) => {
  const message = msgINP.value;
  appendMSG(`you:${message}`, "right");
  socket.emit("send-msg", message);
  msgINP.value = "";
});
// recieving the message

socket.on("receive-msg", (data) => {
  appendMSG(`${data.name}:${data.message}`, "left");
});
// user joined
socket.emit("new-user-joined", name);

socket.on("user-joined", (name) => {
  appendChatUser(`${name} joined the chat`, "true");
});
// user left
socket.on("left", (name) => {
  appendChatUser(`${name} left the chat`, "false");
});
