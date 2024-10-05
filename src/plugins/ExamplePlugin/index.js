import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "ExamplePlugin",
    description: "This is an example plugin for BetterX",
    authors: [Devs.Mopi],
    start() {
        console.log("ExamplePlugin started!");
    },
    stop() {
        console.log("ExamplePlugin stopped!");
    },
    settings: {
        someOption: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Some option for the plugin"
        }
    }
});