import * as httpServer from "http";
import * as socketIo from "socket.io";
import * as log from "winston";
import * as messages from "./messages";
import { Socket } from "./Socket";
import { Sockets } from "./Sockets";

export class Discovery {

    private io: SocketIO.Server;
    private sockets: Sockets;

    constructor(sockets: Sockets) {
        const server = httpServer.createServer();
        this.sockets = sockets;
        this.io = socketIo({
            pingInterval: 2000,
            pingTimeout: 5000,
            serveClient: false,
        });
    }

    listen(port: number) {
        this.io.attach(port);
        const namespace = this.io.on(messages.Connection.signal, (socket: SocketIO.Socket) => {
            log.debug(`socket connected: ${socket.id}`);
            this.sockets.addSocket(socket);
        });
        log.info(`Discovery server is running on namespace ${namespace.name}`);
    }
}
