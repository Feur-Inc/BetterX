async function loadPlugins() {
    const pluginContext = require.context('./plugins', true, /index\.(js|ts)$/);
    const plugins = [];

    for (const key of pluginContext.keys()) {
        const plugin = await pluginContext(key);
        if (plugin.default && typeof plugin.default === 'object') {
            plugins.push(plugin.default);
        }
    }

    return plugins;
}

async function initializeBetterX() {
    const plugins = await loadPlugins();

    // Initialize and apply plugins
    plugins.forEach(plugin => {
        if (typeof plugin.start === 'function') {
            plugin.start();
        }
        // Apply patches, if any
        if (Array.isArray(plugin.patches)) {
            applyPatches(plugin.patches);
        }
    });

    function applyPatches(patches) {
        console.log("Applying patches:", patches);
    }

    window.BetterX = {
        plugins: plugins
    };

    console.log("BetterX loaded with plugins:", plugins.map(p => p.name));
}

initializeBetterX();