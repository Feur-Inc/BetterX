import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "AnotherPlugin",
    description: "This is another plugin for BetterX",
    authors: [Devs.Mopi],
    start() {
        console.log("AnotherPlugin started!");
    },
    stop() {
        console.log("AnotherPlugin stopped!");
    },
    settings: {
        someOption: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Some option for the plugin"
        }
    }
});