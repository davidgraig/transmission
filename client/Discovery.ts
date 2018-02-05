import { deserialize } from "json-typescript-mapper";
import * as socketIo from "socket.io-client";
import { IceCandidate } from "../server/discovery/messages/IceCandidate";
import * as messages from "../server/discovery/messages/index";
import * as rtc from "../server/discovery/rtc";
import { IceConfig } from "../server/discovery/rtc/IceConfig";

class Discovery {

    private element: HTMLTextAreaElement;
    private socket: SocketIO.Server;
    private lobby = "lobby";
    private iceServers = [
        new rtc.IceServer(["stun:stun.l.google.com:19302"]),
    ];
    private peers = new Map<string, RTCPeerConnection>();

    constructor(element: HTMLTextAreaElement) {
        this.element = element;
        this.socket = socketIo("http://127.0.0.1:3000", {transports: ["websocket", "polling", "flashsocket"]});
        this.socket.on(messages.Connection.signal, () => {
            this.log("Connected to signaling server with id ");
            this.sendJoinSignal();
        });
        this.socket.on(messages.Disconnect.signal, () => { this.onDisconnect(); });
        this.socket.on(messages.AddPeer.signal, (jsonString) => { this.onAddPeer(jsonString); });
        this.socket.on(messages.SessionDescription.signal, (jsonString) => { this.onSessionDescription(jsonString); });
        this.socket.on(messages.IceCandidate.signal, (jsonString) => { this.onIceCandidate(jsonString); });
        this.socket.on(messages.RemovePeer.signal, (jsonString) => { this.onRemovePeer(jsonString); });
    }

    private sendJoinSignal() {
        const join = new messages.Join();
        join.channel = this.lobby;
        const messageString: string = JSON.stringify(join);
        this.log(`sending join message: ${messageString}`);
        this.socket.emit("join", messageString);
    }

    private onDisconnect() {
        this.log("disconnected from signaling server");
    }

    private onAddPeer(jsonString: string) {
        this.log(`adding peer ${jsonString}`);
        const addPeerMessage = deserialize(messages.AddPeer, JSON.parse(jsonString));
        const peerConnection = new RTCPeerConnection(new IceConfig(this.iceServers));

        this.peers.set(addPeerMessage.id, peerConnection);

        peerConnection.addEventListener("icecandidate", (event) => {
            this.log("peer connection received icecandidate message");
            const relayIceCandidate = new messages.RelayIceCandidate();
            relayIceCandidate.targetSocketId = addPeerMessage.id;
            relayIceCandidate.iceCandidate = event.candidate.candidate;
            const messageString = JSON.stringify(relayIceCandidate);
            this.log(`sending Ice candidate: ${messageString} to ${addPeerMessage.id} via discovery server`);
            this.socket.emit(messages.RelayIceCandidate.signal, messageString);
        }, false);

        peerConnection.addEventListener("addstream", (event) => {
            this.log("peer connection received add stream message");
        }, false);

        if (addPeerMessage.createOffer) {
            this.log(`creating offer for peer ${addPeerMessage.id}`);
            peerConnection.createOffer((description) => {
                this.log(`local offer description: \n\n ${description.sdp}`);
                peerConnection.setLocalDescription(description, () => {
                    const relaySessionDescription = new messages.RelaySessionDescription();
                    relaySessionDescription.targetSocketId = addPeerMessage.id;
                    relaySessionDescription.sessionDescription = JSON.stringify(description);
                    const messageString = JSON.stringify(relaySessionDescription);
                    this.log(`sending session description ${messageString} to ${addPeerMessage.id} via discovery server`);
                    this.socket.emit(messages.RelaySessionDescription.signal, messageString);
                });
            }, (error) => {
                this.log(`Error sending offer: ${error}`);
            });
        }
    }

    private onSessionDescription(jsonString: string) {
        this.log(`got session description: ${jsonString}`);
    }

    private onIceCandidate(jsonString: string) {
        this.log(`got ICE candidate: ${jsonString}`);
    }

    private onRemovePeer(jsonString: string) {
        this.log(`removing peer: ${jsonString}`);
    }

    private log(message: string) {
        const history = this.element.innerText;
        this.element.value += `${history}${message} \n`;
    }
}

window.onload = () => {
    const el = document.getElementById("console") as HTMLTextAreaElement;
    const discovery = new Discovery(el);
};
