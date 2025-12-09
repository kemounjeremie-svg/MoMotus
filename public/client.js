// client.js

// ========================
// SOCKET & ÉTAT GLOBAL
// ========================
const socket = io();

let myId = null;
let currentRoomCode = null;
let myNickname = "";
let wordLength = 6;
let maxAttempts = 6;
let maxRounds = 10;
let currentRound = 1;

let currentAttempt = 0; // index de la ligne en cours
let currentGuess = ""; // mot en cours de saisie
let firstLetter = "";
let hasFinished = false;

// Timer
let startTime = null;
let timerInterval = null;

// ========================
// DOM
// ========================
const lobbySection = document.getElementById("lobby");
const lobbyMessage = document.getElementById("lobby-message");
const nicknameInput = document.getElementById("nickname");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const roomCodeInput = document.getElementById("room-code-input");

const roomSection = document.getElementById("room-section");
const roomCodeDisplay = document.getElementById("room-code-display");
const roundDisplay = document.getElementById("round-display");
const timerDisplay = document.getElementById("timer-display");
const inviteCodeSpan = document.getElementById("invite-code-span");
const directLinkInput = document.getElementById("direct-link-input");
const playersList = document.getElementById("players-list");
const gridElement = document.getElementById("grid");
const gameMessage = document.getElementById("game-message");
const newGameBtn = document.getElementById("new-game-btn");
const eventsLog = document.getElementById("events-log");

// Ancienne zone de saisie : on la cache, on garde juste pour compat éventuelle
const guessInput = document.getElementById("guess-input");
const submitBtn = document.getElementById("submit-btn");
if (guessInput) guessInput.style.display = "none";
if (submitBtn) submitBtn.style.display = "none";

// ========================
// UTILITAIRES UI
// ========================

function showLobbyMessage(text, isError = false) {
  lobbyMessage.textContent = text || "";
  lobbyMessage.style.color = isError ? "#f97373" : "#e5e7eb";
}

function showGameMessage(text, isError = false) {
  gameMessage.textContent = text || "";
  gameMessage.style.color = isError ? "#f97373" : "#e5e7eb";
}

function logEvent(text) {
  if (!text) return;
  const p = document.createElement("p");
  p.textContent = text;
  eventsLog.appendChild(p);
  eventsLog.scrollTop = eventsLog.scrollHeight;
}

function createGrid() {
  gridElement.innerHTML = "";
  for (let row = 0; row < maxAttempts; row++) {
    for (let col = 0; col < wordLength; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;
      const span = document.createElement("span");
      cell.appendChild(span);
      gridElement.appendChild(cell);
    }
  }
}

function getCell(row, col) {
  return gridElement.querySelector(
    `.cell[data-row="${row}"][data-col="${col}"]`
  );
}

function setCellLetter(row, col, letter) {
  const cell = getCell(row, col);
  if (!cell) return;
  const span = cell.querySelector("span");
  span.textContent = letter || "";
}

function clearRow(row) {
  for (let col = 0; col < wordLength; col++) {
    const cell = getCell(row, col);
    if (!cell) continue;
    const span = cell.querySelector("span");
    span.textContent = "";
    cell.classList.remove("correct", "present", "absent");
  }
}

// Mets la première lettre sur toutes les lignes (style Tusmo)
function fillFirstLetters() {
  for (let row = 0; row < maxAttempts; row++) {
    setCellLetter(row, 0, firstLetter);
  }
}

// Affiche currentGuess dans la ligne courante
function renderCurrentGuessRow() {
  clearRow(currentAttempt);
  // Remet la première lettre fixe
  setCellLetter(currentAttempt, 0, firstLetter);

  for (let i = 1; i < currentGuess.length; i++) {
    if (i >= wordLength) break;
    setCellLetter(currentAttempt, i, currentGuess[i]);
  }
}

// ========================
// TIMER
// ========================
function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerDisplay.textContent = "00:00";
  startTime = null;
}

function startTimer() {
  resetTimer();
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsedMs = Date.now() - startTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    timerDisplay.textContent = `${minutes}:${seconds}`;
  }, 500);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ========================
// GESTION DE MANCHE
// ========================

function resetStateForNewRound(payload) {
  wordLength = payload.wordLength;
  maxAttempts = payload.maxAttempts;
  currentRound = payload.roundNumber || currentRound;
  maxRounds = payload.maxRounds || maxRounds;
  firstLetter = payload.firstLetter;
  currentAttempt = 0;
  hasFinished = false;

  currentGuess = firstLetter; // toujours commencer avec la 1ʳᵉ lettre
  showGameMessage("");
  eventsLog.innerHTML = "";

  roundDisplay.textContent = `${currentRound}/${maxRounds}`;

  createGrid();
  fillFirstLetters();
  renderCurrentGuessRow();
  startTimer();
}

// ========================
// LOBBY – ACTIONS
// ========================

createRoomBtn.addEventListener("click", () => {
  myNickname = nicknameInput.value.trim() || "Joueur";
  socket.emit("createRoom", { nickname: myNickname });
});

joinRoomBtn.addEventListener("click", () => {
  myNickname = nicknameInput.value.trim() || "Joueur";
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) {
    showLobbyMessage("Entre un code de salle.", true);
    return;
  }
  socket.emit("joinRoom", { roomCode: code, nickname: myNickname });
});

// ========================
// SAISIE CLAVIER DANS LA GRILLE
// ========================

function handleKeyDown(e) {
  // On ne gère que si on est en partie
  if (roomSection.style.display === "none") return;
  if (hasFinished) return;

  const key = e.key;

  // Lettre A-Z
  if (/^[a-zA-Zàâäéèêëîïôöùûüç]$/.test(key)) {
    if (currentGuess.length >= wordLength) return;
    // On garde la 1ʳᵉ lettre imposée
    if (currentGuess.length === 0) {
      currentGuess = firstLetter;
    }
    currentGuess += key.toUpperCase();
    renderCurrentGuessRow();
    return;
  }

  // Backspace : on efface, mais on laisse la première lettre
  if (key === "Backspace") {
    if (currentGuess.length > 1) {
      currentGuess = currentGuess.slice(0, -1);
      renderCurrentGuessRow();
    }
    e.preventDefault();
    return;
  }

  // Entrée : envoyer le mot
  if (key === "Enter") {
    if (currentGuess.length !== wordLength) {
      showGameMessage(`Le mot doit faire ${wordLength} lettres.`, true);
      return;
    }
    // Envoi au serveur
    socket.emit("submitGuess", {
      roomCode: currentRoomCode,
      guess: currentGuess,
    });
    // On attend la réponse "guessResult" ou "guessError" pour avancer
    return;
  }
}

window.addEventListener("keydown", handleKeyDown);

// ========================
// SOCKET.IO – ÉVÈNEMENTS
// ========================

socket.on("connect", () => {
  myId = socket.id;
  console.log("Connecté avec id :", myId);
});

socket.on("roomCreated", (data) => {
  currentRoomCode = data.roomCode;
  roomCodeDisplay.textContent = data.roomCode;
  inviteCodeSpan.textContent = data.roomCode;

  // Lien d'invite dynamique (fonctionne en local + sur Render)
  const base = window.location.origin;
  const inviteLink = `${base}/?room=${data.roomCode}`;
  directLinkInput.value = inviteLink;

  lobbySection.style.display = "none";
  roomSection.style.display = "block";

  resetStateForNewRound(data);
  showLobbyMessage("");

  logEvent(`Salle ${data.roomCode} créée.`);
});

socket.on("roomJoined", (data) => {
  currentRoomCode = data.roomCode;
  roomCodeDisplay.textContent = data.roomCode;
  inviteCodeSpan.textContent = data.roomCode;

  const base = window.location.origin;
  const inviteLink = `${base}/?room=${data.roomCode}`;
  directLinkInput.value = inviteLink;

  lobbySection.style.display = "none";
  roomSection.style.display = "block";

  resetStateForNewRound(data);
  showLobbyMessage("");

  logEvent(`Tu as rejoint la salle ${data.roomCode}.`);
});

socket.on("joinError", (data) => {
  showLobbyMessage(data.message || "Impossible de rejoindre la salle.", true);
});

socket.on("playerListUpdate", ({ players }) => {
  playersList.innerHTML = "";
  players.forEach((p) => {
    const li = document.createElement("li");
    let status = "en jeu";
    if (p.finished && p.won) {
      status = `✓ ${p.attempts} essai${p.attempts > 1 ? "s" : ""}`;
      if (p.durationSeconds != null) {
        status += `, ${p.durationSeconds}s`;
      }
    } else if (p.finished && !p.won) {
      status = "❌";
    }
    li.textContent = `${p.nickname} – ${status}`;
    playersList.appendChild(li);
  });
});

socket.on("guessError", (data) => {
  showGameMessage(data.message || "Mot invalide.", true);
});

socket.on("guessResult", (data) => {
  // On ne dessine QUE les tentatives du joueur courant → plus de décalage
  if (data.playerId !== myId) {
    return;
  }

  // Remplir la ligne courante avec le mot + les couleurs
  const guess = data.guess.toUpperCase();
  for (let col = 0; col < wordLength; col++) {
    const cell = getCell(currentAttempt, col);
    if (!cell) continue;
    const span = cell.querySelector("span");
    span.textContent = guess[col] || "";
    cell.classList.remove("correct", "present", "absent");
    const status = data.statuses[col];
    if (status === "correct") cell.classList.add("correct");
    else if (status === "present") cell.classList.add("present");
    else cell.classList.add("absent");
  }

  if (data.isCorrect) {
    hasFinished = true;
    stopTimer();
    showGameMessage("Bravo ! Tu as trouvé le mot !");
  } else {
    // Préparer la prochaine tentative
    currentAttempt += 1;
    if (currentAttempt >= maxAttempts) {
      hasFinished = true;
      showGameMessage("C'est fini pour cette manche.");
      return;
    }
    currentGuess = firstLetter;
    renderCurrentGuessRow();
  }
});

socket.on("playerSolved", (data) => {
  logEvent(
    `${data.nickname} a trouvé le mot en ${data.attempts} essai${
      data.attempts > 1 ? "s" : ""
    } (${data.durationSeconds}s)`
  );
  if (data.playerId === myId) {
    hasFinished = true;
    stopTimer();
  }
});

socket.on("playerFailed", (data) => {
  logEvent(`Mot non trouvé. Le mot était : ${data.secretWord}`);
});

socket.on("allSolved", (data) => {
  logEvent(
    `Tous les joueurs ont trouvé le mot "${data.secretWord}" pour la manche ${data.roundNumber}.`
  );
});

// Nouvelle manche (mot suivant)
newGameBtn.addEventListener("click", () => {
  if (!currentRoomCode) return;
  socket.emit("newGame", { roomCode: currentRoomCode });
});

socket.on("newGameStarted", (data) => {
  logEvent(
    `Nouvelle manche ! Un nouveau mot a été choisi (${data.wordLength} lettres).`
  );
  resetStateForNewRound(data);
});

socket.on("newGameError", (data) => {
  showGameMessage(
    data.message || "Impossible de lancer une nouvelle manche.",
    true
  );
});

// ========================
// Lien d’invitation auto-join depuis l’URL
// ========================
(function autoJoinFromURL() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  if (room) {
    // Pré-remplir, l'utilisateur n'a plus qu'à cliquer "Rejoindre"
    roomCodeInput.value = room.toUpperCase();
    showLobbyMessage(
      `Code pré-rempli depuis le lien d'invitation : ${room.toUpperCase()}`
    );
  }
})();
