// words.js

const WORD_LISTS = {
  6: [
    "POMMES",
    "PAPIER",
    "MARCHE",
    "SOLEIL",
    "NUAGES",
    "GARAGE",
    "LIVRES",
    "ORDRES",
    "FUMEUR",
    "AVIONS",
  ],
  7: ["ARBRENT", "CHEMINS", "VOITURE", "CHAISES", "LUMIERE", "FEUILLE"],
  8: ["ORDINATE", "MONTAGNE", "LANTERNE", "BIBLIOTE"],
  9: ["MUSICIENS", "TELEPHONE", "ORDINATEU"],
  10: ["ORDINATEUR", "PROGRAMMER", "CHOCOLATINE"],
};

const MIN_LETTERS = 6;
const MAX_LETTERS = 10;
const MAX_ROUNDS = 10;
const MAX_ATTEMPTS = 6;

function getRandomWord(length) {
  const list = WORD_LISTS[length];
  if (!list || list.length === 0) {
    throw new Error(`Aucun mot disponible pour la longueur ${length}.`);
  }
  const idx = Math.floor(Math.random() * list.length);
  return list[idx].toUpperCase();
}

function isValidWord(word) {
  // Normalisation
  const w = (word || "")
    .trim()
    .toUpperCase()
    .replace(/É|È|Ê/g, "E")
    .replace(/À|Â/g, "A")
    .replace(/Î/g, "I")
    .replace(/Ô/g, "O")
    .replace(/Û/g, "U");

  const len = w.length;

  // Longueur entre 6 et 10 lettres
  if (len < MIN_LETTERS || len > MAX_LETTERS) return false;

  // Uniquement des lettres A-Z
  if (!/^[A-Z]+$/.test(w)) return false;

  // ⚠️ MODE DEV :
  // Pour l’instant, on considère que tout mot bien formé est "valide".
  // (On branchera plus tard un vrai dictionnaire français libre.)
  return true;
}

module.exports = {
  WORD_LISTS,
  MIN_LETTERS,
  MAX_LETTERS,
  MAX_ROUNDS,
  MAX_ATTEMPTS,
  getRandomWord,
  isValidWord,
};
