import * as path from "path";
import * as log from "winston";
import { Discovery } from "./discovery/Discovery";
import { Sockets } from "./discovery/Sockets";
import { Express } from "./http/Express";
import { HttpServer } from "./http/HttpServer";

log.configure({
    level: "debug",
    transports: [
        new log.transports.Console({ colorize: true }),
        // new log.transports.File({filename: "/var/log/transmission.log"}),
    ],
});

log.info("Logging configured.");

const assetServer: HttpServer = new Express("./server/http/views", path.join(__dirname, "./../client"));
assetServer.serve(process.env.PORT || 8080);

const discoveryServer: Discovery = new Discovery(new Sockets());
discoveryServer.listen(process.env.discoveryPort || 3000);
