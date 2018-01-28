import * as express from "express";
import * as path from "path";

class App {
  public express;

  constructor() {
    this.express = express();
    this.express.set("view engine", "pug");
    this.express.set("views", "./server/views");

    this.express.use(express.static("../client"));
    this.express.use("/static", express.static(path.join(__dirname, "./../client")));

    this.mountRoutes();
  }

  private mountRoutes(): void {
    const router = express.Router();
    router.get("/", (req, res) => {
      res.render("console", { title: "Transmission", message: "Transmission Console" });
    });
    this.express.use("/", router);
  }
}

export default new App().express;
