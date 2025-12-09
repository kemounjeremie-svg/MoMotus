// client.js

window.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // État local
  let currentRoomCode = null;
  let myNickname = "";
  let wordLength = 6;
  let maxAttempts = 6;
  let currentAttempt = 0;
  let firstLetter = "";
  let hasFinished = false;

  let timerInterval = null;
  let startTime = null;

  // Références DOM
  const lobbySection = document.getElementById("lobby");
  const lobbyMessage = document.getElementById("lobby-message");
  const nicknameInput = document.getElementById("nickname");
  const createRoomBtn = document.getElementById("create-room-btn");
  const joinRoomBtn = document.getElementById("join-room-btn");
  const roomCodeInput = document.getElementById("room-code-input");

  const roomSection = document.getElementById("room-section");
  const roomCodeDisplay = document.getElementById("room-code-display");
  const roomCodeInvite = document.getElementById("room-code-invite");
  const roundDisplay = document.getElementById("round-display");
  const maxRoundsDisplay = document.getElementById("max-rounds-display");
  const timerDisplay = document.getElementById("timer-display");
  const directLinkInput = document.getElementById("direct-link-input");

  const playersList = document.getElementById("players-list");
  const gridElement = document.getElementById("grid");
  const guessInput = document.getElementById("guess-input");
  const submitBtn = document.getElementById("submit-btn");
  const gameMessage = document.getElementById("game-message");
  const eventsLog = document.getElementById("events-log");
  const newGameBtn = document.getElementById("new-game-btn");

  // Helpers UI
  function showLobbyMessage(text, isError = false) {
    lobbyMessage.textContent = text;
    lobbyMessage.style.color = isError ? "#f97373" : "#e5e7eb";
  }

  function showGameMessage(text, isError = false) {
    gameMessage.textContent = text;
    gameMessage.style.color = isError ? "#f97373" : "#e5e7eb";
  }

  function logEvent(text) {
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

  function revealFirstLetters() {
    for (let row = 0; row < maxAttempts; row++) {
      const cell = getCell(row, 0);
      const span = cell.querySelector("span");
      span.textContent = firstLetter;
    }
  }

  function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    updateTimerDisplay(0);
  }

  function startTimer() {
    startTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay(0);
    timerInterval = setInterval(() => {
      if (hasFinished) return;
      const elapsedMs = Date.now() - startTime;
      updateTimerDisplay(elapsedMs);
    }, 500);
  }

  function updateTimerDisplay(elapsedMs) {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    timerDisplay.textContent = `${minutes}:${seconds}`;
  }

  function resetGameState() {
    currentAttempt = 0;
    hasFinished = false;
    showGameMessage("");
    eventsLog.innerHTML = "";
    guessInput.value = "";
    guessInput.disabled = false;
    submitBtn.disabled = false;
    resetTimer();
    startTimer();
  }

  function updateInviteLink(roomCode) {
    const origin = window.location.origin;
    const url = `${origin}/?room=${roomCode}`;
    directLinkInput.value = url;
  }

  // Actions
  function handleCreateRoom() {
    myNickname = nicknameInput.value.trim() || "Joueur";
    socket.emit("createRoom", { nickname: myNickname });
  }

  function handleJoinRoom() {
    myNickname = nicknameInput.value.trim() || "Joueur";
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!roomCode) {
      showLobbyMessage("Entre un code de salle.", true);
      return;
    }
    socket.emit("joinRoom", { roomCode, nickname: myNickname });
  }

  function handleSubmitGuess() {
    if (hasFinished || !currentRoomCode) return;
    const guess = guessInput.value.trim();
    if (!guess) {
      showGameMessage("Tape un mot avant de valider.", true);
      return;
    }
    socket.emit("submitGuess", {
      roomCode: currentRoomCode,
      guess,
    });
  }

  function handleNewGame() {
    if (!currentRoomCode) return;
    socket.emit("newGame", { roomCode: currentRoomCode });
  }

  // SOCKET.IO EVENTS

  socket.on(
    "roomCreated",
    ({
      roomCode,
      wordLength: wl,
      maxAttempts: ma,
      firstLetter: fl,
      roundNumber,
      maxRounds,
    }) => {
      currentRoomCode = roomCode;
      wordLength = wl;
      maxAttempts = ma;
      firstLetter = fl;

      lobbySection.style.display = "none";
      roomSection.style.display = "block";

      roomCodeDisplay.textContent = roomCode;
      roomCodeInvite.textContent = roomCode;
      roundDisplay.textContent = roundNumber;
      maxRoundsDisplay.textContent = maxRounds;
      updateInviteLink(roomCode);

      createGrid();
      revealFirstLetters();
      resetGameState();

      showGameMessage("Partie créée. Tu peux déjà jouer et inviter tes amis !");
      logEvent(`Tu as créé la salle ${roomCode}.`);
      guessInput.focus();
    }
  );

  socket.on(
    "roomJoined",
    ({
      roomCode,
      wordLength: wl,
      maxAttempts: ma,
      firstLetter: fl,
      roundNumber,
      maxRounds,
    }) => {
      currentRoomCode = roomCode;
      wordLength = wl;
      maxAttempts = ma;
      firstLetter = fl;

      lobbySection.style.display = "none";
      roomSection.style.display = "block";

      roomCodeDisplay.textContent = roomCode;
      roomCodeInvite.textContent = roomCode;
      roundDisplay.textContent = roundNumber;
      maxRoundsDisplay.textContent = maxRounds;
      updateInviteLink(roomCode);

      createGrid();
      revealFirstLetters();
      resetGameState();

      showGameMessage("Partie rejointe ! Essaie de trouver le mot.");
      logEvent(`Tu as rejoint la salle ${roomCode}.`);
      guessInput.focus();
    }
  );

  socket.on("joinError", ({ message }) => {
    showLobbyMessage(message, true);
  });

  socket.on("playerListUpdate", ({ players }) => {
    playersList.innerHTML = "";
    players.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p.nickname;

      const statusSpan = document.createElement("span");
      statusSpan.classList.add("status");

      if (p.won) {
        if (p.durationSeconds != null) {
          statusSpan.textContent = `✔ ${p.attempts} essais, ${p.durationSeconds}s`;
        } else {
          statusSpan.textContent = `✔ ${p.attempts} essais`;
        }
      } else if (p.finished) {
        statusSpan.textContent = `✖ (${p.attempts} essais)`;
      } else if (p.attempts > 0) {
        statusSpan.textContent = `${p.attempts} essais`;
      } else {
        statusSpan.textContent = `en jeu`;
      }

      li.appendChild(statusSpan);
      playersList.appendChild(li);
    });
  });

  socket.on("guessError", ({ message }) => {
    showGameMessage(message, true);
  });

  socket.on(
    "guessResult",
    ({ playerId, nickname, guess, statuses, attempts, isCorrect }) => {
      if (playerId === socket.id) {
        const row = currentAttempt;
        if (row >= maxAttempts) return;

        for (let col = 0; col < wordLength; col++) {
          const cell = getCell(row, col);
          const span = cell.querySelector("span");

          if (col === 0) {
            span.textContent = firstLetter;
            continue;
          }

          span.textContent = guess[col] || "";
          cell.classList.add("revealed");
          cell.classList.remove("correct", "present", "absent");
          cell.classList.add(statuses[col]);
        }

        currentAttempt++;

        if (!isCorrect) {
          showGameMessage(`Essai ${attempts} / ${maxAttempts}`);
          guessInput.value = "";
          guessInput.focus();
        } else {
          hasFinished = true;
          guessInput.disabled = true;
          submitBtn.disabled = true;
          showGameMessage("Bravo ! Tu as trouvé le mot !");
          logEvent(`Tu as trouvé le mot en ${attempts} essais.`);
        }
      } else {
        if (isCorrect) {
          logEvent(`${nickname} a trouvé le mot !`);
        } else {
          logEvent(`${nickname} tente "${guess}".`);
        }
      }
    }
  );

  socket.on("playerSolved", ({ nickname, attempts, durationSeconds }) => {
    logEvent(
      `${nickname} a trouvé le mot en ${attempts} essais et ${durationSeconds}s.`
    );
  });

  socket.on("allSolved", ({ secretWord, roundNumber }) => {
    showGameMessage(
      `Tous les joueurs ont trouvé le mot "${secretWord}" (manche ${roundNumber}). Tu peux lancer la manche suivante.`
    );
    logEvent(`Tous les joueurs ont trouvé le mot "${secretWord}".`);
  });

  socket.on("playerFailed", ({ secretWord }) => {
    hasFinished = true;
    guessInput.disabled = true;
    submitBtn.disabled = true;
    showGameMessage(`C'est raté ! Le mot était "${secretWord}".`);
    logEvent(`Tu as épuisé tes essais, le mot était "${secretWord}".`);
  });

  socket.on(
    "newGameStarted",
    ({
      roomCode,
      wordLength: wl,
      maxAttempts: ma,
      firstLetter: fl,
      roundNumber,
      maxRounds,
    }) => {
      currentRoomCode = roomCode;
      wordLength = wl;
      maxAttempts = ma;
      firstLetter = fl;

      roomCodeDisplay.textContent = roomCode;
      roomCodeInvite.textContent = roomCode;
      roundDisplay.textContent = roundNumber;
      maxRoundsDisplay.textContent = maxRounds;
      updateInviteLink(roomCode);

      createGrid();
      revealFirstLetters();
      resetGameState();

      showGameMessage("Nouvelle manche ! Un nouveau mot a été choisi.");
      logEvent(`Nouvelle manche : mot de ${wordLength} lettres.`);
      guessInput.focus();
    }
  );

  socket.on("newGameError", ({ message }) => {
    showGameMessage(message, true);
  });

  // Événements DOM
  createRoomBtn.addEventListener("click", handleCreateRoom);
  joinRoomBtn.addEventListener("click", handleJoinRoom);
  newGameBtn.addEventListener("click", handleNewGame);

  guessInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleSubmitGuess();
    }
  });

  submitBtn.addEventListener("click", handleSubmitGuess);

  // Si on arrive avec ?room=CODE dans l'URL, on pré-remplit le champ
  const params = new URLSearchParams(window.location.search);
  const preRoom = params.get("room");
  if (preRoom) {
    roomCodeInput.value = preRoom.toUpperCase();
    showLobbyMessage(
      "Salle pré-remplie. Entre ton pseudo et clique sur Rejoindre."
    );
  }
});
