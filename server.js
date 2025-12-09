// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
  getRandomWord,
  isValidWord,
  MIN_LETTERS,
  MAX_LETTERS,
  MAX_ROUNDS,
  MAX_ATTEMPTS,
} = require("./words");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// IMPORTANT pour l'hébergeur : on prend le port dans les variables d'env
const PORT = process.env.PORT || 3000;

// Structure d'une room :
// roomCode: {
//   secretWord,
//   wordLength,   // longueur du mot actuel
//   maxAttempts,  // toujours 6
//   roundIndex,   // 0 → 1er mot, 1 → 2ème, ...
//   maxRounds,    // 10
//   players: {
//     socketId: { nickname, attempts, finished, won, startTime, endTime, durationMs }
//   },
//   createdAt,
// }
const rooms = {};

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function evalWordLengthForRound(roundIndex) {
  // roundIndex 0 → 6 lettres
  // roundIndex 1 → 7
  // roundIndex 2 → 8
  // roundIndex 3 → 9
  // roundIndex >=4 → 10 lettres (max)
  const base = MIN_LETTERS + roundIndex;
  return base > MAX_LETTERS ? MAX_LETTERS : base;
}

function evaluateGuess(secretWord, guess) {
  const result = new Array(secretWord.length).fill("absent");
  const letterCount = {};

  for (const ch of secretWord) {
    letterCount[ch] = (letterCount[ch] || 0) + 1;
  }

  // correct (verts)
  for (let i = 0; i < secretWord.length; i++) {
    if (guess[i] === secretWord[i]) {
      result[i] = "correct";
      letterCount[guess[i]]--;
    }
  }

  // present (jaunes)
  for (let i = 0; i < secretWord.length; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i];
    if (letterCount[ch] > 0) {
      result[i] = "present";
      letterCount[ch]--;
    }
  }

  return result;
}

function normalizeGuess(str) {
  return (str || "")
    .trim()
    .toUpperCase()
    .replace(/É|È|Ê/g, "E")
    .replace(/À|Â/g, "A")
    .replace(/Î/g, "I")
    .replace(/Ô/g, "O")
    .replace(/Û/g, "U");
}

function formatPlayers(roomCode) {
  const room = rooms[roomCode];
  if (!room) return [];
  return Object.entries(room.players).map(([id, p]) => ({
    id,
    nickname: p.nickname,
    attempts: p.attempts,
    finished: p.finished,
    won: p.won,
    durationSeconds: p.durationMs ? Math.floor(p.durationMs / 1000) : null,
  }));
}

io.on("connection", (socket) => {
  console.log("Nouveau client :", socket.id);

  socket.on("createRoom", ({ nickname }) => {
    const roomCode = generateRoomCode();

    const roundIndex = 0;
    const wordLength = evalWordLengthForRound(roundIndex);
    const secretWord = getRandomWord(wordLength);

    rooms[roomCode] = {
      secretWord,
      wordLength,
      maxAttempts: MAX_ATTEMPTS,
      roundIndex,
      maxRounds: MAX_ROUNDS,
      players: {},
      createdAt: Date.now(),
    };

    rooms[roomCode].players[socket.id] = {
      nickname: nickname || "Joueur",
      attempts: 0,
      finished: false,
      won: false,
      startTime: Date.now(),
      endTime: null,
      durationMs: null,
    };

    socket.join(roomCode);

    socket.emit("roomCreated", {
      roomCode,
      wordLength,
      maxAttempts: MAX_ATTEMPTS,
      firstLetter: secretWord[0],
      roundNumber: roundIndex + 1,
      maxRounds: MAX_ROUNDS,
    });

    io.to(roomCode).emit("playerListUpdate", {
      players: formatPlayers(roomCode),
    });

    console.log(
      `Room ${roomCode} créée : mot "${secretWord}" (${wordLength} lettres)`
    );
  });

  socket.on("joinRoom", ({ roomCode, nickname }) => {
    roomCode = (roomCode || "").toUpperCase().trim();

    const room = rooms[roomCode];
    if (!room) {
      socket.emit("joinError", { message: "Salle introuvable." });
      return;
    }

    socket.join(roomCode);

    room.players[socket.id] = {
      nickname: nickname || "Joueur",
      attempts: 0,
      finished: false,
      won: false,
      startTime: Date.now(),
      endTime: null,
      durationMs: null,
    };

    socket.emit("roomJoined", {
      roomCode,
      wordLength: room.wordLength,
      maxAttempts: room.maxAttempts,
      firstLetter: room.secretWord[0],
      roundNumber: room.roundIndex + 1,
      maxRounds: room.maxRounds,
    });

    io.to(roomCode).emit("playerListUpdate", {
      players: formatPlayers(roomCode),
    });

    console.log(`${nickname} a rejoint ${roomCode}`);
  });

  socket.on("submitGuess", ({ roomCode, guess }) => {
    roomCode = (roomCode || "").toUpperCase().trim();
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players[socket.id];
    if (!player || player.finished) return;

    const normalizedGuess = normalizeGuess(guess);

    // Longueur incorrecte
    if (normalizedGuess.length !== room.wordLength) {
      socket.emit("guessError", {
        message: `Le mot doit faire ${room.wordLength} lettres.`,
      });
      return;
    }

    // Première lettre incorrecte
    if (normalizedGuess[0] !== room.secretWord[0]) {
      socket.emit("guessError", {
        message: `Le mot doit commencer par "${room.secretWord[0]}".`,
      });
      return;
    }

    // Vérification dictionnaire : un mot inexistant ne compte PAS comme essai
    if (!isValidWord(normalizedGuess)) {
      socket.emit("guessError", {
        message: `Ce mot n'existe pas dans le dictionnaire français (il ne compte pas comme un essai).`,
      });
      return;
    }

    // À partir d'ici : le mot est valide → on consomme un essai
    player.attempts += 1;

    const statuses = evaluateGuess(room.secretWord, normalizedGuess);
    const isCorrect = normalizedGuess === room.secretWord;

    if (isCorrect) {
      player.finished = true;
      player.won = true;
      player.endTime = Date.now();
      player.durationMs = player.endTime - player.startTime;

      const durationSeconds = Math.floor(player.durationMs / 1000);

      io.to(roomCode).emit("playerSolved", {
        playerId: socket.id,
        nickname: player.nickname,
        attempts: player.attempts,
        durationSeconds,
        secretWord: room.secretWord,
      });

      // Vérifier si tous les joueurs ont trouvé pour ce mot
      const allSolved =
        Object.values(room.players).length > 0 &&
        Object.values(room.players).every((p) => p.won);

      if (allSolved) {
        io.to(roomCode).emit("allSolved", {
          secretWord: room.secretWord,
          roundNumber: room.roundIndex + 1,
        });
      }
    }

    // Si le joueur a atteint les 6 essais sans trouver, on le marque comme "finished"
    if (!isCorrect && player.attempts >= room.maxAttempts) {
      player.finished = true;
      io.to(socket.id).emit("playerFailed", {
        secretWord: room.secretWord,
      });
    }

    io.to(roomCode).emit("guessResult", {
      playerId: socket.id,
      nickname: player.nickname,
      guess: normalizedGuess,
      statuses,
      attempts: player.attempts,
      isCorrect,
    });

    io.to(roomCode).emit("playerListUpdate", {
      players: formatPlayers(roomCode),
    });
  });

  // Nouvelle partie (mot suivant de la défense)
  socket.on("newGame", ({ roomCode }) => {
    roomCode = (roomCode || "").toUpperCase().trim();
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("newGameError", { message: "Salle introuvable." });
      return;
    }

    // On ne passe au mot suivant que si tous ont trouvé (won = true)
    const allSolved =
      Object.values(room.players).length > 0 &&
      Object.values(room.players).every((p) => p.won);

    if (!allSolved) {
      socket.emit("newGameError", {
        message: "Tous les joueurs n'ont pas encore trouvé le mot.",
      });
      return;
    }

    // Limite à 10 mots max
    if (room.roundIndex + 1 >= room.maxRounds) {
      socket.emit("newGameError", {
        message: "Nombre maximum de mots atteint pour cette partie (10).",
      });
      return;
    }

    room.roundIndex += 1;
    const newLength = evalWordLengthForRound(room.roundIndex);
    room.wordLength = newLength;
    room.secretWord = getRandomWord(newLength);
    room.createdAt = Date.now();

    // Reset des joueurs pour ce nouveau mot
    for (const playerId of Object.keys(room.players)) {
      room.players[playerId].attempts = 0;
      room.players[playerId].finished = false;
      room.players[playerId].won = false;
      room.players[playerId].startTime = Date.now();
      room.players[playerId].endTime = null;
      room.players[playerId].durationMs = null;
    }

    io.to(roomCode).emit("newGameStarted", {
      roomCode,
      wordLength: room.wordLength,
      maxAttempts: room.maxAttempts,
      firstLetter: room.secretWord[0],
      roundNumber: room.roundIndex + 1,
      maxRounds: room.maxRounds,
    });

    io.to(roomCode).emit("playerListUpdate", {
      players: formatPlayers(roomCode),
    });

    console.log(
      `Nouvelle manche dans ${roomCode} : mot "${room.secretWord}" (${
        room.wordLength
      } lettres), manche ${room.roundIndex + 1}/${room.maxRounds}`
    );
  });

  socket.on("disconnect", () => {
    console.log("Client déconnecté :", socket.id);
    for (const roomCode of Object.keys(rooms)) {
      const room = rooms[roomCode];
      if (room.players[socket.id]) {
        delete room.players[socket.id];

        io.to(roomCode).emit("playerListUpdate", {
          players: formatPlayers(roomCode),
        });

        if (Object.keys(room.players).length === 0) {
          delete rooms[roomCode];
          console.log(`Room ${roomCode} supprimée (vide).`);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Serveur Tusmo multi sur http://localhost:${PORT}`);
});
