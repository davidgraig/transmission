export class AddPeer {
    static signal = "addPeer";

    id: string;
    createOffer: boolean;

    constructor(id: string, createOffer: boolean) {
        this.id = id;
        this.createOffer = createOffer;
    }
}
