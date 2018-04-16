import * as socketIo from "socket.io-client";
import * as messages from "../server/discovery/messages/index";
import * as rtc from "../server/discovery/rtc";
import { IceConfig } from "../server/discovery/rtc/IceConfig";
import * as Collections from 'typescript-collections';

class Discovery {

    private useMedia = true;

    private textAreaElement: HTMLTextAreaElement;
    private mediaDivElement: HTMLDivElement;

    private socketId: string;
    private socket: SocketIO.Server;
    private lobby = "lobby";
    private iceServers = {iceServers: [{ urls: [
        "stun:stun.l.google.com:19302"
    ]}]};
    private localMediaStream: MediaStream;
    private localRtcConnection: RTCPeerConnection;
    private dataChannel: RTCDataChannel;
    private peerRtcConnections = new Map<string, RTCPeerConnection>();
    private peerMediaElements = new Map<string, HTMLVideoElement>();
    private peerDataChannels = new Map<string, RTCDataChannel>();
    private iceCandidateQueue = new Map<string, messages.RelayIceCandidate>();

    constructor(textAreaElement: HTMLTextAreaElement, mediaDivElement: HTMLDivElement) {
        this.textAreaElement = textAreaElement;
        this.mediaDivElement = mediaDivElement;
    }

    public connect() {
        this.socket = socketIo("http://127.0.0.1:3000", {transports: ["websocket", "polling", "flashsocket"]});
        this.socket.on(messages.Connection.signal, () => {
            console.debug("Connected to signaling server");
            if (this.useMedia) {
                this.initMediaDevices((accessGranted) => {
                    if (accessGranted) {
                        console.debug("media attached.");
                        this.sendJoinSignal();
                    } else {
                        console.debug("media was forbidden, demo will not work");
                    }
                });
            } else {
                this.sendJoinSignal();
            }
        });
        this.socket.on(messages.Joined.signal, (message: messages.Joined) => { this.onJoined(message); });
        this.socket.on(messages.Disconnect.signal, () => { this.onDisconnect(); });
        this.socket.on(messages.AddPeer.signal, (message: messages.AddPeer) => { this.onAddPeer(message); });
        this.socket.on(messages.RemovePeer.signal, (message: messages.RemovePeer) => { this.onRemovePeer(message); });
        this.socket.on(messages.RelaySessionDescription.signal, (message: messages.RelaySessionDescription) => { this.onSessionDescription(message); });
        this.socket.on(messages.RelayIceCandidate.signal, (message: messages.RelayIceCandidate) => { this.onRelayIceCandidate(message); });
    }

    private sendJoinSignal() {
        const join = new messages.Join(this.lobby);
        console.debug(`joining ${join.channel}`);
        this.socket.emit("join", join);
    }

    private onJoined(joinedMessage: messages.Joined) {
        console.debug(`joined ${joinedMessage.channel} with socket id ${joinedMessage.socketId}`);
        this.socketId = joinedMessage.socketId;
        this.localRtcConnection = new RTCPeerConnection(this.iceServers);
        this.dataChannel = this.localRtcConnection.createDataChannel('someChannel', null);
        this.dataChannel.onopen = this.onChannelStateChange;
        this.dataChannel.onclose = this.onChannelStateChange;
        this.dataChannel.onmessage = this.onMessage;
    }

    private onChannelStateChange(event) {
        console.debug(`Local channel state is: ${event.readyState}`);
    }

    private onMessage(message: MessageEvent) {
        console.debug(`GOT MESSAGE: ${message.data}`);
    }

    private onDisconnect() {

        this.dataChannel.close();
        this.localRtcConnection.close

        console.debug("disconnected from signaling server, removing media.");
        this.peerMediaElements.forEach((element: HTMLVideoElement, key: string) => {
            element.remove();
        });
        this.peerMediaElements.clear();

        this.peerDataChannels.forEach((channel: RTCDataChannel, key: string) => {
            channel.close();
        });
        this.peerDataChannels.clear();

        this.peerRtcConnections.forEach((connection: RTCPeerConnection, id: string) => {
            connection.close();
        });
        this.peerRtcConnections.clear();
    }

    private onAddPeer(addPeerMessage: messages.AddPeer) {

        console.debug(`got add peer message: ${JSON.stringify(addPeerMessage)}`);

        const peerConnection = new RTCPeerConnection(this.iceServers);

        this.peerRtcConnections.set(addPeerMessage.id, peerConnection);

        peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            console.debug(`received ICE candidate for remote RTCPeerConnection ${addPeerMessage.id}: ${JSON.stringify(event.candidate)}`);
            if (event.candidate != null) {
                const relayIceCandidate = new messages.RelayIceCandidate(addPeerMessage.id, event.candidate);
                console.debug(`sending ICE candidate to ${addPeerMessage.id}: ${JSON.stringify(relayIceCandidate)}`);
                this.socket.emit(messages.RelayIceCandidate.signal, relayIceCandidate);
            }
        };

        if (this.useMedia) {
            peerConnection.onaddstream = (event: MediaStreamEvent) => {
                console.debug("remote media received");
                const videoElement = document.createElement("video") as HTMLVideoElement;
                this.setupVideoElementInDOM(videoElement, event.stream);
                this.peerMediaElements.set(addPeerMessage.id, videoElement);
            };
            peerConnection.addStream(this.localMediaStream);
        }

        const peerDataChannel: RTCDataChannel = peerConnection.createDataChannel("messages");
        this.peerDataChannels.set(addPeerMessage.id, peerDataChannel);
        peerDataChannel.onopen = () => {
            console.debug("opened peer channel!");
            peerDataChannel.send("HI");
        };
        peerDataChannel.onclose = () => { console.debug("closed peer channel"); };
        peerDataChannel.onmessage = (data) => { console.debug(`got data: ${data}`); };

        if (addPeerMessage.createOffer) {
            console.debug(`creating offer for peer ${addPeerMessage.id}`);
            peerConnection.createOffer((offerDescription) => {
                console.debug(`created offer ${offerDescription.type}, setting local description on peerconnection`);
                peerConnection.setLocalDescription(offerDescription, () => {
                    console.debug(`local description set for ${addPeerMessage.id}: ${JSON.stringify(offerDescription)}`);
                    const relaySessionDescription = new messages.RelaySessionDescription(addPeerMessage.id, offerDescription);
                    console.debug(`sending offer to ${addPeerMessage.id} via discovery server`);
                    this.socket.emit(messages.RelaySessionDescription.signal, relaySessionDescription);
                }, (error) => {
                    console.debug(`Error setting local description: ${error}`)
                });
            }, (error) => {
                console.debug(`Error sending offer: ${error}`);
            });
        }
    }

    private onRemovePeer(removePeer: messages.RemovePeer) {
        console.debug(`removing peer: ${removePeer.peerId}`);
        if (this.peerRtcConnections.has(removePeer.peerId)) {
            this.peerRtcConnections.get(removePeer.peerId).close();
            this.peerRtcConnections.delete(removePeer.peerId);
        }

        if (this.peerMediaElements.has(removePeer.peerId)) {
            console.debug(`removing element`);
            this.peerMediaElements.get(removePeer.peerId).remove();
            this.peerMediaElements.delete(removePeer.peerId);
        }

        if (this.peerDataChannels.has(removePeer.peerId)) {
            this.peerDataChannels.get(removePeer.peerId).close();
            this.peerDataChannels.delete(removePeer.peerId);
        }
    }

    private onSessionDescription(message: messages.RelaySessionDescription) {
        console.debug(`got session description ${message.description.type} from ${message.socketId}`);
        if (this.peerRtcConnections.has(message.socketId)) {
            const peer = this.peerRtcConnections.get(message.socketId);
            if (message.description.type === messages.SessionDescriptionTypes.Offer) {
                console.debug(`Got Offer: Setting peer ${message.socketId}'s remote description ${JSON.stringify(message.description)}`);
                peer.setRemoteDescription(message.description, () => {
                    peer.createAnswer((answerDescription) => {
                        peer.setLocalDescription(answerDescription, () => {
                            const relaySessionDescription = new messages.RelaySessionDescription(message.socketId, answerDescription);
                            console.debug(`Sending answer to ${message.socketId}: ${JSON.stringify(answerDescription)}`);
                            this.socket.emit(messages.RelaySessionDescription.signal, relaySessionDescription);
                        }, (error) => {
                            console.debug(`setting local description answer failed: ${error}`);
                        });
                    }, (error) => {
                        console.debug(`error creating answer: ${error}`);
                    });
                }, (error) => {
                    console.debug(`error setting remote description: ${error}`);
                });

                if (this.iceCandidateQueue.has(message.socketId)) {
                    this.addIceCandidate(peer, this.iceCandidateQueue.get(message.socketId));
                }
            } else if (message.description.type === messages.SessionDescriptionTypes.Answer) {
                console.debug(`Got Answer: Setting peer ${message.socketId}'s remote description ${JSON.stringify(message.description)}`);
                peer.setRemoteDescription(message.description);
                if (this.iceCandidateQueue.has(message.socketId)) {
                    this.addIceCandidate(peer, this.iceCandidateQueue.get(message.socketId));
                }
            }
        }
    }

    private onRelayIceCandidate(message: messages.RelayIceCandidate) {
        console.debug(`got ice candidate from ${message.socketId}: ${JSON.stringify(message.iceCandidate)}`);
        const peer = this.peerRtcConnections.get(message.socketId);
        this.addIceCandidate(peer, message);
    }

    private addIceCandidate(peer: RTCPeerConnection, message: messages.RelayIceCandidate) {
        const self = this;
        if (peer && peer.remoteDescription.type) {
            peer.addIceCandidate(message.iceCandidate).then(
                function() {
                    console.debug("Add Ice Candidate Success")
                    self.iceCandidateQueue.has(message.socketId);
                  },
                  function(err) {
                    console.debug(`Failed to add Ice Candidate: ${err}`)
                  }
            );
        } else {
            this.iceCandidateQueue.set(message.socketId, message);
        }
    }

    private writeToTextArea(message: string) {
        const history = this.textAreaElement.innerText;
        this.textAreaElement.value += `${history}${message} \n`;
    }

    private initMediaDevices(callback: (result: boolean) => void) {

        if (this.localMediaStream != null) {
            console.debug("media is already set");
            callback(true);
            return;
        }

        console.debug("Requesting access to media devices");
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
        console.debug("setting video element in media div");
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
    // tslint:disable-next-line:no-any
    (window as any).discovery = discovery;
};
