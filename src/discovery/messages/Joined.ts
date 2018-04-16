export class Joined {
    static signal = "joined";

    socketId: string;
    channel: string;

    constructor(socketId: string, channel: string) {
        this.socketId = socketId;
        this.channel = channel;
    }
}
