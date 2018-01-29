import * as httpServer from "http";
import * as socketIo from "socket.io";

export class SocketIo {

    private io: SocketIO.Server;

    constructor() {
        const server = httpServer.createServer();
        this.io = socketIo({
            pingInterval: 2000,
            pingTimeout: 5000,
            serveClient: false,
        });
    }

    public listen(port: number) {
        this.io.attach(port);

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
