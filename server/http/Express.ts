import * as express from "express";
import * as path from "path";
import * as log from "winston";
import { HttpServer } from "./HttpServer";

export class Express implements HttpServer {
    private express;

    constructor(viewDir: string, assetDir: string) {
        this.express = express();
        this.express.set("view engine", "pug");
        this.express.set("views", viewDir);
        this.express.use(express.static("../client"));
        this.express.use("/static", express.static(assetDir));
        this.mountRoutes();
    }

    serve(port) {
        this.express.listen(port, (err) => {
            if (err) {
                // todo: throw an exception.
                return log.error("Error starting HTTP server", err);
            }

            return log.info(`HTTP server is listening on ${port} for requests for static resources`);
        });
    }

    private mountRoutes(): void {
        const router = express.Router();
        router.get("/", (req, res) => {
            res.render("console", { title: "Transmission", message: "Transmission Console" });
        });
        this.express.use("/", router);
    }
}
