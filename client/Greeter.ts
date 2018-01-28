class Greeter {

    private element: HTMLElement;
    constructor(element: HTMLElement) {
        this.element = element;
        this.element.innerText += "The time is: ";
    }
}

window.onload = () => {
    const el = document.getElementById("console");
    const greeter = new Greeter(el);
};
