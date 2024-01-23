
import { ConfigUtil } from "../config_validation/configUtil.js";

class Database {

    static MAXIMAL_TEMPLATE = {
        databaseName: null,
        objectStoreName: null
    };

    static MINIMAL_TEMPLATE = {
        databaseName: null,
        objectStoreName: null
    }

    #config;

    #database;
    #isLoadedPromise;

    constructor(args) {
        ConfigUtil.validateConfiguration({
            maximalTemplate: Database.MAXIMAL_TEMPLATE,
            minimalTemplate: Database.MINIMAL_TEMPLATE,
            configToValidate: args   
        });
        this.#config = args;

        let isLoadedPromiseResolver;
        this.#isLoadedPromise = new Promise((resolve, reject) => {
            isLoadedPromiseResolver = resolve;
        });

        console.log(`Making database open request`);
        const databaseOpenRequest = indexedDB.open(this.#config.databaseName);
        databaseOpenRequest.onerror = (error) => {
            console.error(`Problem opening database with name ${this.#config.databaseName}: ${error}`);
        };
        databaseOpenRequest.onsuccess = (event) => {
            this.#database = event.target.result;
            console.log(`Successfully opened database with name ${this.#config.databaseName}`);
            isLoadedPromiseResolver();
        };
        databaseOpenRequest.onupgradeneeded = (event) => {
            this.#database = event.target.result;
            console.log(`onupgradeneeded called. Rebuilding a new database.`);
            
            // Create the object store from scratch
            const objectStore = this.#database.createObjectStore(this.#config.objectStoreName);

            // Here you can use objectStore.add(value, key) if you have anything to put in it
            // at the time of creation. If you don't, you'll need to create a transation object
            // fresh when you later want to write or reach from the objectStore.
        };
    }

    async waitForDatabaseToLoad() {
        await this.#isLoadedPromise;
    }

    write(args) {
        if (!args.hasOwnProperty(`key`)) throw new Error(`Database.write called using an argument object that did not have a "key" property.`);
        if (!args.hasOwnProperty(`value`)) throw new Error(`Database.write called using an argument object that did not have a "value" property.`);
        const request = this.#database.transaction([this.#config.objectStoreName], "readwrite")
            .objectStore(this.#config.objectStoreName)
            .put(args.value, args.key);
        request.onerror = (event) => {
            console.error(`Error calling Database.write()`);
            console.error(event);
        };
        request.onsuccess = (event) => {
            console.log(`Successfully wrote value to database with key ${args.key}. Remove this log line soon.`);
        };
    }

    async read(key) {
        return await new Promise((resolve, reject) => {
            const request = this.#database.transaction([this.#config.objectStoreName], "readonly")
                .objectStore(this.#config.objectStoreName)
                .get(key);
            request.onerror = (event) => {
                console.error(`Failed to read key ${key}`);
                reject(event);
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            }
        });
    }

    async hasKey(key) {
        return await new Promise((resolve, reject) => {
            const request = this.#database.transaction([this.#config.objectStoreName], "readonly")
                .objectStore(this.#config.objectStoreName)
                .openCursor(key);
            request.onerror = (event) => {
                console.error(`Failed to check for key ${key}`);
                reject(event);
            };
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                resolve(cursor ? true : false);
            }
        });
    }

    async delete(key) {
        return await new Promise((resolve, reject) => {
            const request = this.#database.transaction([this.#config.objectStoreName], "readwrite")
                .objectStore(this.#config.objectStoreName)
                .delete(key);
            request.onerror = (event) => {
                console.error(`Error calling Database.delete(): ${event}`);
                reject(event);
            };
            request.onsuccess = (event) => {
                resolve();
                console.log(`Successfully deleted entry with key ${key}. Remove this log line soon.`);
            };
        });
    }

    async test() {

        console.log(`Running database test`);

        const database = new Database({ databaseName: "turtleDatabase", objectStoreName: "turtleStoreName" });

        // Wait a little bit
        await new Promise((resolve, reject) => { setTimeout(resolve, 1000); });

        console.log(`Does the database have key turtleKey? The answer is ${await database.hasKey("turtleKey")}`);

        database.write({ key: "turtleKey", value: "turtleValue" });
        
        // Wait a little bit
        await new Promise((resolve, reject) => { setTimeout(resolve, 250); });

        console.log(`Does the database have key turtleKey? The answer is ${await database.hasKey("turtleKey")}`);

        console.log(`Read this from the database:`);
        console.log(await database.read("turtleKey"));

        database.delete("turtleKey");

        // Wait a little bit
        await new Promise((resolve, reject) => { setTimeout(resolve, 250); });

        console.log(`Does the database have key turtleKey? The answer is ${await database.hasKey("turtleKey")}`);

        console.log(`Done with the database test`);

    }

}

export { Database }