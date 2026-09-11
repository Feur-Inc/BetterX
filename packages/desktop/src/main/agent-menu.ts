import { type BrowserWindow, Menu, MenuItem, app, dialog } from "electron";
import { startBridge } from "../mcp/bridge.js";
import { connectionFile } from "../mcp/connection.js";
import { AgentController } from "./agent.js";

export function installAgentMenu(getWindow: () => BrowserWindow | null) {
  const controller = new AgentController(getWindow);
  let bridge: Awaited<ReturnType<typeof startBridge>> | null = null;
  let changing = false;
  const toggle = new MenuItem({
    label: "Enable read-only agent access",
    type: "checkbox",
    checked: false,
    click: () => {
      void changeAccess();
    },
  });
  async function changeAccess() {
    if (changing) return;
    changing = true;
    toggle.enabled = false;
    toggle.checked = !!bridge;
    try {
      if (bridge) {
        const previous = bridge;
        bridge = null;
        await previous.close();
        controller.clear();
      } else {
        const answer = await dialog.showMessageBox({
          type: "question",
          title: "BetterX agent access",
          message: "Allow local agents to read and browse X?",
          detail:
            "MCP clients running as your macOS/Linux user can read loaded bookmarks and posts, navigate this window, scroll, and search posts collected in memory. Requested content can be sent to the model configured in your MCP client.\n\nNo posting, messaging, cookie export, arbitrary scripts, or remote network listener. Access lasts until disabled or BetterX quits. Trust all local programs you run; this does not isolate agents from other programs running as you.",
          buttons: ["Cancel", "Enable for this session"],
          defaultId: 0,
          cancelId: 0,
        });
        if (answer.response === 1)
          bridge = await startBridge(connectionFile(), (command, signal) =>
            controller.execute(command, signal)
          );
      }
    } catch (error) {
      dialog.showErrorBox(
        "BetterX agent access",
        error instanceof Error ? error.message : "Could not change agent access"
      );
    } finally {
      toggle.checked = !!bridge;
      toggle.enabled = true;
      changing = false;
    }
  }
  const menu =
    Menu.getApplicationMenu() ??
    Menu.buildFromTemplate([
      { role: "fileMenu" },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]);
  const submenu = new Menu();
  submenu.append(toggle);
  submenu.append(
    new MenuItem({
      label: "Connection information",
      click: () => {
        void dialog.showMessageBox({
          title: "BetterX local MCP",
          message: bridge ? "Agent access is enabled" : "Agent access is disabled",
          detail: `Connection file: ${connectionFile()}\n\nThe MCP client uses stdio. Run the bundled dist/mcp/index.cjs with Node.js 20 or later. See the repository's docs/local-mcp.md for configuration. No private post data is saved to disk by the bridge.`,
        });
      },
    })
  );
  menu.append(new MenuItem({ label: "Agent", submenu }));
  Menu.setApplicationMenu(menu);
  app.on("before-quit", () => {
    controller.clear();
    void bridge?.close();
  });
}
