var socket = io();

const loadingIcon = document.getElementById("loading");
let gameGrid = document.querySelector(".gridContainer");
const findPlayerBtn = document.getElementById("find");
const userName = document.getElementById("myName").innerText;
const btn = document.querySelectorAll(".grid-item");
const turn = document.getElementById("turn");
loadingIcon.style.display = "none";
gameGrid.style.display = "none";

if (userName == null || userName == "") {
  document.querySelector(".gameContainer").style.display = "none";
} else {
  document.getElementById("myModal").style.display = "none";
  document.querySelector(".gameContainer").style.display = "block";
}

findPlayerBtn.addEventListener("click", () => {
  socket.emit("find", { name: userName });
  loadingIcon.style.display = "block";
  findPlayerBtn.disabled = true;
});

function redirectToPage() {
  window.location.href = "/";
}

socket.on("found", async (e) => {
  const allPlayers = await e.players;

  console.log(allPlayers);
  loadingIcon.style.display = "none";
  gameGrid.style.display = "grid";
  findPlayerBtn.style.display = "none";

  let opponentName;
  let value;
  const foundObj = await allPlayers.find(
    (obj) => obj.p1.p1Name == `${userName}` || obj.p2.p2Name == `${userName}`
  );
  foundObj.p1.p1Name == `${userName}`
    ? (opponentName = foundObj.p2.p2Name)
    : (opponentName = foundObj.p1.p1Name);
  foundObj.p1.p1Name == `${userName}`
    ? (value = foundObj.p1.p1Value)
    : (value = foundObj.p2.p2Value);
  document.getElementById("opponentName").innerText = opponentName;
  document.getElementById("playingAs").innerText = value;
  canMove();
});

socket.on("move-made", (data) => {
  document.getElementById(data.id).innerText = data.value;
  document.getElementById(data.id).disabled = true;

  // Check for a winner or a tie after each move
  checkWinner();
});

// Function to check for a winner or a tie
function checkWinner() {
  const winningCombinations = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9], // Rows
    [1, 4, 7],
    [2, 5, 8],
    [3, 6, 9], // Columns
    [1, 5, 9],
    [3, 5, 7], // Diagonals
  ];

  for (const combo of winningCombinations) {
    const [a, b, c] = combo;
    const btnA = document.getElementById(`button${a}`).innerText;
    const btnB = document.getElementById(`button${b}`).innerText;
    const btnC = document.getElementById(`button${c}`).innerText;

    if (btnA !== "" && btnA === btnB && btnB === btnC) {
      announceWinner(btnA);
      return;
    }
  }

  // Check for a tie
  const isTie = Array.from(btn).every((button) => button.innerText !== "");
  if (isTie) {
    announceWinner("It's a tie!");
  }
}

// Function to announce the winner
function announceWinner(winner) {
  document.getElementById(
    "winnerName"
  ).innerText = `Game Over! Winner: ${winner}`;
  gameGrid.style.display = "none";

  // Emit the game-over event immediately to notify the other player
  socket.emit("game-over", { winner: winner });
}

// Event listener for each button click
btn.forEach((e) => {
  e.addEventListener("click", () => {
    const playingSymbol = document.getElementById("playingAs").innerText;
    e.innerText = playingSymbol;
    e.disabled = true;
    socket.emit("playing-move", {
      value: playingSymbol,
      id: e.id,
      userName: userName,
    });

    // Check for a winner or a tie after each move
    checkWinner();
    // change turn
    changingTurn();
    // can make move
  });
});

// Socket event for handling game over
socket.on("game-over-res", (data) => {
  document.getElementById(
    "winnerName"
  ).innerText = `Game Over! Winner: ${data.winner}`;
  gameGrid.style.display = "none";
});

// changing turn
const changingTurn = () => {
  if (turn.innerText == "X") {
    turn.innerText = "O";
  } else {
    turn.innerText = "X";
  }

  socket.emit("change-turn", { message: turn.innerText });
};
socket.on("current-turn", (data) => {
  turn.innerText = data.message;
  canMove();
});
const canMove = () => {
  if (turn.innerText !== document.getElementById("playingAs").innerText) {
    gameGrid.style.pointerEvents = "none";
  } else {
    gameGrid.style.pointerEvents = "auto";
  }
};
