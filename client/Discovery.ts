import * as socketIo from "socket.io-client";
import * as messages from "../server/discovery/messages/index";
import * as rtc from "../server/discovery/rtc";
import { IceConfig } from "../server/discovery/rtc/IceConfig";

class Discovery {

    private textAreaElement: HTMLTextAreaElement;
    private mediaDivElement: HTMLDivElement;
    private socket: SocketIO.Server;
    private lobby = "lobby";
    private iceServers = ["stun:stun.l.google.com:19302"];
    private localMediaStream: MediaStream;
    private peers = new Map<string, RTCPeerConnection>();
    private peerMediaElements = new Map<string, HTMLVideoElement>();

    constructor(textAreaElement: HTMLTextAreaElement, mediaDivElement: HTMLDivElement) {
        this.textAreaElement = textAreaElement;
        this.mediaDivElement = mediaDivElement;
        this.socket = socketIo("http://127.0.0.1:3000", {transports: ["websocket", "polling", "flashsocket"]});
        this.socket.on(messages.Connection.signal, () => {
            this.log("Connected to signaling server");
            this.initMediaDevices((accessGranted) => {
                if (accessGranted) {
                    this.log("media attached.");
                    this.sendJoinSignal();
                } else {
                    this.log("media was forbidden, demo will not work");
                }
            });
        });
        this.socket.on(messages.Disconnect.signal, () => { this.onDisconnect(); });
        this.socket.on(messages.AddPeer.signal, (message: messages.AddPeer) => { this.onAddPeer(message); });
        this.socket.on(messages.RemovePeer.signal, (message: messages.RemovePeer) => { this.onRemovePeer(message); });
        this.socket.on(messages.RelaySessionDescription.signal, (message: messages.RelaySessionDescription) => { this.onSessionDescription(message); });
        this.socket.on(messages.RelayIceCandidate.signal, (message: messages.RelayIceCandidate) => { this.onRelayIceCandidate(message); });
    }

    private sendJoinSignal() {
        const join = new messages.Join(this.lobby);
        this.log(`joining ${join.channel}`);
        this.socket.emit("join", join);
    }

    private onDisconnect() {
        this.log("disconnected from signaling server, removing media.");
        this.peerMediaElements.forEach((element: HTMLVideoElement, key: string) => {
            element.remove();
        });
        this.peerMediaElements.clear();
        this.peers.forEach((connection: RTCPeerConnection, id: string) => {
            connection.close();
        });
        this.peers.clear();
    }

    private onAddPeer(addPeerMessage: messages.AddPeer) {

        const peerConnection = new RTCPeerConnection(
            {iceServers: [{urls: this.iceServers}]},
        );

        this.peers.set(addPeerMessage.id, peerConnection);

        peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            this.log("peer connection received ICE candidate message");
            const relayIceCandidate = new messages.RelayIceCandidate(addPeerMessage.id, event.candidate);
            this.log(`sending Ice candidate: to ${addPeerMessage.id} via discovery server`);
            this.socket.emit(messages.RelayIceCandidate.signal, relayIceCandidate);
        };

        peerConnection.onaddstream = (event: MediaStreamEvent) => {
            this.log("remote media received");
            const videoElement = document.createElement("video") as HTMLVideoElement;
            this.setupVideoElementInDOM(videoElement, event.stream);
            this.peerMediaElements.set(addPeerMessage.id, videoElement);
        };

        peerConnection.addStream(this.localMediaStream);

        // TODO: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample
        // peerConnection.ondatachannel = (event: RTCDataChannelEvent) => {
        //     // TODO: raw data (i.e. maybe some text protocol?)
        // };
        // peerConnection.createDataChannel("someChannel", {});

        if (addPeerMessage.createOffer) {
            this.log(`creating offer for peer ${addPeerMessage.id}`);
            peerConnection.createOffer((description) => {
                peerConnection.setLocalDescription(description, () => {
                    const relaySessionDescription = new messages.RelaySessionDescription(addPeerMessage.id, description);
                    this.log(`sending ${relaySessionDescription.description.type} to ${addPeerMessage.id} via discovery server`);
                    this.socket.emit(messages.RelaySessionDescription.signal, relaySessionDescription);
                });
            }, (error) => {
                this.log(`Error sending offer: ${error}`);
            });
        }
    }

    private onRemovePeer(removePeer: messages.RemovePeer) {
        this.log(`removing peer: ${removePeer.peerId}`);
        if (this.peers.has(removePeer.peerId)) {
            this.peers.get(removePeer.peerId).close();
            this.peers.delete(removePeer.peerId);
        }

        if (this.peerMediaElements.has(removePeer.peerId)) {
            this.log(`removing element`);
            this.peerMediaElements.get(removePeer.peerId).remove();
            this.peerMediaElements.delete(removePeer.peerId);
        }
    }

    private onSessionDescription(message: messages.RelaySessionDescription) {
        this.log(`got ${message.description.type} from ${message.socketId}`);
        if (this.peers.has(message.socketId)) {
            const peer = this.peers.get(message.socketId);
            peer.setRemoteDescription(message.description, () => {
                if (message.description.type === messages.SessionDescriptionTypes.Offer) {
                    peer.createAnswer((localDescription) => {
                        peer.setLocalDescription(localDescription, () => {
                            const relaySessionDescription = new messages.RelaySessionDescription(message.socketId, localDescription);
                            this.log(`Sending ${relaySessionDescription.description.type} to ${message.socketId}`);
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

    private onRelayIceCandidate(message: messages.RelayIceCandidate) {
        const peer = this.peers.get(message.socketId);
        const promise = peer.addIceCandidate(message.iceCandidate);
        promise.catch((reason) => {
            this.log(`something went wrong with the ice candidate: ${reason}`);
        });
    }

    private log(message: string) {
        const history = this.textAreaElement.innerText;
        this.textAreaElement.value += `${history}${message} \n`;
    }

    private initMediaDevices(callback: (result: boolean) => void) {

        if (this.localMediaStream != null) {
            this.log("media is already set");
            callback(true);
            return;
        }

        this.log("Requesting access to media devices");
        navigator.getUserMedia = (navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
        navigator.getUserMedia({ audio: true, video: true }, (stream) => {
            this.localMediaStream = stream;
            const videoElement = document.createElement("video") as HTMLVideoElement;
            this.setupVideoElementInDOM(videoElement, this.localMediaStream);
            callback(true);
        }, () => {
            callback(false);
        });
    }

    private setupVideoElementInDOM(videoElement: HTMLVideoElement, stream: MediaStream) {
        this.log("setting video element in media div");
        videoElement.setAttribute("autoplay", "autoplay");
        videoElement.setAttribute("muted", "true");
        videoElement.setAttribute("controls", "");
        videoElement.setAttribute("style", "width:320px;height:240px;");
        videoElement.srcObject = stream;
        this.mediaDivElement.appendChild(videoElement);
    }
}

window.onload = () => {
    const textArea = document.getElementById("console") as HTMLTextAreaElement;
    const mediaDiv = document.getElementById("media") as HTMLDivElement;
    const discovery = new Discovery(textArea, mediaDiv);
};
