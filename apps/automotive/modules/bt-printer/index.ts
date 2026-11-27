import { requireOptionalNativeModule } from 'expo';

/**
 * Impressora térmica Bluetooth (só Android). No Preview (web) e em compilações sem o módulo,
 * `BtPrinter` é null e o "Imprimir" usa a impressão do navegador.
 */
export interface PairedDevice {
  name: string;
  address: string;
  /** O Android diz que é uma impressora (nem todas anunciam). */
  printer: boolean;
}

interface BtPrinterModule {
  isEnabled(): boolean;
  pairedDevices(): Promise<PairedDevice[]>;
  print(address: string, base64: string): Promise<boolean>;
  disconnect(): void;
}

export const BtPrinter = requireOptionalNativeModule<BtPrinterModule>('BtPrinter');
