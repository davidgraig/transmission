export class Leave {
    static signal = "leave";

    channel: string;

    constructor(channel: string) {
        this.channel = channel;
    }
}
