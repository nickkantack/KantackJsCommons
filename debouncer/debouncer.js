
/**
 * This class abstracts away the logic of "debounce" from an application. Debounce is a process
 * of filtering a noisy signal so that the internal state of the debouncer only changes values
 * once attempt to set its internal state have stabilized on a consistent value for some time.
 * If, for instance, some code logic flips a logical flag very sporadically, this debouncer
 * class can provide a more stable flag that only changes state when the sporadic setting code
 * has not attempted a flip within the last X milliseconds, where X is configurable on the 
 * debouncer. This class supports polling the stabilized value of the debouncer as well as 
 * configuring a listener to fire once the stabilized value changes.
 */
class Debouncer {

    static MAXIMAL_TEMPLATE = {
        debouncePeriodMs: null,
        onStateChange: null
    }

    static MINIMAL_TEMPLATE = {
        debouncePeriodMs: null
    }

    #candidateInternalState = null;
    #internalState = null;
    #config = 0;
    #onStateChangeListeners = {};
    #stateChangeTimeout = null;

    constructor(args) {
        ConfigUtil.validateConfiguration({minimalTemplate: Debouncer.MINIMAL_TEMPLATE,
            maximalTemplate: Debouncer.MAXIMAL_TEMPLATE,
            configToValidate: args});
        this.#config = args;
    }

    setState(value) {
        if (value != this.#candidateInternalState) {
            this.#candidateInternalState = value;
            clearTimeout(this.#stateChangeTimeout);
            this.#stateChangeTimeout = setTimeout(() => {
                this.#internalState = value;
                for (let callback of Object.values(this.#onStateChangeListeners)) {
                    callback(value);
                }
            }, this.#config.debouncePeriodMs);
        }
    }

    forceState(value) {
        this.#internalState = value;
    }

    getState() {
        return this.#internalState;
    }

    addOnStateChangeListener(callback) {
        let maxKey = -1;
        for (let key of Object.keys(this.#onStateChangeListeners)) {
            if (key > maxKey) maxKey = key;
        }
        const newKey = maxKey + 1;
        this.#onStateChangeListeners.newKey = callback;
        return newKey;
    }

    removeOnStateChangeListener(key) {
        if (this.#onStateChangeListeners.hasOwnProperty(key)) {
            delete this.#onStateChangeListeners.key;
        }
    }

    /**
     * This method doesn't check any assertions but prints a periodic sequence of logs that
     * should reveal the debounce working correctly. Specifically, it calls setState with 
     * alternating arguments of true and false (the alternation does not happen on each request,
     * as this would prevent the state from ever changing, but rather it calls a large cluster
     * of setState(true) calls before switching to setState(false) and vice versa). The expected
     * behavior is that you see the state resist changing until the debouncePeriodMs has expired,
     * after which you get a single call to the change listener and a flip in the value returned
     * by getState().
     */
    test() {
        const debouncer = new Debouncer({debouncePeriodMs: 1000});
        debouncer.forceState(false);
        debouncer.addOnStateChangeListener((state) => {
            console.log(`State changed listener called with state ${state}`);   
        });
        let setCallCount = 0;
        setInterval(() => {
            setCallCount++;
            debouncer.setState(setCallCount % 12 > 5);
            console.log(`Called debouncer.setState(${setCallCount %12 > 5}) and getState() returns ${debouncer.getState()}`);
        }, 250);
    }

}