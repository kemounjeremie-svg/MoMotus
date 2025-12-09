const socket = io();

// —————————————————————————————
//   Récupération du code room dans l’URL
// —————————————————————————————
const urlParams = new URLSearchParams(window.location.search);
let roomCode = urlParams.get("room");

// Si salle non spécifiée → création automatique
if (!roomCode) {
  roomCode = generateRoomCode(5);
  window.location.href = `${window.location.origin}/?room=${roomCode}`;
}

// —————————————————————————————
//   Connexion à la salle
// —————————————————————————————
socket.emit("joinRoom", roomCode);

// —————————————————————————————
//   Affichage du lien d’invitation
// —————————————————————————————
const inviteCodeSpan = document.getElementById("inviteCode");
const directLinkInput = document.getElementById("directLink");

inviteCodeSpan.textContent = roomCode;
directLinkInput.value = `${window.location.origin}/?room=${roomCode}`;

// Bouton pour copier
document.getElementById("copyLink").addEventListener("click", () => {
  navigator.clipboard.writeText(directLinkInput.value);
  alert("Lien copié !");
});

// —————————————————————————————
//   Fonction pour générer les codes de salle
// —————————————————————————————
function generateRoomCode(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// —————————————————————————————
// Le reste de ton code (grille, essais, timer, etc.)
// —————————————————————————————
