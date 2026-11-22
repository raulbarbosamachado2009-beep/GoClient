import { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, View } from 'react-native';
import { useTabBarSpace } from '../../layout/form-factor';
import { type KyteDiagnosis, kyteAgent } from '../agent';
import { PREVIEW } from '../store';
import { Header, KY, SmallButton, Text, useKySize } from '../ui';
import { useKyteNav } from './nav';

/** Texto do diagnóstico: só caminhos, nomes de campos e quantidades (nenhum valor). */
export function diagnosisText(d: KyteDiagnosis): string {
  const out = [
    `GoClient · diagnóstico do Kyte · ${new Date().toLocaleString('pt-BR')}`,
    `Página: ${d.page}`,
    `Achados: ${d.counts.product ?? 0} produtos, ${d.counts.customer ?? 0} clientes, ${d.counts.sale ?? 0} vendas`,
    '',
    '— Respostas do servidor —',
  ];
  for (const e of d.endpoints) {
    out.push(`${e.path} (${e.hits}x) topo: ${(e.top ?? []).join(', ')}`);
    for (const l of e.lists)
      out.push(`   lista ${l.size} [${l.kind ?? '?'}]: ${l.keys.join(', ')}`);
  }
  out.push('', '— Banco local —');
  for (const t of d.idb)
    out.push(`${t.db}/${t.store} ${t.size} [${t.kind ?? '?'}]: ${t.keys.join(', ')}`);
  out.push('', `localStorage: ${d.localStorage.join(', ')}`);
  return out.join('\n');
}

/** Diagnóstico: mostra como o Kyte entrega os dados, para ajustar o leitor se preciso. */
export function DiagnosticScreen() {
  const s = useKySize();
  const nav = useKyteNav();
  const tabSpace = useTabBarSpace();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      setText(diagnosisText(await kyteAgent.diagnose()));
    } catch (e) {
      setText(e instanceof Error ? e.message : 'Não consegui ler o Kyte agora.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header title="Diagnóstico do Kyte" onBack={nav.back} />
      <ScrollView
        contentContainerStyle={{
          padding: s.pad,
          paddingTop: 0,
          gap: 18,
          paddingBottom: tabSpace + 30,
        }}
      >
        <Text size={s.body} color={KY.sub}>
          Mostra só os nomes dos campos e quantidades que o Kyte manda — nenhum valor (nomes,
          telefones, preços). Toque em Compartilhar e mande o texto para ajustar a leitura.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {busy ? (
            <ActivityIndicator color={KY.green} size="large" />
          ) : (
            <SmallButton
              label={PREVIEW ? 'Só no app instalado' : 'Ler agora'}
              icon="pulse-outline"
              tone="green"
              onPress={() => !PREVIEW && run()}
            />
          )}
          {text && (
            <SmallButton
              label="Compartilhar"
              icon="share-social-outline"
              onPress={() => Share.share({ message: text })}
            />
          )}
        </View>
        {text && (
          <View style={{ backgroundColor: KY.card, borderRadius: 16, padding: 20 }}>
            <Text size={s.small} style={{ fontFamily: 'monospace' }}>
              {text}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
