import { deserialize } from "json-typescript-mapper";
import * as log from "winston";
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
        webSocket.on(messages.RelaySessionDescription.signal, (jsonString: string) => this.onRelaySessionDescription(socket, jsonString));
    }

    private onSocketJoin(socket: Socket, joinJsonString: string): void {
        const join = deserialize(messages.Join, JSON.parse(joinJsonString));

        if (!this.socketsByChannel.has(join.channel)) {
            log.debug(`Creating channel ${join.channel}`);
            this.socketsByChannel.set(join.channel, new Map<string, Socket>());
        }
        log.debug(`socket ${socket.id} joined ${join.channel}`);

        const addPeer = new messages.AddPeer();
        addPeer.id = socket.id;
        addPeer.createOffer = false;
        this.broadcast(join.channel, messages.AddPeer.signal, JSON.stringify(addPeer));
        this.sendPeerChannelMembers(socket, join.channel);

        this.socketsByChannel.get(join.channel).set(socket.id, socket);
        socket.addChannel(join.channel);
    }

    private onSocketDisconnect(socket: Socket) {
        log.debug(`socket disconnected: ${socket.id}`);
        for (const channel of socket.channels) {
            this.leave(socket, channel);
            const removePeer = new messages.RemovePeer();
            removePeer.peerId = socket.id;
            this.broadcast(channel, messages.RemovePeer.signal, JSON.stringify(removePeer));
        }
        this.sockets.delete(socket.id);
    }

    private onRelayIceCandidate(socket: Socket, jsonString: string) {
        const message = deserialize(messages.RelayIceCandidate, JSON.parse(jsonString));
        const iceCandidate = new messages.IceCandidate();
        iceCandidate.iceCandidate = message.iceCandidate;
        this.sockets.get(message.targetSocketId).emit(messages.IceCandidate.signal, JSON.stringify(iceCandidate));
    }

    private onRelaySessionDescription(socket: Socket, jsonString: string) {
        const message = deserialize(messages.RelaySessionDescription, JSON.parse(jsonString));
        log.debug(`relaying socket description from ${socket.id} to ${message.targetSocketId}`);
        const sessionDescription = new messages.SessionDescription();
        sessionDescription.sessionDescription = message.sessionDescription;
        this.sockets.get(message.targetSocketId).emit(messages.SessionDescription.signal, JSON.stringify(sessionDescription));
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

    private broadcast(channel: string, message: string, data: string) {
        if (this.socketsByChannel.has(channel)) {
            const channelSockets: Map<string, Socket> = this.socketsByChannel.get(channel);
            channelSockets.forEach((socket: Socket, key: string) => {
                log.debug(`Broadcasting ${message} with data ${data} to ${socket.id}`);
                socket.emit(message, data);
            });
        }
    }

    private sendPeerChannelMembers(socket: Socket, channelName: string) {
        for (const socketId of this.socketsByChannel.get(channelName).keys()) {
            const peer = new messages.AddPeer();
            peer.id = socketId;
            peer.createOffer = true;
            socket.emit(messages.AddPeer.signal, JSON.stringify(peer));
        }
    }
}
