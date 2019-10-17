const electron = require("electron");
const { app, BrowserWindow } = electron;
const { autoUpdater } = require("electron-updater");
const url = require("url");
const path = require("path");
var AutoLaunch = require("auto-launch");
const isDev = require("electron-is-dev");

const autoLauncher = new AutoLaunch({
    name: "Media Screen",
});

if (!isDev) {
    autoLauncher.enable();

    autoLauncher
        .isEnabled()
        .then(function(isEnabled) {
            if (isEnabled) {
                return;
            }
            autoLauncher.enable();
        })
        .catch(function(err) {
            // handle error
            console.error(err);
        });
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let secondWindow;
let allWindows = [];

function createWindow() {
    autoUpdater.checkForUpdatesAndNotify();
    var electronScreen = electron.screen;
    var displays = electronScreen.getAllDisplays();

    // Create the browser window.
    allWindows = displays.map(
        d =>
            new BrowserWindow({
                width: d.size.width,
                height: d.size.height,
                x: d.bounds.x,
                y: d.bounds.y,
                frame: false,
                kiosk: !isDev,
                webPreferences: {
                    webSecurity: false,
                    nodeIntegration: true,
                },
            }),
    );

    const startUrl =
        process.env.ELECTRON_START_URL ||
        url.format({
            pathname: path.join(__dirname, "/../build/index.html"),
            protocol: "file:",
            slashes: true,
        });

    allWindows.forEach(r => {
        r.maximize();
        r.show();
        r.loadURL(startUrl);
        r.on("closed", function() {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            let idx = allWindows.filter(x => x).findIndex(j => j.isDestroyed());
            if (idx === -1) {
                return;
            }
            allWindows[idx] = null;
        });
    });

    // and load the index.html of the app.

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function() {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

app.on("activate", function() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
