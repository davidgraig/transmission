import * as path from "path";
import { SocketIo } from "./discovery/SocketIo";
import { Express } from "./http/Express";
import { HttpServer } from "./http/HttpServer";

const assetServer: HttpServer = new Express("./server/http/views", path.join(__dirname, "./../client"));
assetServer.serve(process.env.PORT || 8080);

const discoveryServer: SocketIo = new SocketIo();
discoveryServer.listen(process.env.discoveryPort || 3000);
