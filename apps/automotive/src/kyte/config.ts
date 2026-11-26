/**
 * Endereço oficial de login do Kyte Web (link "Acessar o Kyte" de kyteapp.com/pt).
 * O login acontece na página do próprio Kyte: o GoClient nunca vê nem guarda a senha.
 */
export const KYTE_WEB_URL = 'https://web.auth.kyteapp.com/pt-br/signin';

/**
 * O Kyte mostra a versão para computador (Kyte Web, plano GROW) a navegadores de desktop.
 * Na multimídia (Android) a janela se apresenta como Chrome de desktop para receber essa
 * versão em vez da página que manda instalar o app.
 */
export const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
