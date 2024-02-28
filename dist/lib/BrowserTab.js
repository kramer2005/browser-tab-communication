class BrowserTab {
    constructor(peerConnection, id) {
        this.peerConnection = peerConnection;
        this.id = id;
    }
    set onmessage(fn) {
        this.dataChannel.onmessage = fn;
    }
    send(data) {
        this.dataChannel.send(data);
    }
}
export default BrowserTab;
