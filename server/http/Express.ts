import * as express from "express";
import * as path from "path";
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

  public serve(port) {
    this.express.listen(port, (err) => {
      if (err) {
        // todo: throw an exception.
        // tslint:disable-next-line:no-console
        return console.log(err);
      }
      // tslint:disable-next-line:no-console
      return console.log(`server is listening on ${port}`);
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
