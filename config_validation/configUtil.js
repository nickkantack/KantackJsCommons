/**
 * This class helps in writing more readable Javascript by allowing methods of other classes
 * to be called with an object that carries all input arguments as values of key value pairs.
 * This provides the opportunity to explicitly name every argument passed to the method.
 * Furthermore, this class supports (and indeed requires) some amount of input validation that
 * occurs through the help of a "maximalTemplate" and a "minimalTemplate". The maximalTemplate
 * has keys which are the set of all allowed arguments for the function (i.e. an input object
 * is not allowed to have keys that are not also keys in the maximalTemplate). The 
 * maximalTemplate also has values which are defaults in case the passed in object doesn't
 * specify a value for any key. The minimalTemplate has a set of keys which each must be
 * present in the passed in argument. If any of these requirements are not met, a descriptive
 * error is thrown.
 */
class ConfigUtil {

    static validateConfiguration(args) {
        if (!args.maximalTemplate && !args.minimalTemplate) {
            throw new Error(`validateConfiguration must be given an input object that has either a maximalTemplate property or a minimalTemplate property. However, the input object had neither.`)
        }
        if (!args.configToValidate) {
            throw new Error(`validateConfiguration must be given an input object that has a configToValidate property. However, the input argument had no such property.`)
        }

        for (let key of Object.keys(args.configToValidate)) {
            if (!args.maximalTemplate.hasOwnProperty(key)) {
                throw new Error(`Passed in config has unrecognized property ${key}`);
            }
        }

        // TODO add detection for when the minimal template contains keys not in the maximal template

        if (args.minimalTemplate) {
            for (let key of Object.keys(args.minimalTemplate)) {
                if (!args.configToValidate.hasOwnProperty(key)) {
                    throw new Error(`Passed in config is missing required ${key} key`);
                }
            }
        }

        // Copy over defaults from maximal template
        for (let key of Object.keys(args.maximalTemplate)) {
            if (!args.configToValidate.hasOwnProperty(key)) {
                args.configToValidate[key] = args.maximalTemplate[key];
            }
        }
        return args.configToValidate;
    }

}

class Shuffler {
    
    static getRandomIndicesListForLength(length) {
        let unshuffledIndices = [];
        for (let i = 0; i < length; i++) {
            unshuffledIndices.push(i);
        }
        let shuffledIndices = [];
        while (unshuffledIndices.length > 0) {
            const randomIndex = parseInt(Math.random() * unshuffledIndices.length);
            shuffledIndices.push(unshuffledIndices[randomIndex]);
            unshuffledIndices.splice(randomIndex, 1);
        }
        return shuffledIndices;
    }
    
}

export { ConfigUtil, Shuffler }