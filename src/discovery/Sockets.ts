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
        log.debug(`got socket join message from ${socket.id}`);
        if (!this.socketsByChannel.has(join.channel)) {
            log.debug(`Creating channel ${join.channel}`);
            this.socketsByChannel.set(join.channel, new Map<string, Socket>());
        }
        log.debug(`socket ${socket.id} joined ${join.channel}`);

        const addPeer = new messages.AddPeer(socket.id, false);
        this.broadcast(join.channel, messages.AddPeer.signal, addPeer);
        this.sendChannelMembersToPeer(socket, join.channel);

        this.socketsByChannel.get(join.channel).set(socket.id, socket);
        socket.addChannel(join.channel);
        socket.emit(messages.Joined.signal, new messages.Joined(socket.id, join.channel));
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
        log.debug(`got relay ice candidate message from ${socket.id}`);
        if (this.sockets.has(message.socketId)) {
            log.debug(`relaying ice candidate from ${socket.id} to ${message.socketId}. details: ${JSON.stringify(message)}`);
            const targetId = message.socketId;
            message.socketId = socket.id;
            this.sockets.get(targetId).emit(messages.RelayIceCandidate.signal, message);
        }
    }

    private onRelaySessionDescription(socket: Socket, message: messages.RelaySessionDescription) {
        log.debug(`got relay session description from ${socket.id}`);
        if (this.sockets.has(message.socketId)) {
            log.debug(`relaying socket description ${message.description.type} from ${socket.id} to ${message.socketId}.`);
            const targetId = message.socketId;
            message.socketId = socket.id;
            this.sockets.get(targetId).emit(messages.RelaySessionDescription.signal, message);
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
        log.debug(`broadcasting message ${message} with data ${JSON.stringify(data)} to channel ${channel}`);
        if (this.socketsByChannel.has(channel)) {
            const channelSockets: Map<string, Socket> = this.socketsByChannel.get(channel);
            channelSockets.forEach((socket: Socket, key: string) => {
                log.debug(`sending broadcast message to ${socket.id}`);
                socket.emit(message, data);
            });
            log.debug(`Done broadcasting to channel ${channel}`);
        }
    }

    private sendChannelMembersToPeer(socket: Socket, channelName: string) {
        log.debug(`sending channel members to socket ${socket.id}`);

        this.socketsByChannel.get(channelName).forEach((peerSocket: Socket, key: string) => {
            log.debug(`sending ${peerSocket.id} to ${socket.id}`);
            const peer = new messages.AddPeer(peerSocket.id, true);
            socket.emit(messages.AddPeer.signal, peer);
        });
        log.debug(`done sending channel members to ${socket.id}`);
    }
}
