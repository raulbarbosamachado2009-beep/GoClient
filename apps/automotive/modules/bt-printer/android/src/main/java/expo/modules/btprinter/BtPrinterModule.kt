package expo.modules.btprinter

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.util.UUID

/**
 * Impressora térmica Bluetooth (ESC/POS), do mesmo jeito que o Kyte imprime no celular: a
 * impressora é pareada nas configurações de Bluetooth do Android e o app manda os bytes da
 * comanda pelo canal serial (SPP). Os bytes são montados em TypeScript (kyte/print/escpos.ts).
 */
class BtPrinterModule : Module() {
  private val spp: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
  private var socket: BluetoothSocket? = null
  private var connectedTo: String? = null

  private class PrinterError(code: String, message: String) :
    CodedException("BT_$code", message, null)

  private fun adapter(): BluetoothAdapter {
    val ctx = appContext.reactContext ?: throw PrinterError("NO_CONTEXT", "O app ainda não está pronto.")
    val manager = ctx.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager?
    return manager?.adapter ?: throw PrinterError("NO_BLUETOOTH", "Este aparelho não tem Bluetooth.")
  }

  @SuppressLint("MissingPermission")
  private fun open(address: String): BluetoothSocket {
    val current = socket
    if (current != null && current.isConnected && connectedTo == address) return current
    close()
    val a = adapter()
    if (!a.isEnabled) throw PrinterError("OFF", "O Bluetooth está desligado. Ligue o Bluetooth da multimídia.")
    val device: BluetoothDevice = a.getRemoteDevice(address)
    a.cancelDiscovery()
    val s = try {
      device.createRfcommSocketToServiceRecord(spp).also { it.connect() }
    } catch (e: IOException) {
      // Algumas impressoras baratas só aceitam o canal 1 direto.
      try {
        val m = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
        (m.invoke(device, 1) as BluetoothSocket).also { it.connect() }
      } catch (e2: Exception) {
        throw PrinterError("CONNECT", "Não consegui conectar na impressora. Ela está ligada e perto?")
      }
    }
    socket = s
    connectedTo = address
    return s
  }

  private fun close() {
    try { socket?.close() } catch (_: IOException) {}
    socket = null
    connectedTo = null
  }

  override fun definition() = ModuleDefinition {
    Name("BtPrinter")

    Function("isEnabled") {
      try { adapter().isEnabled } catch (_: Exception) { false }
    }

    /** Aparelhos pareados (a impressora é pareada nas configurações do Android). */
    @SuppressLint("MissingPermission")
    AsyncFunction("pairedDevices") {
      val a = adapter()
      if (!a.isEnabled) throw PrinterError("OFF", "O Bluetooth está desligado. Ligue o Bluetooth da multimídia.")
      a.bondedDevices.map { d ->
        mapOf(
          "name" to (d.name ?: d.address),
          "address" to d.address,
          // 0x0600 = imagem (impressoras costumam anunciar esta classe).
          "printer" to ((d.bluetoothClass?.majorDeviceClass ?: 0) == 0x0600)
        )
      }
    }

    /** Envia os bytes (base64) para a impressora. Tenta de novo uma vez se a conexão caiu. */
    AsyncFunction("print") { address: String, base64: String ->
      val bytes = Base64.decode(base64, Base64.DEFAULT)
      try {
        val out = open(address).outputStream
        out.write(bytes)
        out.flush()
      } catch (e: IOException) {
        close()
        val out = open(address).outputStream
        out.write(bytes)
        out.flush()
      }
      true
    }

    Function("disconnect") { close() }

    OnDestroy { close() }
  }
}
