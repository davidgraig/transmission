import { deserialize, serialize } from "json-typescript-mapper";
import * as messages from "./messages/";
import { Socket } from "./Socket";

export class Sockets {

    private sockets: Map<string, Socket> = new Map();
    private socketsByChannel: Map<string, Map<string, Socket>> = new Map();

    addSocket(webSocket: SocketIO.Socket) {
        const socket = new Socket(webSocket);
        this.sockets.set(webSocket.id, socket);

        webSocket.on(messages.Join.signal, (jsonString: string) => { this.onSocketJoin(socket, jsonString); });
        webSocket.on(messages.Disconnect.signal, () => { this.onSocketDisconnect(this.sockets.get(webSocket.id)); });
        webSocket.on(messages.Leave.signal, (jsonString: string) => { this.leave(socket, deserialize(messages.Leave, JSON.parse(jsonString)).channel); });
        webSocket.on(messages.RelayIceCandidate.signal, (jsonString: string) => this.onRelayIceCandidate(socket, jsonString));
    }

    private onSocketJoin(socket: Socket, joinJsonString: string): void {
        const join = deserialize(messages.Join, JSON.parse(joinJsonString));
        if (!this.socketsByChannel.has(join.channel)) {
            this.socketsByChannel.set(join.channel, new Map());
        }
        this.socketsByChannel.get(join.channel).set(socket.id, socket);
    }

    private onSocketDisconnect(socket: Socket) {
        for (const channel of socket.channels) {
            this.leave(socket, channel);
            this.broadcast(channel, messages.RemovePeer.signal, new messages.RemovePeer(socket.id));
        }
        delete this.sockets[socket.id];
    }

    private onRelayIceCandidate(socket: Socket, jsonString: string) {
        const message = deserialize(messages.RelayIceCandidate, JSON.parse(jsonString));
        this.sockets.get(message.targetSocketId).emit(messages.IceCandidate.signal, new messages.IceCandidate(message.iceCandidate));
    }

    private onRelaySessionDescription(socket: Socket, jsonString: string) {
        const message = deserialize(messages.RelaySessionDescription, JSON.parse(jsonString));
        this.sockets.get(message.targetSocketId).emit(messages.SessionDescription.signal, new messages.SessionDescription(message.sessionDescription));
    }

    private leave(socket: Socket, channel: string) {
        socket.removeChannel(channel);
        delete this.socketsByChannel[channel][socket.id];
    }

    private broadcast(channel: string, message: string, data?: messages.JsonSerializable) {
        const channelSockets: Map<string, Socket> = this.socketsByChannel.get(channel);
        channelSockets.forEach((socket: Socket, key: string) => {
            socket.emit(message, data);
        });
    }
}
