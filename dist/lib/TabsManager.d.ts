import BrowserTab from './BrowserTab';
declare class TabsManager {
    static instance: TabsManager;
    private broadcastChannel;
    private _tabs;
    private id;
    static getInstance(broadcastChannelName?: string): TabsManager;
    private constructor();
    private handleSync;
    private handleOffer;
    private handleAnswer;
    private handleCandidate;
    private handleClosing;
    private createTab;
    get tabs(): BrowserTab[];
    onTabOpen: (tab: BrowserTab) => void;
    onTabClose: (tab: BrowserTab) => void;
    broadcast<T>(data: T): void;
}
export default TabsManager;
