export interface Data {
  dealerId: string
  clientId: string
}

export interface Sync extends Data {
  type: 'sync'
}

export interface Offer extends Data {
  type: 'offer'
  sdp: string
  uuid: string
}

export interface Answer extends Data {
  type: 'answer'
  sdp: string
}

export interface Candidate extends Data {
  type: 'candidate'
  candidate: string
  sdpMid: string
  sdpMLineIndex: number
}

export interface Close extends Data {
  type: 'close'
}

export type TabCommEvent = MessageEvent<Sync | Offer | Answer | Candidate | Close>
