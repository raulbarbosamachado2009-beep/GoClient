import { type AudioPlayer, createAudioPlayer } from 'expo-audio';

/**
 * Som dos botões importantes (pedido de 27/11/2026): um toque curto de vidro, simples e
 * baixo (~0,16 s, feito para o GoClient em `assets/sounds/tap.wav`). Só nos botões que
 * confirmam algo (Continuar, Iniciar, Pagamento, Concluir, Imprimir...), nunca em listas.
 * Ele mistura com a música e a navegação; se o aparelho não tocar, segue sem som.
 */
let player: AudioPlayer | null = null;
let last = 0;

export function playTap() {
  const now = Date.now();
  if (now - last < 60) return; // dois toques colados soam como um só
  last = now;
  try {
    if (!player) {
      player = createAudioPlayer(require('../../assets/sounds/tap.wav'));
      player.volume = 0.55;
    }
    void player.seekTo(0);
    player.play();
  } catch {
    // Sem áudio (ex.: navegador bloqueou): o botão funciona igual.
  }
}
