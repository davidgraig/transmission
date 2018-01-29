import * as httpServer from "http";
import * as socketIo from "socket.io";

export class SocketIo {

    private io: SocketIO.Server;

    constructor(port: number) {

        const server = httpServer.createServer();
        this.io = socketIo({
            pingInterval: 2000,
            pingTimeout: 5000,
            serveClient: false,
        });

        this.io.attach(port);
    }

    public listen() {
        this.io.on("connection", (socket: SocketIO.Socket) => {
            // todo: use this to create some webrtc signals.

            // tslint:disable-next-line:no-console
            console.log("Connected: " + socket.client.id);

            socket.on("disconnect", () => {
                // tslint:disable-next-line:no-console
                console.log("Disconnected: " + socket.client.id);
            });
        });
    }

}
