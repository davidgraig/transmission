import * as log from "winston";
import * as messages from "./messages/";
import { Socket } from "./Socket";

export class Sockets {

    private sockets: Map<string, Socket> = new Map();
    private socketsByChannel: Map<string, Map<string, Socket>> = new Map();

    addSocket(webSocket: SocketIO.Socket) {
        const socket = new Socket(webSocket);
        this.sockets.set(webSocket.id, socket);

        webSocket.on(messages.Join.signal, (join: messages.Join) => { this.onSocketJoin(socket, join); });
        webSocket.on(messages.Disconnect.signal, () => { this.onSocketDisconnect(this.sockets.get(webSocket.id)); });
        webSocket.on(messages.Leave.signal, (leave: messages.Leave) => { this.leave(socket, leave.channel); });
        webSocket.on(messages.RelayIceCandidate.signal, (message: messages.RelayIceCandidate) => this.onRelayIceCandidate(socket, message));
        webSocket.on(messages.RelaySessionDescription.signal, (message: messages.RelaySessionDescription) => this.onRelaySessionDescription(socket, message));
    }

    private onSocketJoin(socket: Socket, join: messages.Join): void {
        if (!this.socketsByChannel.has(join.channel)) {
            log.debug(`Creating channel ${join.channel}`);
            this.socketsByChannel.set(join.channel, new Map<string, Socket>());
        }
        log.debug(`socket ${socket.id} joined ${join.channel}`);

        const addPeer = new messages.AddPeer(socket.id, false);
        this.broadcast(join.channel, messages.AddPeer.signal, addPeer);
        this.sendPeerChannelMembers(socket, join.channel);

        this.socketsByChannel.get(join.channel).set(socket.id, socket);
        socket.addChannel(join.channel);
    }

    private onSocketDisconnect(socket: Socket) {
        log.debug(`socket disconnected: ${socket.id}`);
        for (const channel of socket.channels) {
            this.leave(socket, channel);
            const removePeer = new messages.RemovePeer(socket.id);
            this.broadcast(channel, messages.RemovePeer.signal, removePeer);
        }
        this.sockets.delete(socket.id);
    }

    private onRelayIceCandidate(socket: Socket, message: messages.RelayIceCandidate) {
        const iceCandidate = new messages.IceCandidate(message.iceCandidate);
        this.sockets.get(message.targetSocketId).emit(messages.IceCandidate.signal, iceCandidate);
    }

    private onRelaySessionDescription(socket: Socket, message: messages.RelaySessionDescription) {
        if (this.sockets.has(message.targetSocketId)) {
            log.debug(`relaying socket description ${message.type} from ${socket.id} to ${message.targetSocketId}.`);
            const sessionDescription = new messages.SessionDescription(socket.id, message.type, message.sdp);
            this.sockets.get(message.targetSocketId).emit(messages.SessionDescription.signal, sessionDescription);
        }
    }

    private leave(socket: Socket, channel: string) {
        log.debug(`removing ${socket.id} from channel ${channel}`);
        socket.removeChannel(channel);
        this.socketsByChannel.get(channel).delete(socket.id);
        if (this.socketsByChannel.get(channel).size === 0) {
            log.debug(`no users left in ${channel}, removing it`);
            this.socketsByChannel.delete(channel);
        }
    }

    // tslint:disable-next-line:no-any
    private broadcast(channel: string, message: string, data: any) {
        if (this.socketsByChannel.has(channel)) {
            const channelSockets: Map<string, Socket> = this.socketsByChannel.get(channel);
            channelSockets.forEach((socket: Socket, key: string) => {
                socket.emit(message, data);
            });
        }
    }

    private sendPeerChannelMembers(socket: Socket, channelName: string) {
        for (const socketId of this.socketsByChannel.get(channelName).keys()) {
            const peer = new messages.AddPeer(socketId, true);
            socket.emit(messages.AddPeer.signal, peer);
        }
    }
}
