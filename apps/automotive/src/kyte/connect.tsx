import { AppIntro, type IntroFeature } from '../ui/app-intro';
import { KyteLogo } from '../ui/brand';

const FEATURES: IntroFeature[] = [
  {
    icon: 'people',
    title: 'Clientes e produtos',
    text: 'A sua carteira e o seu catálogo do Kyte, sempre à mão.',
  },
  {
    icon: 'receipt',
    title: 'Pedidos e vendas',
    text: 'Acompanhe o que foi vendido sem sair do GoClient.',
  },
  {
    icon: 'lock-closed',
    title: 'Sua senha fica com o Kyte',
    text: 'Você entra na página oficial do Kyte. O GoClient não vê nem guarda a senha.',
  },
];

/**
 * Apresentação do Kyte antes do login, no estilo das telas de boas-vindas da Apple: ícone,
 * título, três destaques e um único botão. Por enquanto só e-mail e senha: o login do Google
 * não funciona dentro de janelas embutidas em apps. O botão abre a página oficial de login do
 * Kyte; a senha é digitada lá, nunca aqui.
 */
export function KyteConnect({ onOpen }: { onOpen: () => void }) {
  return (
    <AppIntro
      logo={(size) => <KyteLogo size={size} />}
      title="Kyte no GoClient"
      lead="Entre na sua conta do Kyte para trazer o seu PDV para dentro do app."
      features={FEATURES}
      button="Continuar com e-mail"
      note="Por enquanto, só e-mail e senha. A entrada com o Google não funciona dentro de outros apps."
      accent="#0A84FF"
      onOpen={onOpen}
    />
  );
}
