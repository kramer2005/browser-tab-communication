declare class BrowserTab {
    peerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;
    id: string;
    constructor(peerConnection: RTCPeerConnection, id: string);
    set onmessage(fn: <T>(event: MessageEvent<T>) => void);
    send<T>(data: T): void;
}
export default BrowserTab;
