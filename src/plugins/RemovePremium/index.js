import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "RemovePremium",
    description: "Removes all X Premium branding and advertisement",
    authors: [Devs.Mopi],
    start() {
        removePremium();
    },
    stop() {
    },
    settings: {
        someOption: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Some option for the plugin"
        }
    }
});

class ElementRemover {
    removeElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.remove();
        } else {
            console.warn(`Element with selector "${selector}" not found.`);
        }
    }
}

function removePremium() {
    const remover = new ElementRemover();
    remover.removeElement("#r-6koalj");
}