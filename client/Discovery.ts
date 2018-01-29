import * as socketIo from "socket.io-client";

class Discovery {

  private element: HTMLElement;
  private socket: SocketIO.Server;

  constructor(element: HTMLElement) {
    this.element = element;
    this.element.innerText += "The time is: ";
    this.socket = socketIo("http://127.0.0.1:3000", {transports: ["websocket", "polling", "flashsocket"]});
  }
}

window.onload = () => {
  const el = document.getElementById("console");
  const greeter = new Discovery(el);
};
