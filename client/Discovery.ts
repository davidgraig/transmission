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
        this.socket.on(messages.AddPeer.signal, (message: messages.AddPeer) => { this.onAddPeer(message); });
        this.socket.on(messages.SessionDescription.signal, (message: messages.SessionDescription) => { this.onSessionDescription(message); });
        this.socket.on(messages.IceCandidate.signal, (message: messages.IceCandidate) => { this.onIceCandidate(message); });
        this.socket.on(messages.RemovePeer.signal, (message: messages.RemovePeer) => { this.onRemovePeer(message); });
    }

    private sendJoinSignal() {
        const join = new messages.Join(this.lobby);
        this.log(`joining ${join.channel}`);
        this.socket.emit("join", join);
    }

    private onDisconnect() {
        this.log("disconnected from signaling server");
    }

    private onAddPeer(addPeerMessage: messages.AddPeer) {
        const peerConnection = new RTCPeerConnection(new IceConfig(this.iceServers));

        this.peers.set(addPeerMessage.id, peerConnection);

        peerConnection.addEventListener("icecandidate", (event) => {
            this.log("peer connection received icecandidate message");
            const relayIceCandidate = new messages.RelayIceCandidate(addPeerMessage.id, event.candidate.candidate);
            this.log(`sending Ice candidate: to ${addPeerMessage.id} via discovery server`);
            this.socket.emit(messages.RelayIceCandidate.signal, relayIceCandidate);
        }, false);

        peerConnection.addEventListener("addstream", (event) => {
            this.log("peer connection received add stream message");
        }, false);

        if (addPeerMessage.createOffer) {
            this.log(`creating offer for peer ${addPeerMessage.id}`);
            peerConnection.createOffer((description) => {
                peerConnection.setLocalDescription(description, () => {
                    const relaySessionDescription = new messages.RelaySessionDescription(addPeerMessage.id, description.type, description.sdp);
                    this.log(`sending session description to ${addPeerMessage.id} via discovery server`);
                    this.socket.emit(messages.RelaySessionDescription.signal, relaySessionDescription);
                });
            }, (error) => {
                this.log(`Error sending offer: ${error}`);
            });
        }
    }

    private onSessionDescription(description: messages.SessionDescription) {
        this.log(`got session description from ${description.senderSocketId}`);
        if (this.peers.has(description.senderSocketId)) {
            const peer = this.peers.get(description.senderSocketId);
            const remoteDescription = new RTCSessionDescription({sdp: description.sdp, type: description.type});
            peer.setRemoteDescription(remoteDescription, () => {
                this.log("Set remote description successfully...");
                if (remoteDescription.type === messages.SessionDescriptionTypes.Offer) {
                    this.log("... creating answer");
                    peer.createAnswer((localDescription) => {
                        peer.setLocalDescription(localDescription, () => {
                            const relaySessionDescription = new messages.RelaySessionDescription(description.senderSocketId, localDescription.type, localDescription.sdp);
                            this.socket.emit(messages.RelaySessionDescription.signal, relaySessionDescription);
                        }, (error) => {
                            this.log(`setting local description answer failed: ${error}`);
                        });
                    }, (error) => {
                        this.log(`error creating answer: ${error}`);
                    });
                }
            }, (error) => {
                this.log(`error setting remote description: ${error}`);
            });
        }
    }

    private onIceCandidate(iceCandidate: messages.IceCandidate) {
        this.log(`got ICE candidate: ${iceCandidate.iceCandidate}`);
    }

    private onRemovePeer(removePeer: messages.RemovePeer) {
        this.log(`removing peer: ${removePeer.peerId}`);
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
