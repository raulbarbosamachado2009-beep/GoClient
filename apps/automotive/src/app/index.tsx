import { Redirect } from 'expo-router';

/** O protótipo começa sempre pelo onboarding. */
export default function Index() {
  return <Redirect href="/onboarding" />;
}
