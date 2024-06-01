
/*
This class provides tools for verifying that a passed in configuration for a method conforms to a template
*/
class ConfigUtil {

    static validateConfiguration(template, configToValidate, minimalTemplate) {
        // TODO Need to check child objects too
        for (let key of Object.keys(configToValidate)) {
            if (!template.hasOwnProperty(key)) {
                throw new Error(`Passed in config has unrecognized property "${key}"`);
            }
        }
        if (minimalTemplate) {
            for (let key of Object.keys(minimalTemplate)) {
                if (!configToValidate.hasOwnProperty(key)) {
                    throw new Error(`Passed in config is missing required ${key} key`);
                }
            }
        }
    }

}

class Robot {

    configuration;
    #stateKey;
    #stepExecutorInterval;

    constructor(configuration) {
        ConfigUtil.validateConfiguration(Robot.#defaultConfig, configuration);
        this.configuration = configuration;
        this.#stateKey = `${configuration.name}-state`;
        (async () => { console.log(`The state of the robot is ${await this.getState()}`); })();
        for (let step of this.configuration.steps) step.configuration.robot = this;
        (async () => {
            if (configuration.dataKeys) {
                for (let key of Object.keys(configuration.dataKeys)) {
                    console.log(`${key} has value ${await IO.getValue(configuration.dataKeys[key])}`);
                }
            }
        })();
        (async () => {
            if (await IO.getValue(this.#stateKey) === "running") this.start();
        })();
    }

    start() {
        IO.setValue(this.#stateKey, "running");
        // Schedule an interval to check for runnable steps. Save the interval in this object for later clearing
        if (this.#stepExecutorInterval) {
            clearInterval(this.#stepExecutorInterval);
        }
        this.#stepExecutorInterval = setInterval(() => {
            for (let step of this.configuration.steps) step.execute(this);
        }, 1000);
    }

    stop() {
        IO.setValue(this.#stateKey, "stopped");
        if (this.#stepExecutorInterval) clearInterval(this.#stepExecutorInterval);
    }

    reset() {
        for (let step of this.configuration.steps) step.reset();
    }

    async getState() {
        return await IO.getValue(this.#stateKey);
    }

    static #defaultConfig = {
        name: "DefaultRobot",
        dataKeys: {},
        steps: []
    }

}

class Step {

    configuration;

    #runCountKey;
    #isLocked;

    constructor(configuration) {
        ConfigUtil.validateConfiguration(Step.#defaultConfig, configuration);
        this.configuration = configuration;
        this.#isLocked = false;
    }

    async execute(robot) {
        this.#runCountKey = `${robot.configuration.name || "[robotless]"}-${this.configuration.name}-runCount`;
        let areAnyTriggersActive = false;
        const currentRunCount = parseInt(await IO.getValue(this.#runCountKey)) || 0;
        // Don't continue with execution if this is a non-repeateable task and it has already executed
        if ((this.configuration.hasOwnProperty("isRepeatable") && !this.configuration.isRepeatable || Step.#defaultConfig.isRepeatable) && currentRunCount > 0) {
            return;
        }
        for (let trigger of this.configuration.triggers) {
            if (await trigger()) {
                areAnyTriggersActive = true;
                break;
            }
        }
        if (areAnyTriggersActive && this.configuration.action) {
            if (!this.#isLocked) {
                try {
                    this.#isLocked = true;
                    await this.configuration.action(robot);
                } finally {
                    this.#isLocked = false;
                }
            }
            IO.setValue(this.#runCountKey, currentRunCount + 1);
        }
    }

    async reset() {
        if (this.configuration.resetCallback) this.configuration.resetCallback();
        IO.setValue(this.#runCountKey, 0);
    }

    static #defaultConfig = {
        name: "DefaultStep",
        action: () => {},
        triggers: [],
        resetCallback: () => {},
        isRepeatable: false
    }

}