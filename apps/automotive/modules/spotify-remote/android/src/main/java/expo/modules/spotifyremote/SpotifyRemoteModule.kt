package expo.modules.spotifyremote

import android.os.Handler
import android.os.Looper
import com.spotify.android.appremote.api.ConnectionParams
import com.spotify.android.appremote.api.Connector
import com.spotify.android.appremote.api.SpotifyAppRemote
import com.spotify.protocol.client.CallResult
import com.spotify.protocol.client.Subscription
import com.spotify.protocol.types.Empty
import com.spotify.protocol.types.PlayerContext
import com.spotify.protocol.types.PlayerState
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Controle do app do Spotify por trás (SDK oficial "App Remote"): o GoClient manda tocar,
 * pausar e pular, e o Spotify toca em segundo plano, sem aparecer na tela.
 * Exige o app do Spotify instalado e logado no aparelho.
 */
class SpotifyRemoteModule : Module() {
  private var remote: SpotifyAppRemote? = null
  private var playerSub: Subscription<PlayerState>? = null
  private var contextSub: Subscription<PlayerContext>? = null
  private val main = Handler(Looper.getMainLooper())

  private class RemoteError(name: String, message: String?) :
    CodedException("SPOTIFY_$name", message ?: name, null)

  override fun definition() = ModuleDefinition {
    Name("SpotifyRemote")

    Events("onPlayerState", "onPlayerContext", "onDisconnected")

    Function("isInstalled") {
      val ctx = appContext.reactContext ?: return@Function false
      SpotifyAppRemote.isSpotifyInstalled(ctx)
    }

    Function("isConnected") { remote?.isConnected == true }

    AsyncFunction("connect") { clientId: String, redirectUri: String, showAuthView: Boolean, promise: Promise ->
      if (remote?.isConnected == true) {
        promise.resolve(true)
        return@AsyncFunction
      }
      val ctx = appContext.currentActivity ?: appContext.reactContext
      if (ctx == null) {
        promise.reject(RemoteError("NO_CONTEXT", "App ainda não está pronto"))
        return@AsyncFunction
      }
      val params = ConnectionParams.Builder(clientId)
        .setRedirectUri(redirectUri)
        .showAuthView(showAuthView)
        .build()
      main.post {
        SpotifyAppRemote.connect(ctx, params, object : Connector.ConnectionListener {
          override fun onConnected(appRemote: SpotifyAppRemote) {
            remote = appRemote
            subscribe(appRemote)
            promise.resolve(true)
          }

          override fun onFailure(error: Throwable) {
            remote = null
            sendEvent("onDisconnected", mapOf("reason" to error.javaClass.simpleName))
            promise.reject(RemoteError(error.javaClass.simpleName, error.message))
          }
        })
      }
    }

    Function("disconnect") {
      playerSub?.cancel()
      playerSub = null
      contextSub?.cancel()
      contextSub = null
      remote?.let { SpotifyAppRemote.disconnect(it) }
      remote = null
    }

    AsyncFunction("play") { uri: String, promise: Promise -> run(promise) { it.playerApi.play(uri) } }
    AsyncFunction("queue") { uri: String, promise: Promise -> run(promise) { it.playerApi.queue(uri) } }
    AsyncFunction("resume") { promise: Promise -> run(promise) { it.playerApi.resume() } }
    AsyncFunction("pause") { promise: Promise -> run(promise) { it.playerApi.pause() } }
    AsyncFunction("skipNext") { promise: Promise -> run(promise) { it.playerApi.skipNext() } }
    AsyncFunction("skipPrevious") { promise: Promise -> run(promise) { it.playerApi.skipPrevious() } }
    AsyncFunction("skipToIndex") { uri: String, index: Int, promise: Promise ->
      run(promise) { it.playerApi.skipToIndex(uri, index) }
    }
    AsyncFunction("seekTo") { ms: Double, promise: Promise -> run(promise) { it.playerApi.seekTo(ms.toLong()) } }
    AsyncFunction("setShuffle") { on: Boolean, promise: Promise -> run(promise) { it.playerApi.setShuffle(on) } }
    // 0 = desligado, 1 = repetir a faixa, 2 = repetir a lista (com.spotify.protocol.types.Repeat).
    AsyncFunction("setRepeat") { mode: Int, promise: Promise -> run(promise) { it.playerApi.setRepeat(mode) } }

    // Estado atual na hora (sem esperar o próximo evento).
    AsyncFunction("getPlayerState") { promise: Promise ->
      val r = remote
      if (r == null || !r.isConnected) {
        promise.reject(RemoteError("NOT_CONNECTED", "Spotify não conectado"))
        return@AsyncFunction
      }
      main.post {
        r.playerApi.playerState
          .setResultCallback { s -> promise.resolve(stateMap(s)) }
          .setErrorCallback { e -> promise.reject(RemoteError(e.javaClass.simpleName, e.message)) }
      }
    }

    OnDestroy {
      playerSub?.cancel()
      contextSub?.cancel()
      remote?.let { SpotifyAppRemote.disconnect(it) }
      remote = null
    }
  }

  private fun run(promise: Promise, block: (SpotifyAppRemote) -> CallResult<Empty>) {
    val r = remote
    if (r == null || !r.isConnected) {
      promise.reject(RemoteError("NOT_CONNECTED", "Spotify não conectado"))
      return
    }
    main.post {
      block(r)
        .setResultCallback { promise.resolve(true) }
        .setErrorCallback { e -> promise.reject(RemoteError(e.javaClass.simpleName, e.message)) }
    }
  }

  private fun subscribe(r: SpotifyAppRemote) {
    playerSub?.cancel()
    playerSub = r.playerApi.subscribeToPlayerState().setEventCallback { s ->
      sendEvent("onPlayerState", stateMap(s))
    }
    contextSub?.cancel()
    contextSub = r.playerApi.subscribeToPlayerContext().setEventCallback { c ->
      sendEvent(
        "onPlayerContext",
        mapOf("uri" to (c.uri ?: ""), "title" to (c.title ?: ""), "type" to (c.type ?: ""))
      )
    }
    // Lifecycle: o Spotify pode cair (app fechado pelo sistema); avisa o JS para reconectar.
    playerSub?.setErrorCallback { e ->
      remote = null
      sendEvent("onDisconnected", mapOf("reason" to e.javaClass.simpleName))
    }
  }

  private fun stateMap(s: PlayerState): Map<String, Any?> {
    val t = s.track
    // Tipos explícitos: a inferência do Kotlin falha com mapas aninhados de tipos diferentes.
    val track: Map<String, Any?>? = if (t == null) null else {
      val artists: List<Map<String, Any?>> =
        t.artists?.map { a -> mapOf<String, Any?>("name" to a.name, "uri" to a.uri) } ?: emptyList()
      mapOf<String, Any?>(
        "uri" to t.uri,
        "name" to t.name,
        "artist" to (t.artist?.name ?: ""),
        "artists" to artists,
        "album" to (t.album?.name ?: ""),
        "albumUri" to (t.album?.uri ?: ""),
        "duration" to t.duration.toDouble(),
        "imageUri" to (t.imageUri?.raw ?: ""),
        "isEpisode" to t.isEpisode
      )
    }
    return mapOf<String, Any?>(
      "isPaused" to s.isPaused,
      "position" to s.playbackPosition.toDouble(),
      "shuffle" to (s.playbackOptions?.isShuffling ?: false),
      "repeat" to (s.playbackOptions?.repeatMode ?: 0),
      "track" to track
    )
  }
}
