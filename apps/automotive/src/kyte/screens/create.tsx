import { can } from '@goclient/core';
import { useState } from 'react';
import { Platform, ScrollView, TextInput, View } from 'react-native';
import { usePhone, useTabBarSpace } from '../../layout/form-factor';
import { FONT } from '../../theme';
import { Appear } from '../../ui/motion';
import { kyteAgent, kyteAgentAvailable, kyteLogged } from '../agent';
import { brl } from '../model';
import { GreenButton, Header, KIcon, KY, Tabs, Text, useKySize } from '../ui';
import { useKyteNav } from './nav';

/**
 * Cadastro manual de clientes e produtos, decidido por `can()` (`@goclient/core`). A Regra 1
 * (bloqueio no carro) foi retirada: o "+" abre o cadastro no celular e na multimídia.
 */
export function useCanCreate(resource: 'customer' | 'product'): boolean {
  const phone = usePhone();
  return can(
    { role: 'seller', platform: phone ? 'mobile' : 'automotive', channel: 'manual' },
    resource,
    'create',
  ).allowed;
}

/** Campo sublinhado do Kyte: rótulo como placeholder e linha que fica verde no foco. */
function Field({
  label,
  value,
  onChange,
  keyboard,
  left,
  right,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'default' | 'phone-pad' | 'decimal-pad';
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const s = useKySize();
  const [focus, setFocus] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderBottomWidth: 2,
        borderBottomColor: focus ? KY.green : '#B8C0CB',
        height: s.phone ? 84 : 104,
      }}
    >
      {left}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={KY.faint}
        keyboardType={keyboard ?? 'default'}
        accessibilityLabel={label}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[
          {
            flex: 1,
            minWidth: 0,
            height: '100%',
            color: KY.ink,
            fontFamily: FONT.displayRegular,
            fontSize: s.body + 2,
          },
          (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object,
        ]}
      />
      {right}
    </View>
  );
}

/** Salva pelo Kyte (janela invisível) no app; no Preview, só mostra como ficaria. */
function useSave() {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const run = (job: () => Promise<unknown>, done: string) => {
    if (state === 'saving') return;
    if (!(kyteAgentAvailable() && kyteLogged())) {
      setState('done');
      setMsg(`${done} (exemplo do Preview: nada foi gravado no Kyte).`);
      return;
    }
    setState('saving');
    setMsg('Salvando no Kyte…');
    job()
      .then(() => {
        setState('done');
        setMsg(done);
      })
      .catch((e: Error) => {
        setState('error');
        setMsg(`Não consegui salvar no Kyte: ${e.message}`);
      });
  };
  return { state, msg, run };
}

function Notice({ text, error }: { text: string; error?: boolean }) {
  const s = useKySize();
  return (
    <Appear distance={8}>
      <View
        style={{
          backgroundColor: error ? '#FDECEC' : '#E6FAF4',
          borderRadius: s.phone ? 14 : 20,
          padding: s.phone ? 16 : 22,
        }}
      >
        <Text size={s.sub} weight="medium" color={error ? KY.red : KY.greenInk}>
          {text}
        </Text>
      </View>
    </Appear>
  );
}

/** "Novo produto": cadastro com nome e preço de venda, como no Kyte. */
export function NewProduct() {
  const s = useKySize();
  const nav = useKyteNav();
  const tabSpace = useTabBarSpace();
  const [tab, setTab] = useState<'cadastro' | 'estoque'>('cadastro');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const save = useSave();
  const value = Number(price.replace(/\./g, '').replace(',', '.')) || 0;
  const ready = !!name.trim() && value > 0;
  const card = s.phone ? 260 : 340;
  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header title="Novo produto" onBack={nav.back} />
      <View style={{ paddingHorizontal: s.pad, paddingBottom: 12 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'cadastro', label: 'CADASTRO', icon: 'create-outline' },
            { key: 'estoque', label: 'ESTOQUE', icon: 'storefront-outline' },
          ]}
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: s.pad,
          paddingTop: 4,
          gap: 16,
          paddingBottom: tabSpace + 30,
        }}
      >
        {tab === 'cadastro' ? (
          <>
            {/* Prévia do produto (como aparece na lista do Kyte). */}
            <View
              style={{
                backgroundColor: KY.chip,
                borderRadius: s.radius,
                paddingVertical: 24,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: card,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#525C6E',
                }}
              >
                <View
                  style={{ height: card * 0.42, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text size={s.big} weight="semibold" color="#FFFFFF" lines={1}>
                    {name.trim() ? name.trim().split(' ')[0] : 'Nome'}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#46505F', padding: 14 }}>
                  <Text size={s.sub} weight="semibold" color="#FFFFFF" lines={1}>
                    {name.trim() || 'Nome do produto'}
                  </Text>
                  <Text size={s.sub} color="#FFFFFF">
                    {brl(value)}
                  </Text>
                </View>
              </View>
            </View>
            <View
              style={{
                backgroundColor: KY.card,
                borderRadius: s.radius,
                paddingHorizontal: s.pad,
                paddingBottom: 18,
              }}
            >
              <Field label="Nome do Produto" value={name} onChange={setName} />
              <Field
                label="Preço de Venda"
                value={price}
                onChange={(t) => setPrice(t.replace(/[^\d,.]/g, ''))}
                keyboard="decimal-pad"
                left={
                  value || price ? (
                    <Text size={s.body} color={KY.sub}>
                      R$
                    </Text>
                  ) : undefined
                }
              />
            </View>
          </>
        ) : (
          <View
            style={{ backgroundColor: KY.card, borderRadius: s.radius, padding: s.pad, gap: 8 }}
          >
            <Text size={s.row} weight="semibold">
              Estoque
            </Text>
            <Text size={s.sub} color={KY.sub}>
              O controle de estoque é ligado no próprio Kyte, depois de salvar o produto.
            </Text>
          </View>
        )}
        {save.msg && <Notice text={save.msg} error={save.state === 'error'} />}
        {save.state === 'done' ? (
          <GreenButton label="Voltar aos produtos" onPress={nav.back} />
        ) : (
          <GreenButton
            label={save.state === 'saving' ? 'Salvando…' : 'Adicionar produto'}
            onPress={() =>
              ready &&
              save.run(
                () =>
                  kyteAgent.createProduct({
                    name: name.trim(),
                    price: brl(value).replace('R$', '').trim(),
                  }),
                `${name.trim()} foi adicionado ao Kyte.`,
              )
            }
            style={{ opacity: ready ? 1 : 0.4 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

/** "Adicionar cliente": nome, celular/WhatsApp e endereço, como no Kyte. */
export function NewClient() {
  const s = useKySize();
  const nav = useKyteNav();
  const tabSpace = useTabBarSpace();
  const [name, setName] = useState('');
  const [phoneNum, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const save = useSave();
  const ready = !!name.trim();
  const avatar = s.phone ? 180 : 200;
  return (
    <View style={{ flex: 1, backgroundColor: KY.bg }}>
      <Header title="Adicionar cliente" onBack={nav.back} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: s.pad,
          paddingTop: 4,
          gap: 16,
          paddingBottom: tabSpace + 30,
        }}
      >
        <View
          style={{
            backgroundColor: KY.chip,
            borderRadius: s.radius,
            paddingVertical: 28,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: avatar,
              height: avatar,
              borderRadius: avatar / 2,
              backgroundColor: '#E6E9ED',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {name.trim() ? (
              <Text size={s.title + 10} weight="semibold" color={KY.sub}>
                {name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join('')}
              </Text>
            ) : (
              <KIcon name="image-outline" size={s.icon + 20} color={KY.sub} />
            )}
          </View>
        </View>
        <View
          style={{
            backgroundColor: KY.card,
            borderRadius: s.radius,
            paddingHorizontal: s.pad,
            paddingBottom: 18,
          }}
        >
          <Field label="Nome" value={name} onChange={setName} />
          <Field
            label="Celular/WhatsApp"
            value={phoneNum}
            onChange={(t) => setPhone(t.replace(/[^\d()\s+-]/g, ''))}
            keyboard="phone-pad"
            left={
              <Text size={s.body} color={KY.sub}>
                +55
              </Text>
            }
          />
          <Field
            label="Endereço (opcional)"
            value={address}
            onChange={setAddress}
            right={<KIcon name="location-outline" size={s.icon - 4} color={KY.sub} />}
          />
        </View>
        {save.msg && <Notice text={save.msg} error={save.state === 'error'} />}
        {save.state === 'done' ? (
          <GreenButton label="Voltar aos clientes" onPress={nav.back} />
        ) : (
          <GreenButton
            label={save.state === 'saving' ? 'Salvando…' : 'Salvar'}
            onPress={() =>
              ready &&
              save.run(
                () =>
                  kyteAgent.createClient({
                    name: name.trim(),
                    phone: phoneNum.trim() || undefined,
                    address: address.trim() || undefined,
                  }),
                `${name.trim()} foi adicionado ao Kyte.`,
              )
            }
            style={{ opacity: ready ? 1 : 0.4 }}
          />
        )}
      </ScrollView>
    </View>
  );
}
