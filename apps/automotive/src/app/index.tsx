import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { onboardingDone } from '../onboarding/done';

/** Primeira vez: onboarding. Depois: direto para o Mapa. */
export default function Index() {
  const [target, setTarget] = useState<'/onboarding' | '/mapa' | null>(null);
  useEffect(() => {
    onboardingDone().then((done) => setTarget(done ? '/mapa' : '/onboarding'));
  }, []);
  return target ? <Redirect href={target} /> : null;
}
