
import { ConfigUtil } from "../config_validation/ConfigUtil.js";

/**
 * This WebClient is intended exclusively for use inside of a Tampermonkey script
 * (it will rely on built in Tampermonkey functions like GM.xmlHttpRequest and will
 * therefore potentially fail if imported outside of a Tampermonkey script). This 
 * class enables a convenient interface for asynchronously or synchronously pulling
 * HTML via a GET request and includes convenience utilities like built in retries
 * in the event of throttling and automatic parsing of the returned HTML.
 */

class WebClient {

    static MAXIMAL_TEMPLATE = {
        isThrottledResponseChecker: (result) => { !/Too many calls per second/.test(result) },
        waitMillisBetweenThrottles: 1100,
        maxNumberOfAttempts: 3,
        returnParsedHtml: false
    }

    static MINIMAL_TEMPLATE = {
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

    static async loadUrlSync(url, configuration = {}) {
        ConfigUtil.validateConfiguration({minimalTemplate: WebClient.MINIMAL_TEMPLATE,
            maximalTemplate: WebClient.MAXIMAL_TEMPLATE,
            configToValidate: configuration});

        const maxNumberOfAttempts = configuration.maxNumberOfAttempts || WebClient.MAXIMAL_TEMPLATE.maxNumberOfAttempts;
        let result;
        for (let attemptNumber = 1; attemptNumber < maxNumberOfAttempts; attemptNumber++) {
            result = await WebClient.#loadUrlSyncHelper(url);
            let isThrottledResponseCheckerToUse = configuration.isThrottledResponseChecker || WebClient.MAXIMAL_TEMPLATE.isThrottledResponseChecker;
            if (isThrottledResponseCheckerToUse(result)) {
                console.warn(`Looks like we were throttled. ${attemptNumber < maxNumberOfAttempts - 1 ? "Will retry shortly." : "Ran out of retries."} Trying to load ${url}. Throttle response was ${result}`);
                break;
            }
            await WebClient.waitMs(configuration.waitMillisBetweenThrottles || WebClient.MAXIMAL_TEMPLATE.waitMillisBetweenThrottles);
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

export { WebClient }