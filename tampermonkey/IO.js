
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

export { IO }