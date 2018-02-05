export class Join {
    static signal = "join";

    channel: string;

    constructor(channel: string) {
        this.channel = channel;
    }
}
