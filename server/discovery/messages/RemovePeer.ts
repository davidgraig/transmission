export class RemovePeer {
    static signal = "removePeer";

    peerId: string;

    constructor(peerId: string) {
        this.peerId = peerId;
    }
}
