import BrowserTab from './BrowserTab'
import { Answer, Candidate, Close, Offer, Sync, TabCommEvent } from './types'
import { v4 as uuid } from 'uuid'

class TabsManager {
  static instance: TabsManager
  private broadcast: BroadcastChannel
  private tabs: BrowserTab[] = []
  private id = uuid()

  static getInstance(broadcastChannelName?: string) {
    if (!TabsManager.instance) {
      TabsManager.instance = new TabsManager(broadcastChannelName)
    }
    return TabsManager.instance
  }

  private constructor(broadcastChannelName?: string) {
    this.broadcast = new BroadcastChannel(
      broadcastChannelName || `tab-communication-${window.location.hostname}`,
    )

    this.broadcast.onmessage = (event: TabCommEvent) => {
      const { data } = event

      switch (data.type) {
        case 'sync':
          this.handleSync(data)
          break
        case 'offer':
          this.handleOffer(data)
          break
        case 'answer':
          this.handleAnswer(data)
          break
        case 'candidate':
          this.handleCandidate(data)
          break
        case 'close':
          this.handleClosing(data)
          break
      }
    }

    window.addEventListener('load', () => {
      this.broadcast.postMessage(<Sync>{
        type: 'sync',
        clientId: this.id,
      })
    })

    window.addEventListener('beforeunload', () => {
      this.broadcast.postMessage(<Close>{
        type: 'close',
        clientId: this.id,
      })
    })
  }

  private async handleSync(sync: Sync) {
    const currentTab = this.createTab(sync.clientId)
    const pc = currentTab.peerConnection

    const dataChannel = pc.createDataChannel(`dataChannel`)
    currentTab.dataChannel = dataChannel
    dataChannel.onopen = () => this.onTabOpen?.(currentTab)

    const offer = await pc.createOffer()
    this.broadcast.postMessage(<Offer>{
      type: 'offer',
      sdp: offer.sdp,
      dealerId: this.id,
      clientId: sync.clientId,
    })
    await pc.setLocalDescription(offer)
  }

  private async handleOffer(offer: Offer) {
    if (offer.clientId !== this.id) return

    const currentTab = this.createTab(offer.dealerId)
    const pc = currentTab.peerConnection

    pc.ondatachannel = (e) => {
      currentTab.dataChannel = e.channel
      e.channel.onopen = () => this.onTabOpen?.(currentTab)
    }

    await pc.setRemoteDescription(offer)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    this.broadcast.postMessage(<Answer>{
      type: 'answer',
      sdp: answer.sdp,
      dealerId: offer.dealerId,
      clientId: offer.clientId,
    })
  }

  private async handleAnswer(event: Answer) {
    if (event.dealerId !== this.id) return

    this.tabs
      .find((tab) => tab.id === event.clientId)
      ?.peerConnection.setRemoteDescription(event)
  }

  private handleCandidate(candidate: Candidate) {
    if (candidate.candidate) {
      if (candidate.clientId !== this.id) return

      this.tabs
        .find((tab) => tab.id === candidate.dealerId)
        ?.peerConnection.addIceCandidate(candidate)
    }
  }

  private handleClosing(closingTab: Close) {
    const tab = this.tabs.find((tab) => tab.id === closingTab.clientId)

    if (tab) {
      this.tabs = this.tabs.filter((t) => t !== tab)
      this.onTabClose?.(tab)
      tab.peerConnection.close()
    }
  }

  private createTab(correlationId: string) {
    const pc = new RTCPeerConnection()
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.broadcast.postMessage({
          type: 'candidate',
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
          dealerId: this.id,
          clientId: correlationId,
        })
      }
    }

    const newTab = new BrowserTab(pc, correlationId)
    pc.onconnectionstatechange = (e) => {
      if (
        pc.connectionState !== 'connected' &&
        pc.connectionState !== 'connecting'
      ) {
        this.tabs = this.tabs.filter((tab) => tab !== newTab)
        this.onTabClose?.(newTab)

        pc.close()
      }
    }
    this.tabs.push(newTab)

    return newTab
  }

  get openTabs() {
    return this.tabs.filter((tab) => tab.dataChannel.readyState === 'open')
  }

  onTabOpen: (tab: BrowserTab) => void
  onTabClose: (tab: BrowserTab) => void
  broadcastMessage<T>(data: T) {
    this.openTabs.forEach((tab) => tab.send(data))
  }
}

export default TabsManager
