import { Sockets } from "./Sockets";

export class Socket {
    private socket: SocketIO.Socket;
    private channelArray: string[] = [];

    constructor(sock: SocketIO.Socket) {
        this.socket = sock;
    }

    get id() {
        return this.socket.id;
    }

    get channels() {
        return this.channelArray;
    }

    addChannel(channel: string) {
        this.channels.push(channel);
    }

    removeChannel(channel: string) {
        delete this.channels[channel];
    }

    // tslint:disable-next-line:no-any
    emit(message: string, data: any) {
        this.socket.emit(message, data);
    }
}
