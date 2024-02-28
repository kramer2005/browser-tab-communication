class BrowserTab {
  peerConnection: RTCPeerConnection
  dataChannel!: RTCDataChannel
  id: string

  constructor(peerConnection: RTCPeerConnection, id: string) {
    this.peerConnection = peerConnection
    this.id = id
  }

  set onmessage(fn: <T>(event: MessageEvent<T>) => void) {
    this.dataChannel.onmessage = fn
  }

  send<T>(data: T) {
    this.dataChannel.send(data as any)
  }
}

export default BrowserTab
