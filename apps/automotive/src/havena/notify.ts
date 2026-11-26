import {
  arrivalQuestion,
  composeArrivalMessage,
  type NotifyRequest,
  normalizeSpeech,
  roundArrivalMinutes,
} from '@goclient/core';
import { composeWhatsApp } from '../integrations/contact';
import { cachedCustomers, customerAddress, restoreKyteCache } from '../kyte/store';
import { districtOf, getTrip, type TripStop } from '../map/trip';
import { CLIENTS } from '../mocks/data';
import { whatsappLinked } from '../whatsapp/store';
import type { HavenaDeps, ToolOutcome } from './tools';
import { say } from './voice';

/**
 * "Lucas, avisa o próximo cliente que estamos indo": acha o cliente (o próximo da rota ou o
 * nome dito), o tempo até ele pela rota, escreve a mensagem e pergunta antes. Com o "pode",
 * abre a conversa com a mensagem pronta (WhatsApp Web no app ou o app do WhatsApp) e, quando
 * a mensagem sai, o Lucas diz "Enviado!".
 */
export async function planNotify(req: NotifyRequest, d: HavenaDeps): Promise<ToolOutcome> {
  const trip = getTrip();
  let who: TripStop | null = null;
  let minutes = req.minutes;

  if (req.target === 'next') {
    who = trip?.next ?? firstOfDay(d);
    if (!who)
      return {
        result:
          'Não tem nenhuma rota ativa agora. Comece uma rota no Mapa e eu aviso o próximo cliente.',
      };
    if (minutes === undefined && trip?.next === who && trip.secondsToNext !== null)
      minutes = roundArrivalMinutes(trip.secondsToNext);
  } else {
    const found = await findByName(req.name, req.district, d);
    if (typeof found === 'string') return { result: found };
    who = found;
    // É a próxima parada? Então o tempo vem da rota.
    if (
      minutes === undefined &&
      trip &&
      trip.secondsToNext !== null &&
      normalizeSpeech(trip.next.name) === normalizeSpeech(who.name)
    )
      minutes = roundArrivalMinutes(trip.secondsToNext);
  }

  if (!who.phone)
    return { result: `${who.name} não tem telefone no cadastro. Cadastre o número no Kyte.` };

  const text = composeArrivalMessage({ name: who.name, minutes });
  const target = who;
  return {
    confirm: {
      summary: arrivalQuestion({ name: who.name, district: who.district, minutes }),
      run: async () => {
        const how = composeWhatsApp(
          { to: firstName(target.name), phone: target.phone, text },
          d.router,
          () => say('Enviado!', { onStart: () => {}, onDone: () => {}, onStopped: () => {} }),
        );
        if (how === 'invalid') return 'Esse telefone não parece válido.';
        // O Lucas fecha para a pessoa alcançar o botão de enviar.
        const close = () => d.proto.setOverlay(null);
        return {
          say: whatsappLinked()
            ? 'Pronto! A mensagem está escrita, é só tocar em enviar.'
            : 'Abri o WhatsApp. Leia o QR code uma vez e a mensagem já fica pronta.',
          after: close,
        };
      },
    },
  };
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;

function firstOfDay(d: HavenaDeps): TripStop | null {
  const c = d.stops.find(d.stops.dayIds[0]);
  return c ? { name: c.name, district: districtOf(c), phone: c.phone } : null;
}

/** Cliente pelo nome falado (e, se disse, pelo bairro): rota, exemplos e Kyte. */
async function findByName(
  name: string,
  district: string | undefined,
  d: HavenaDeps,
): Promise<TripStop | string> {
  const q = normalizeSpeech(name);
  const where = district ? normalizeSpeech(district) : '';
  await restoreKyteCache();
  const pool: TripStop[] = [
    ...d.stops.extra.map((c) => ({ name: c.name, district: districtOf(c), phone: c.phone })),
    ...(cachedCustomers() ?? []).map((c) => ({
      name: c.name,
      district: c.district || districtOf({ address: customerAddress(c) }),
      phone: c.phone,
    })),
    ...CLIENTS.map((c) => ({ name: c.name, district: districtOf(c), phone: c.phone })),
  ];
  const byName = pool.filter((c) => {
    const n = normalizeSpeech(c.name);
    return n.split(' ').includes(q.split(' ')[0] ?? q) || n.includes(q);
  });
  const hits = where
    ? byName.filter((c) => normalizeSpeech(c.district).includes(where.replace(/^jardim /, '')))
    : byName;
  const unique = [...new Map((hits.length ? hits : byName).map((c) => [c.name, c])).values()];
  if (unique.length === 1 && unique[0]) return unique[0];
  if (unique.length > 1)
    return `Achei mais de um: ${unique
      .slice(0, 3)
      .map((c) => `${c.name}${c.district ? ` do ${c.district}` : ''}`)
      .join(', ')}. Qual deles?`;
  return `Não achei ${name} nos clientes. Diga o nome como está no Kyte.`;
}
