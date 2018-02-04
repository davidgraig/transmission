import * as socketIo from "socket.io-client";
import * as messages from "../server/discovery/messages/index";
import { RelayIceCandidate } from "../server/discovery/messages/RelayIceCandidate";
import * as rtc from "../server/discovery/rtc";

class Discovery {

    private element: HTMLTextAreaElement;
    private socket: SocketIO.Server;
    private lobby = "lobby";
    private iceServers = [{url: "stun:stun.l.google.com:19302"}];
    private peers = {};

    constructor(element: HTMLTextAreaElement) {
        this.element = element;
        this.socket = socketIo("http://127.0.0.1:3000", {transports: ["websocket", "polling", "flashsocket"]});
        this.socket.on(messages.Connection.signal, () => { this.sendJoinSignal(); });
        this.socket.on(messages.Disconnect.signal, () => { this.onDisconnect(); });
        this.socket.on(messages.AddPeer.signal, (jsonString) => { this.onAddPeer(jsonString); });
        this.socket.on(messages.SessionDescription.signal, (jsonString) => { this.onSessionDescription(jsonString); });
        this.socket.on(messages.IceCandidate.signal, (jsonString) => { this.onIceCandidate(jsonString); });
        this.socket.on(messages.RemovePeer.signal, (jsonString) => { this.onRemovePeer(jsonString); });
    }

    private sendJoinSignal() {
        this.log("Connected to signaling server");
        const join = new messages.Join();
        join.channel = this.lobby;
        const jsonString: string = JSON.stringify(join);
        this.log(`Sending join message: ${jsonString}`);
        this.socket.emit("join", jsonString);
    }

    private onDisconnect() {
        this.log("Disconnected from signaling server");
    }

    private onAddPeer(jsonString: string) {
        this.log(`Adding peer ${jsonString}`);
    }

    private onSessionDescription(jsonString: string) {
        this.log(`Got Session Description: ${jsonString}`);
    }

    private onIceCandidate(jsonString: string) {
        this.log(`Got ICE Candidiate: ${jsonString}`);
    }

    private onRemovePeer(jsonString: string) {
        this.log(`Removing peer: ${jsonString}`);
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
