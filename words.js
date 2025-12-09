// words.js
// Structure pour gérer des listes de mots par longueur.
// À TOI ensuite de remplacer/compléter WORD_LISTS avec un vrai dictionnaire libre.

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
  7: [
    "ARBRENT",
    "CHEMINS",
    "VOITURE",
    "CHAISES",
    "LUMIERE",
    "FEUILLE",
    "BONHEUR",
  ],
  8: ["ORDINATE", "MONTAGNE", "CARNETTE", "LANTERNE", "BIBLIOTE"],
  9: ["ABRICOTER", "MUSICIENS", "TELEPHONE", "ORDINATEU"],
  10: ["ORDINATEUR", "PROGRAMMER", "CHOCOLATINE", "ENVIRONNEME"],
};

// Paramètres globaux
const MIN_LETTERS = 6;
const MAX_LETTERS = 10;
const MAX_ROUNDS = 10; // 10 mots max
const MAX_ATTEMPTS = 6; // 6 essais max

function getRandomWord(length) {
  const list = WORD_LISTS[length];
  if (!list || list.length === 0) {
    throw new Error(`Aucun mot disponible pour la longueur ${length}.`);
  }
  const idx = Math.floor(Math.random() * list.length);
  return list[idx].toUpperCase();
}

function isValidWord(word) {
  const len = word.length;
  const list = WORD_LISTS[len];
  if (!list) return false;
  return list.includes(word.toUpperCase());
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
