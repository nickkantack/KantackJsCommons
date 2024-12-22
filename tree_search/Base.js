class Base {

    static baseClassWarn() {
        throw new Error("Abstract method invoked without override.");
    }

}

export { Base }