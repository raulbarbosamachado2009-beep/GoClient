import { Redirect } from 'expo-router';

/** Endereço desconhecido: volta ao início do protótipo. */
export default function NotFound() {
  return <Redirect href="/onboarding" />;
}
