class WebClient {

    static #defaultConfig = {
        isThrottledResponseChecker: (result) => { !/Too many calls per second/.test(result) },
        waitMillisBetweenThrottles: 1100,
        maxNumberOfAttempts: 3,
        returnParsedHtml: false
    }

    /* This generic helper method allows an asynchronous load of a url with a callback. The synchronous version of this method relies on this method */
    static loadUrl(url, cb) {
        let res;
        let options = {
            method: "GET",
            url: url,
            onload: function(res) { cb(res.responseText); },
            onerror: function() {
                if (res == undefined) {
                    console.error(`Got an undefined response when loading ${url}. Will not call the callback.`);
                    return;
                }
                cb(res.responseText);
            }
        };

        if (GM != null) {
            GM.xmlHttpRequest(options);
        } else {
            GM_xmlhttpRequest(options);
        }
    }

    // TODO abstract out the throttling checker into a config that's passed in
    static async loadUrlSync(url, configuration = {}) {
        ConfigUtil.validateConfiguration(WebClient.#defaultConfig, configuration);
        const maxNumberOfAttempts = configuration.maxNumberOfAttempts || WebClient.#defaultConfig.maxNumberOfAttempts;
        let result;
        for (let attemptNumber = 1; attemptNumber < maxNumberOfAttempts; attemptNumber++) {
            result = await WebClient.#loadUrlSyncHelper(url);
            let isThrottledResponseCheckerToUse = configuration.isThrottledResponseChecker || WebClient.#defaultConfig.isThrottledResponseChecker;
            if (isThrottledResponseCheckerToUse(result)) {
                console.warn(`Looks like we were throttled. ${attemptNumber < maxNumberOfAttempts - 1 ? "Will retry shortly." : "Ran out of retries."} Trying to load ${url}. Throttle response was ${result}`);
                break;
            }
            await WebClient.waitMs(configuration.waitMillisBetweenThrottles || WebClient.#defaultConfig.waitMillisBetweenThrottles);
        }
        if (result == undefined) console.error(`loadUrlSync failed to load url ${url}`);
        if (configuration.returnParsedHtml) {
            const parsedHtml = document.createElement("html");
            parsedHtml.innerHTML = result;
            return parsedHtml;
        } else {
            return result;
        }
    }

    static #loadUrlSyncHelper(url) {
        return new Promise((resolve) => {
            WebClient.loadUrl(url, resolve);
        });
    }

    static waitMs(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve("");
            }, ms);
        });
    }

    static navigateToUrl(url) {
        const a = document.createElement("a");
        a.href = url;
        document.body.append(a);
        a.click();
    }

    static waitUntilConditionOrTimeout(checker, timeout, period) {
        return new Promise(async (resolve, reject) => {
            if (checker()) resolve(true);
            const stopTime = Date.now() + timeout;
            const interval = setInterval(() => {
                if (Date.now() > stopTime) {
                    clearInterval(interval);
                    resolve(checker());
                }
                if (checker()) {
                    clearInterval(interval);
                    resolve(true);
                }
            }, period);
        });
    }

}

class RegexUtil {

    /* This function is a wrapper for String.match that logs some information about any failed match */
    static verboseMatch(string, regex) {
        const result = string.match(regex);
        if (result == null) console.error(`Did not find a match for regex ${regex} in string ${string}`);
        return result;
    }
}

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

class LoadingCompleteChecker {

    static #defaultConfig = {
        isLoadedChecker: () => {
            console.warn(`LoadingCompleteChecker running, but no check method was given. Just returning true now (i.e. assuming loading is complete).`);
         },
        doOnceLoaded: () => { console.warn(`Loading complete checker is ready to launch, but no actions are configured to be performed once loading is complete.`); },
        checkPeriodMs: 1000
    }
    #timeout;

    constructor(config) {
        ConfigUtil.validateConfiguration(LoadingCompleteChecker.#defaultConfig, config);

        this.#timeout = setInterval(() => {
            const isLoadedCheckerMethod = config.isLoadedChecker || LoadingCompleteChecker.#defaultConfig.isLoadedChecker;
            if (isLoadedCheckerMethod()) {
                clearInterval(this.#timeout);
                const doOnceLoadedMethod = config.doOnceLoaded || LoadingCompleteChecker.#defaultConfig.doOnceLoaded;
                doOnceLoadedMethod();
            }
        }, config.checkPeriodMs || LoadingCompleteChecker.#defaultConfig.checkPeriodMsk);
    }

    terminate() {
        clearInterval(this.#timeout);
    }

}

class ProcedureTable {

    taskList = [];
    currentTaskIndex = 0;
    isComplete = true;
    html = null;
    parent = null;
    table = null;
    spinInterval = null;
    alpha = 0;
    dashboard = null;
    finalSuccessMessage = null;
    finalFailureMessage = null;
    static emptyFinalResultSuccessDiv = `<div class="finalResult" style="font-size: 14px; border: 6px solid #070; border-radius: 10px; padding: 30px; background: #2A2; box-shadow: 3px 3px 3px #888; width: 60%; color: #FFF"></div>`;
    static emptyFinalResultFailureDiv = `<div class="finalResult" style="font-size: 14px; border: 6px solid #700; border-radius: 10px; padding: 30px; background: #F33; box-shadow: 3px 3px 3px #888; width: 60%; color: #FFF"></div>`;

    notStartedSvg = `<svg width="20px" height="20px" viewBox="0 0 100 100"><circle cx=50 cy=50 r=40 stroke="#666" stroke-width="8" fill="#BBB"/></svg>`;
    inProgressSvg = `<svg width="20px" height="20px" viewBox="0 0 100 100">
    <circle cx=50 cy=50 r=40 stroke="#22A" stroke-width="8" fill="#44F"/>
    <circle cx=50 cy=50 r=5 stroke="none" fill="#FFF"/>
    <circle cx=50 cy=50 r=5 stroke="none" fill="#FFF"/>
    <circle cx=50 cy=50 r=5 stroke="none" fill="#FFF"/>
    <circle cx=50 cy=50 r=5 stroke="none" fill="#FFF"/>
    <circle cx=50 cy=50 r=5 stroke="none" fill="#FFF"/>
    <circle cx=50 cy=50 r=5 stroke="none" fill="#FFF"/>
    <circle cx=50 cy=50 r=5 stroke="none" fill="#FFF"/>
    <circle cx=50 cy=50 r=5 stroke="none" fill="#FFF"/>
    </svg>`;
    skippedSvg = `<svg width="20px" height="20px" viewBox="0 0 100 100"><circle cx=50 cy=50 r=40 stroke="#AA2" stroke-width="8" fill="#FF4"/></svg>`;
    failedSvg = `<svg width="20px" height="20px" viewBox="0 0 100 100"><circle cx=50 cy=50 r=40 stroke="#A22" stroke-width="8" fill="#F44"/></svg>`;
    succeededSvg = `<svg width="20px" height="20px" viewBox="0 0 100 100"><circle cx=50 cy=50 r=40 stroke="#070" stroke-width="8" fill="#2A2"/></svg>`;

    constructor(id, parent, finalSuccessMessage, finalFailureMessage) {
        this.html = document.createElement("div");
        this.html.id = id;
        this.html.innerHTML = `<table><tbody></tbody></table>`;
        this.table = this.html.querySelector("table");
        this.table.style.fontSize = "16px";
        this.finalSuccessMessage = finalSuccessMessage || "All tasks met requirements.";
        this.finalFailureMessage = finalFailureMessage || "Some tasks failed to meet requirements";
        parent.appendChild(this.html);
        this.parent = parent;

        this.dashboard = document.createElement("div");
        this.dashboard.style = "position: fixed; right: 0; top: 0; border: 3px solid #444; padding: 10px; text-align: center; border-radius: 5px;";
        this.dashboard.innerHTML = `Task counts:<br/><table style="text-align: left;"><tbody>
        <tr><td>Unfinished:</td><td id="unfinished" style="color: #444; font-weight: bold;">0</td></tr>
        <tr><td>Succeeded:</td><td id="succeeded" style="color: #292; font-weight: bold;">0</td></tr>
        <tr><td>Failed:</td><td id="failed" style="color: #A00; font-weight: bold;">0</td><tr/></tbody></table>`;
        parent.appendChild(this.dashboard);
    }

    addTask(task) {
        this.taskList.push(task);
        const row = this.table.insertRow(this.table.rows.length);
        task.row = row;
        const cell1 = row.insertCell(0);
        cell1.innerHTML = `<div><span>${task.name}</span><br/><div class="resultSpan" style="font-style: italic; font-size: 12px; color: #666; margin-top: 5px"></div></div>`;
        const cell2 = row.insertCell(0);
        cell1.style.padding = "10px";
        cell2.style.padding = "10px";
        cell2.innerHTML = this.notStartedSvg;
        this.dashboard.querySelector("#unfinished").innerHTML = this.taskList.length;
    }

    succeedTask(result) {
        clearInterval(this.spinInterval);
        this.alpha = 0;
        if (!this.#isCurrentTaskValid()) return;
        const task = this.taskList[this.currentTaskIndex];
        if (result) {
            task.result = result;
            task.row.querySelector(`.resultSpan`).innerHTML = result;
        }
        task.isComplete = true;
        task.row.cells[0].innerHTML = this.succeededSvg;
        if (task.row.querySelector(`.prompt`)) task.row.querySelector(`.prompt`).style.display = "none";
        this.dashboard.querySelector("#unfinished").innerHTML = this.taskList.length - this.currentTaskIndex - 1;
        this.dashboard.querySelector("#succeeded").innerHTML = parseInt(this.dashboard.querySelector("#succeeded").innerHTML) + 1;
    }

    setPromptResult(result) {
        if (!this.#isCurrentTaskValid()) return;
        const task = this.taskList[this.currentTaskIndex];
        if (result) {
            task.result = result;
            task.row.querySelector(`.resultSpan`).innerHTML = `<div class="prompt" style="font-size: 14px; border: 6px solid #A94; border-radius: 10px; padding: 10px; background: #FFF0AA; box-shadow: 3px 3px 3px #888; width: 60%; color: #310">${result}</div>`;
            task.row.querySelector(`.resultSpan`).scrollIntoView();
        }
    }

    setMajorSuccessResult(result) {
        if (!this.#isCurrentTaskValid()) return;
        const task = this.taskList[this.currentTaskIndex];
        if (result) {
            task.result = result;
            task.row.querySelector(`.resultSpan`).innerHTML = `<div style="font-size: 14px; border: 6px solid #070; border-radius: 10px; padding: 10px; background: #2A2; box-shadow: 3px 3px 3px #888; width: 60%; color: #FFF">${result}</div>`;
        }
    }

    setMajorFailureResult(result) {
        if (!this.#isCurrentTaskValid()) return;
        const task = this.taskList[this.currentTaskIndex];
        if (result) {
            task.result = result;
            task.row.querySelector(`.resultSpan`).innerHTML = `<div style="font-size: 14px; border: 6px solid #700; border-radius: 10px; padding: 10px; background: #F33; box-shadow: 3px 3px 3px #888; width: 60%; color: #FFF">${result}</div>`;
        }
    }

    failTask(result) {
        clearInterval(this.spinInterval);
        if (!this.#isCurrentTaskValid()) return;
        const task = this.taskList[this.currentTaskIndex];
        if (result) {
            task.result = result;
            task.row.querySelector(`.resultSpan`).innerHTML = result;
            task.row.querySelector(`.resultSpan`).style.color = "#900";
        }
        task.isComplete = false;
        task.row.cells[0].innerHTML = this.failedSvg;
        this.dashboard.querySelector("#unfinished").innerHTML = this.taskList.length - this.currentTaskIndex - 1;
        this.dashboard.querySelector("#failed").innerHTML = parseInt(this.dashboard.querySelector("#failed").innerHTML) + 1;
    }

    setResult(result) {
        if (!this.#isCurrentTaskValid()) return;
        this.taskList[this.currentTaskIndex].result = result;
        this.taskList[this.currentTaskIndex].row.querySelector(`.resultSpan`).innerHTML = result;
    }

    advanceTask() {
        clearInterval(this.spinInterval);
        this.alpha = 0;
        if (!this.#canAdvance()) return;
        const currentTask = this.taskList[this.currentTaskIndex];
        this.currentTaskIndex++;
        if (this.currentTaskIndex >= this.taskList.length) {
            console.log(`Marking procedure as complete because the current index ${this.currentTaskIndex} exceeds the task list ${this.taskList.length}`);
            this.isComplete = true;
            // Show the final result message or a default
            const finalResultOuterDiv = document.createElement("div");
            this.html.appendChild(finalResultOuterDiv);
            if (parseInt(this.dashboard.querySelector("#failed").innerHTML) === 0) {
                finalResultOuterDiv.innerHTML = ProcedureTable.emptyFinalResultSuccessDiv;
                finalResultOuterDiv.querySelector(".finalResult").innerHTML = this.finalSuccessMessage;
            } else {
                finalResultOuterDiv.innerHTML = ProcedureTable.emptyFinalResultFailureDiv;
                finalResultOuterDiv.querySelector(".finalResult").innerHTML = this.finalFailureMessage;
            }
        } else {
            this.taskList[this.currentTaskIndex].row.cells[0].innerHTML = this.inProgressSvg;
            this.#setSpinInterval();
            if (!HtmlUtilities.isScrolledIntoView(this.taskList[this.currentTaskIndex].row)) this.taskList[this.currentTaskIndex].row.scrollIntoView();
        }
    }

    #setSpinInterval() {
        const svgToSpin = this.taskList[this.currentTaskIndex].row.cells[0].querySelector("svg");
        this.spinInterval = setInterval(() => {
            const balls = svgToSpin.querySelectorAll("circle");
            for (let i = 1; i < balls.length; i++) {
                balls[i].setAttribute("cx", 50 + 25 * i / (balls.length - 1) * Math.cos(this.alpha * i));
                balls[i].setAttribute("cy", 50 + 25 * i / (balls.length - 1) * Math.sin(this.alpha * i));
            }
            this.alpha += 0.05;
        }, 50);
    }

    #canAdvance() {
        if (this.isComplete) {
            console.warn("Cannot advance task because the procedure is complete. Call startProcedure() to restart the procedure.");
            return false;
        }
        return this.#isCurrentTaskValid();
    }

    #isCurrentTaskValid() {
        if (this.currentTaskIndex >= this.taskList.length) {
            this.isComplete = true;
            console.warn("Was in a bad state where the currentTaskIndex was greater than or equal to the list of tasks. Marking procedure as complete.");
            return false;
        }
        return true;
    }

    startProcedure() {
        this.currentTaskIndex = 0;
        this.isComplete = this.taskList.length === 0;
        for (let task of this.taskList) {
            task.result = null;
            task.isDone = false;
            task.row.querySelector(".resultSpan").innerHTML = "";
            task.row.querySelector(".resultSpan").style.color = "#666";
            task.row.cells[0].innerHTML = this.notStartedSvg;
        }
        if (this.taskList.length > 0) {
            this.taskList[0].row.cells[0].innerHTML = this.inProgressSvg;
            this.#setSpinInterval();
        }
        this.dashboard.querySelector("#unfinished").innerHTML = this.taskList.length;
        this.dashboard.querySelector("#succeeded").innerHTML = 0;
        this.dashboard.querySelector("#failed").innerHTML = 0;
        if (this.html.querySelector(".finalResult")) this.html.querySelector(".finalResult").remove();
    }
}

class HtmlUtilities {

    // https://stackoverflow.com/questions/487073/how-to-check-if-element-is-visible-after-scrolling
    static isScrolledIntoView(elem) {
        let docViewTop = document.body.scrollTop;
        let docViewBottom = docViewTop + window.innerHeight;

        let elemTop = elem.getBoundingClientRect().top;
        let elemBottom = elemTop + elem.offsetHeight;

        return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }
}

class IO {

    static async getValue(key) {
        try {
            return GM_getValue(key);
        } catch (e) {}
        try {
            return await GM.getValue(key);
        } catch (e) {
            console.error("Couldn't get key value using any GM_getValue derivative");
        }
    }

    static async setValue(key, value) {
        try {
            GM_setValue(key, value);
        } catch (e) {}
        try {
            await GM.setValue(key, value);
        } catch (e) {
            console.error("Couldn't set key value using any GM_setValue derivative");
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