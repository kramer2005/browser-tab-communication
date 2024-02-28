var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import BrowserTab from './BrowserTab';
import { v4 as uuid } from 'uuid';
class TabsManager {
    static getInstance(broadcastChannelName) {
        if (!TabsManager.instance) {
            TabsManager.instance = new TabsManager(broadcastChannelName);
        }
        return TabsManager.instance;
    }
    constructor(broadcastChannelName) {
        this.tabs = [];
        this.id = uuid();
        this.broadcast = new BroadcastChannel(broadcastChannelName || `tab-communication-${window.location.hostname}`);
        this.broadcast.onmessage = (event) => {
            const { data } = event;
            switch (data.type) {
                case 'sync':
                    this.handleSync(data);
                    break;
                case 'offer':
                    this.handleOffer(data);
                    break;
                case 'answer':
                    this.handleAnswer(data);
                    break;
                case 'candidate':
                    this.handleCandidate(data);
                    break;
                case 'close':
                    this.handleClosing(data);
                    break;
            }
        };
        window.addEventListener('load', () => {
            this.broadcast.postMessage({
                type: 'sync',
                clientId: this.id,
            });
        });
        window.addEventListener('beforeunload', () => {
            this.broadcast.postMessage({
                type: 'close',
                clientId: this.id,
            });
        });
    }
    handleSync(sync) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentTab = this.createTab(sync.clientId);
            const pc = currentTab.peerConnection;
            const dataChannel = pc.createDataChannel(`dataChannel`);
            currentTab.dataChannel = dataChannel;
            dataChannel.onopen = () => { var _a; return (_a = this.onTabOpen) === null || _a === void 0 ? void 0 : _a.call(this, currentTab); };
            const offer = yield pc.createOffer();
            this.broadcast.postMessage({
                type: 'offer',
                sdp: offer.sdp,
                dealerId: this.id,
                clientId: sync.clientId,
            });
            yield pc.setLocalDescription(offer);
        });
    }
    handleOffer(offer) {
        return __awaiter(this, void 0, void 0, function* () {
            if (offer.clientId !== this.id)
                return;
            const currentTab = this.createTab(offer.dealerId);
            const pc = currentTab.peerConnection;
            pc.ondatachannel = (e) => {
                currentTab.dataChannel = e.channel;
                e.channel.onopen = () => { var _a; return (_a = this.onTabOpen) === null || _a === void 0 ? void 0 : _a.call(this, currentTab); };
            };
            yield pc.setRemoteDescription(offer);
            const answer = yield pc.createAnswer();
            yield pc.setLocalDescription(answer);
            this.broadcast.postMessage({
                type: 'answer',
                sdp: answer.sdp,
                dealerId: offer.dealerId,
                clientId: offer.clientId,
            });
        });
    }
    handleAnswer(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (event.dealerId !== this.id)
                return;
            (_a = this.tabs
                .find((tab) => tab.id === event.clientId)) === null || _a === void 0 ? void 0 : _a.peerConnection.setRemoteDescription(event);
        });
    }
    handleCandidate(candidate) {
        var _a;
        if (candidate.candidate) {
            if (candidate.clientId !== this.id)
                return;
            (_a = this.tabs
                .find((tab) => tab.id === candidate.dealerId)) === null || _a === void 0 ? void 0 : _a.peerConnection.addIceCandidate(candidate);
        }
    }
    handleClosing(closingTab) {
        var _a;
        const tab = this.tabs.find((tab) => tab.id === closingTab.clientId);
        if (tab) {
            this.tabs = this.tabs.filter((t) => t !== tab);
            (_a = this.onTabClose) === null || _a === void 0 ? void 0 : _a.call(this, tab);
            tab.peerConnection.close();
        }
    }
    createTab(correlationId) {
        const pc = new RTCPeerConnection();
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                this.broadcast.postMessage({
                    type: 'candidate',
                    candidate: e.candidate.candidate,
                    sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex,
                    dealerId: this.id,
                    clientId: correlationId,
                });
            }
        };
        const newTab = new BrowserTab(pc, correlationId);
        pc.onconnectionstatechange = (e) => {
            var _a;
            if (pc.connectionState !== 'connected' &&
                pc.connectionState !== 'connecting') {
                this.tabs = this.tabs.filter((tab) => tab !== newTab);
                (_a = this.onTabClose) === null || _a === void 0 ? void 0 : _a.call(this, newTab);
                pc.close();
            }
        };
        this.tabs.push(newTab);
        return newTab;
    }
    get openTabs() {
        return this.tabs.filter((tab) => tab.dataChannel.readyState === 'open');
    }
    broadcastMessage(data) {
        this.openTabs.forEach((tab) => tab.send(data));
    }
}
export default TabsManager;
