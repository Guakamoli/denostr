import {  Server } from 'node:http'
import WebSocket, { WebSocketServer } from 'ws'
import { propEq } from 'ramda'
import { ServerRequest } from "https://deno.land/std@0.92.0/http/server.ts";
import { IWebSocketAdapter, IWebSocketServerAdapter } from '../@types/adapters.ts'
import { WebSocketAdapterEvent, WebSocketServerAdapterEvent } from '../constants/adapter.ts'
import { createLogger } from '../factories/logger-factory.ts'
import { Event } from '../@types/event.ts'
import { Factory } from '../@types/base.ts'
import { getRemoteAddress } from '../utils/http.ts'
import { isRateLimited } from '../handlers/request-handlers/rate-limiter-middleware.ts'
import { Settings } from '../@types/settings.ts'
import { WebServerAdapter } from './web-server-adapter.ts'

const debug = createLogger('web-socket-server-adapter')

const WSS_CLIENT_HEALTH_PROBE_INTERVAL = 120000

export class WebSocketServerAdapter extends WebServerAdapter implements IWebSocketServerAdapter {
  private webSocketsAdapters: WeakMap<WebSocket, IWebSocketAdapter>

  private heartbeatInterval: NodeJS.Timer

  public constructor(
    webServer: Server,
    private readonly webSocketServer: WebSocketServer,
    private readonly createWebSocketAdapter: Factory<
      IWebSocketAdapter,
      [WebSocket, ServerRequest, IWebSocketServerAdapter]
    >,
    private readonly settings: () => Settings,
  ) {
    debug('created')
    super(webServer)

    this.webSocketsAdapters = new WeakMap()

    this
      .on(WebSocketServerAdapterEvent.Broadcast, this.onBroadcast.bind(this))

    this.webSocketServer
      .on(WebSocketServerAdapterEvent.Connection, this.onConnection.bind(this))
      .on('error', (error: any) => {
        debug('error: %o', error)
      })
    this.heartbeatInterval = setInterval(this.onHeartbeat.bind(this), WSS_CLIENT_HEALTH_PROBE_INTERVAL)
  }

  public close(callback?: () => void): void {
    super.close(() => {
      console.info('断开连接诶了')

      debug('closing')
      clearInterval(this.heartbeatInterval)
      this.webSocketServer.clients.forEach((webSocket: WebSocket) => {
        const webSocketAdapter = this.webSocketsAdapters.get(webSocket)
        if (webSocketAdapter) {
          debug('terminating client %s: %s', webSocketAdapter.getClientId(), webSocketAdapter.getClientAddress())
        }
        webSocket.terminate()
      })
      debug('closing web socket server')
      this.webSocketServer.close(() => {
        this.webSocketServer.removeAllListeners()
        if (typeof callback !== 'undefined') {
          callback()
        }
        debug('closed')
      })
    })
    this.removeAllListeners()
  }

  private onBroadcast(event: Event) {
    console.info(' 有广播吗')
    this.webSocketServer.clients.forEach((webSocket: WebSocket) => {
      if (!propEq('readyState', WebSocket.OPEN)(webSocket)) {
        return
      }
      const webSocketAdapter = this.webSocketsAdapters.get(webSocket) as IWebSocketAdapter
      if (!webSocketAdapter) {
        return
      }
      webSocketAdapter.emit(WebSocketAdapterEvent.Event, event)
    })
  }

  public getConnectedClients(): number {
    return Array.from(this.webSocketServer.clients).filter(propEq('readyState', WebSocket.OPEN)).length
  }

  private async onConnection(client: WebSocket, req: ServerRequest) {
    try {
      const currentSettings = this.settings()
      const remoteAddress = getRemoteAddress(req, currentSettings)
      // const remoteAddress = '192.168.0.126'
      debug('client %s connected: %o', remoteAddress, req.headers)
  
      if (await isRateLimited(remoteAddress, currentSettings)) {
        debug('client %s terminated: rate-limited', remoteAddress)
        client.terminate()
        return
      }
  
      this.webSocketsAdapters.set(client, this.createWebSocketAdapter([client, req, this]))
    } catch (e) {
      console.info('链接错误的', e)
    }
 
  }

  private onHeartbeat() {
    this.webSocketServer.clients.forEach((webSocket) => {
      const webSocketAdapter = this.webSocketsAdapters.get(webSocket) as IWebSocketAdapter
      if (webSocketAdapter) {
        webSocketAdapter.emit(WebSocketAdapterEvent.Heartbeat)
      }
    })
  }
}
