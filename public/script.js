// Paramètres du jeu
const WORD_LENGTH = 6;
const MAX_ATTEMPTS = 8;

// Liste de mots (sans accents, 6 lettres, en majuscules)
const WORDS = [
  "POMMES",
  "PAPIER",
  "CHIENN",
  "ORDRES",
  "MARCHE",
  "DANSES",
  "LIVRES",
  "JOURNE",
  "FUMEUR",
  "TRAINN",
  "GUITAR",
  "AVIONS",
  "SOLEIL",
  "NUAGES",
  "RIVIER",
  "GARAGE"
].map(w => w.toUpperCase());

let secretWord = "";
let currentAttempt = 0;
let gridElement;
let messageElement;
let inputElement;
let restartBtn;
let isGameOver = false;

function pickRandomWord() {
  const idx = Math.floor(Math.random() * WORDS.length);
  return WORDS[idx];
}

function createGrid() {
  gridElement.innerHTML = "";
  for (let row = 0; row < MAX_ATTEMPTS; row++) {
    for (let col = 0; col < WORD_LENGTH; col++) {
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

function revealFirstLetters() {
  for (let row = 0; row < MAX_ATTEMPTS; row++) {
    const cell = getCell(row, 0);
    const span = cell.querySelector("span");
    span.textContent = secretWord[0];
  }
}

function getCell(row, col) {
  return gridElement.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function showMessage(text, isError = false) {
  messageElement.textContent = text;
  messageElement.style.color = isError ? "#f97373" : "#e5e7eb";
}

function normalizeGuess(raw) {
  return raw
    .trim()
    .toUpperCase()
    .replaceAll("É","E")
    .replaceAll("È","E")
    .replaceAll("Ê","E")
    .replaceAll("À","A")
    .replaceAll("Â","A")
    .replaceAll("Î","I")
    .replaceAll("Ô","O")
    .replaceAll("Û","U");
}

function handleSubmit() {
  if (isGameOver) return;

  let guess = normalizeGuess(inputElement.value);
  if (guess.length !== WORD_LENGTH) {
    showMessage(`Le mot doit faire ${WORD_LENGTH} lettres.`, true);
    return;
  }

  if (guess[0] !== secretWord[0]) {
    showMessage(`Le mot doit commencer par "${secretWord[0]}".`, true);
    return;
  }

  // Optionnel : vérifier que le mot est dans la liste
  // if (!WORDS.includes(guess)) { ... }

  // Afficher les lettres dans la ligne courante
  for (let col = 0; col < WORD_LENGTH; col++) {
    const cell = getCell(currentAttempt, col);
    const span = cell.querySelector("span");

    // On protège la première lettre, déjà affichée
    if (col === 0) {
      span.textContent = secretWord[0];
      continue;
    }

    span.textContent = guess[col] || "";
    cell.classList.add("revealed");
  }

  // Coloration façon Wordle/Tusmo
  colorizeRow(guess, currentAttempt);

  if (guess === secretWord) {
    showMessage(`Bravo ! Le mot était "${secretWord}".`);
    endGame();
    return;
  }

  currentAttempt++;

  if (currentAttempt >= MAX_ATTEMPTS) {
    showMessage(`Perdu ! Le mot était "${secretWord}".`);
    endGame();
    return;
  }

  inputElement.value = "";
  inputElement.focus();
  showMessage(`Essai ${currentAttempt + 1} / ${MAX_ATTEMPTS}`);
}

function colorizeRow(guess, row) {
  // On utilise une logique de "compte" pour bien gérer les doublons
  const secretLetters = secretWord.split("");
  const letterCount = {};

  secretLetters.forEach(ch => {
    letterCount[ch] = (letterCount[ch] || 0) + 1;
  });

  // 1er passage : on met les verts
  const result = new Array(WORD_LENGTH).fill("absent");
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === secretWord[i]) {
      result[i] = "correct";
      letterCount[guess[i]]--;
    }
  }

  // 2e passage : on met les jaunes
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i];
    if (letterCount[ch] > 0) {
      result[i] = "present";
      letterCount[ch]--;
    }
  }

  // Application aux cases (on garde col=0 neutre, déjà connu)
  for (let col = 0; col < WORD_LENGTH; col++) {
    const cell = getCell(row, col);
    if (col === 0) continue; // première lettre révélée, on ne la colore pas
    cell.classList.remove("correct", "present", "absent");
    cell.classList.add(result[col]);
  }
}

function endGame() {
  isGameOver = true;
  restartBtn.style.display = "block";
  inputElement.disabled = true;
}

function restartGame() {
  secretWord = pickRandomWord();
  currentAttempt = 0;
  isGameOver = false;
  inputElement.disabled = false;
  inputElement.value = "";
  restartBtn.style.display = "none";
  showMessage("");

  createGrid();
  revealFirstLetters();
  inputElement.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  gridElement = document.getElementById("grid");
  messageElement = document.getElementById("message");
  inputElement = document.getElementById("guess-input");
  const submitBtn = document.getElementById("submit-btn");
  restartBtn = document.getElementById("restart-btn");

  submitBtn.addEventListener("click", handleSubmit);
  restartBtn.addEventListener("click", restartGame);

  inputElement.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  });

  restartGame();
});
