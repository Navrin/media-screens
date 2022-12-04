const electron = require("electron");
const { app, BrowserWindow, ipcMain, screen, Menu, MenuItem, session } =
    electron;
// const { BrowserWindow } = require("@electron/remote");
const { autoUpdater } = require("electron-updater");
const url = require("url");
const path = require("path");
var AutoLaunch = require("auto-launch");
const isDev = require("electron-is-dev");
const { localStorage } = require("electron-browser-storage");
const { promises: pfs } = require("fs");

// require("@electron/remote/main").initialize();
const autoLauncher = new AutoLaunch({
    name: "MediaScreen",
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let allWindows = [];

if (!isDev) {
    autoLauncher.enable();

    autoLauncher
        .isEnabled()
        .then(function (isEnabled) {
            if (isEnabled) {
                return;
            }
            autoLauncher.enable();
        })
        .catch(function (err) {
            // handle error
            console.error(err);
        });
}

// add a small menu for debug purposes
const menu = Menu();
menu.append(
    new MenuItem({
        label: "Util",
        submenu: [
            {
                label: "Reset cache",
                accelerator: "CommandOrControl+G",
                click: async (ev, fWindow, fWebContents) => {
                    session.defaultSession.clearStorageData();
                    session.defaultSession.clearCache();
                    fWindow.console.debug("Clearing cache");
                    await localStorage.clear();
                },
            },
            {
                label: "Delete image cache",
                accelerator: "CommandOrControl+Shift+G",
                click: async () => {
                    const write = await this.getWritePath();
                    const cachedFiles = await pfs.readdir(write);
                    await pfs.rm(cachedFiles);
                },
            },
            {
                role: "toggleDevTools",
                accelerator: "CommandOrControl+Shift+C",
                // click: () => {allWindows[0].webContents.openDevTools()},
            },
            {
                label: "Check for updates",
                click: () => {
                    autoUpdater.checkForUpdatesAndNotify();
                },
            },
        ],
    }),
);

menu.append(
    new MenuItem({
        role: "appMenu",
    }),
);

Menu.setApplicationMenu(menu);

function createWindows() {
    if (isDev) {
        const {
            default: installExtension,
            REACT_DEVELOPER_TOOLS,
        } = require("electron-devtools-installer");
        installExtension(REACT_DEVELOPER_TOOLS)
            .then(console.log)
            .catch(console.error);
    }

    autoUpdater.checkForUpdatesAndNotify();
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 200000);

    let electronScreen = electron.screen;
    let displays = electronScreen.getAllDisplays();

    // Create the browser window.
    allWindows = displays.map(
        (d) =>
            new BrowserWindow({
                width: d.size.width,
                height: d.size.height,
                x: d.bounds.x,
                y: d.bounds.y,
                frame: false,
                kiosk: !isDev,
                webPreferences: {
                    webSecurity: false,
                    contextIsolation: false,
                    nodeIntegration: true,
                },
            }),
    );
    allWindows.forEach((e) => e.webContents.setFrameRate(60));

    const startUrl =
        process.env.ELECTRON_START_URL ||
        url.format({
            pathname: path.join(__dirname, "/../build/index.html"),
            protocol: "file:",
            slashes: true,
        });

    allWindows.forEach((r) => {
        // require("@electron/remote/main").enable(r.webContents)
        r.loadURL(startUrl);
        r.on("ready-to-show", () => {
            r.maximize();
            r.show();
        });
        r.on("closed", function () {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            let idx = allWindows
                .filter((x) => x)
                .findIndex((j) => j.isDestroyed());
            if (idx === -1) {
                return;
            }
            allWindows[idx] = null;
        });
    });

    // and load the index.html of the app.

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()
    // if (isDev) {
    //     const path = require("path");
    //     const os = require("os");

    //     BrowserWindow.addDevToolsExtension(
    //         path.normalize(
    //             String.raw`/Users/navrin/Library/Application\ Support/Google/Chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/4.2.0_0/`,
    //         ),
    //     );
    // }

    // Emitted when the window is closed.
}

ipcMain.handle("get-appdata", async () => {
    return app.getPath("appData");
});

ipcMain.handle("get-screen-id", (event, bounds) => {
    return screen.getDisplayNearestPoint(bounds).id;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", bootstrapWindowCreation);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

app.on("activate", bootstrapWindowCreation);

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

process.on("uncaughtException", function (err) {
    console.log(err);
});

function bootstrapWindowCreation() {
    // prevent multiple instances of the media screens running at the same time.
    // we want one single instance that will orchestrate the multiple windows
    const lockState = app.requestSingleInstanceLock();
    if (!lockState) {
        app.quit();
    } else if (allWindows.length <= 0) {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        createWindows();
    }
}
