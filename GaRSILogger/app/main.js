const childProcess = require('child_process');
const electron = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');
const {autoUpdater} = require("electron-updater");

const ActiveWinEmitter = require('./active-win');
const Config = require('./config');

let config;

const SESSION_FOLDER = path.join(electron.app.getPath('userData'), 'sessions');
const EVENTS = {
    FOCUS: 'FOCUS',
    BLUR: 'BLUR',
    OPEN: 'OPEN',
    CLOSE: 'CLOSE',
    ACTIVE: 'ACTIVE',
    REASON: 'REASON'
};

// Check for active window change events and record the active app and window title
const activeWinEmitter = new ActiveWinEmitter();
activeWinEmitter.on('change', (win) => {
    logEvent(EVENTS.ACTIVE, [win.app, win.title]);
});

// On Windows, start the GazeServer
if (process.platform === 'win32') {
    const execFilePath = path.join(__dirname, '../GazeServer', 'GazeServer.exe');
    childProcess.execFile(execFilePath, (error) => {
        electron.dialog.showErrorBox('Error starting the GazeServer', error.message);
    });
}

/**
 * Shows the Open File dialog and sends the selected file to the renderer process.
 */
function selectFile() {
    electron.dialog.showOpenDialog({
        filters: [
            { name: 'PDF', extensions: ['pdf'] }
        ],
        properties: ['openFile']
    }, (filePaths) => {
        if (filePaths) {
            const filePath = filePaths[0];
            openFile(filePath);
        }
    });
}

/**
 * Notifies the renderer to open the file.
 * @param {string} filePath Local, absolute path to a PDF file.
 */
function openFile(filePath) {
    mainWindow.setProgressBar(0, { mode: 'indeterminate' });
    mainWindow.webContents.send('selected-file', filePath);
    logEvent(EVENTS.OPEN, [filePath]);
}

/**
 * Close the currently opened PDF file.
 */
function closeFile() {
    mainWindow.webContents.send('close-file');
    logEvent(EVENTS.CLOSE);
}

/**
 * Show a modal window to ask for the reason for the absence.
 */
function showPopup() {
    const child = new electron.BrowserWindow({
        frame: false,
        height: 450,
        modal: true,
        parent: mainWindow,
        show: false,
        width: 550
    });
    child.loadURL(url.format({
        pathname: path.join(__dirname, 'dialog', 'dialog.html'),
        protocol: 'file:',
        slashes: true
    }));
    child.once('ready-to-show', () => {
        child.show();
    });
}

/**
 * Generate a function that sets a boolean config to the checked state of a menu item.
 * @param {string} property The config property to be changed.
 * @returns {function} The toggler function to be called with the menuitem.
 */
function getConfigToggler(property) {
    return (menuItem) => {
        config.set(property, menuItem.checked);
    };
}

/**
 * Generate a function that sets config to the predefined value.
 * @param {string} property The config property to be changed.
 * @param {string} value The config value to be set.
 * @returns {function} The set function to be called with the menuitem.
 */
function setConfig(property, value) {
    return () => {
        config.set(property, value);
    };
}

/**
 * Open the folder of the recorded sessions in the file manager.
 */
function openResultFolder() {
    electron.shell.showItemInFolder(SESSION_FOLDER);
}

let writeStreamPromise;
/**
 * Get a Promise that will resolve to the Log WriteStream.
 * Consecutive calls to this function will return the same Promise.
 * @returns {Promise<WriteStream>} The WriteStream Promise.
 */
function getWriteStreamPromise() {
    if (!writeStreamPromise) {
        writeStreamPromise = new Promise((resolve) => {
            // Create a directory for the recorded sessions if it does not exist
            if (!fs.existsSync(SESSION_FOLDER)) {
                fs.mkdirSync(SESSION_FOLDER);
            }
            const timestamp = new Date().toISOString().replace(/:/g, '');
            const fileName = `session_${timestamp}.txt`;
            const filePath = path.join(SESSION_FOLDER, fileName);
            const writeStream = fs.createWriteStream(filePath);
            writeStream.on('open', () => {
                resolve(writeStream);
            });
        });
    }
    return writeStreamPromise;
}

/**
 * Log an Event in the log file.
 * The actual writing of the file might happen later.
 * @param {string} eventType Event Type, should be short.
 * @param {string|string[]} args List of event args included in the log.
 */
function logEvent(eventType, args = []) {
    if (!Array.isArray(args)) {
        args = [args];
    }
    getWriteStreamPromise().then((writeStream) => {
        const timestamp = new Date().toISOString();
        writeStream.write(`${[timestamp, eventType.toUpperCase(), args.join(';')].join('|')}\n`);
    });
}

// Listener to allow the renderer process to request logging.
electron.ipcMain.on('log-event', (event, message, args) => {
    logEvent(message, args);
});

// Open the popup when requested from the renderer.
electron.ipcMain.on('popup', () => {
    showPopup();
});

// Listen to the closing of the popup to log the selected reason.
// Send event to the main window renderer to continue tracking.
electron.ipcMain.on('close-popup', (event, reason) => {
    logEvent(EVENTS.REASON, [reason]);
    mainWindow.webContents.send('close-popup');
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    config = Config.getInstance();

    // Create the browser window.
    mainWindow = new electron.BrowserWindow({
        icon: path.join(__dirname, '../', 'build', 'icon.ico')
    });

    // Maximize the window.
    // TODO consider restoring previous state
    mainWindow.maximize();

    let viewerHtml;
    if (process.env.DEV) {
        viewerHtml = path.join(__dirname, '../', 'pdf.js', 'web', `viewer.html`);
    } else {
        viewerHtml = path.join(__dirname, 'pdf.js', 'web', `viewer.html`);
    }

    // and load the viewer.html
    mainWindow.loadURL(url.format({
        pathname: viewerHtml,
        protocol: 'file:',
        slashes: true
    }));

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    // Emitted when the window is focused.
    // Stop tracking the active window as it is redundant now.
    mainWindow.on('focus', () => {
        logEvent(EVENTS.FOCUS);
        activeWinEmitter.stop();
    });

    // Emitted when the window is blurred.
    // Start tracking the active window.
    mainWindow.on('blur', () => {
        logEvent(EVENTS.BLUR);
        activeWinEmitter.start();
    });

    // On dropping a file in the window, open it if it is pdf
    mainWindow.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
        if (url.startsWith('file://') && url.endsWith('.pdf')) {
            // Change file-url to absolute path
            let filePath = decodeURI(url).replace('file:///', '');
            if (process.platform === 'darwin') {
                filePath = '/' + filePath;
            }
            openFile(filePath);
        }
    });

    // Template for the Menu of the window.
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open File…',
                    accelerator: 'CommandOrControl+O',
                    click: selectFile
                },
                {
                    label: 'Close File',
                    accelerator: 'CommandOrControl+W',
                    click: closeFile
                },
                { role: 'quit' }
            ]
        }, {
            label: 'Edit',
            submenu: [
                { role: 'cut' },
                { role: 'copy' },
                { role: 'selectall' }
            ]
        }, {
            label: 'Gaze',
            submenu: [
                {
                    label: 'Show Gaze',
                    type: 'checkbox',
                    checked: config.get('showGaze'),
                    click: getConfigToggler('showGaze')
                },
                {
                    label: 'Highlight Read Elements',
                    type: 'checkbox',
                    checked: config.get('highlightElements'),
                    click: getConfigToggler('highlightElements')
                },
                { type: 'separator' },
                {
                    label: 'Show Fixation',
                    type: 'checkbox',
                    checked: config.get('showFixation'),
                    click: getConfigToggler('showFixation')
                },
                {
                    label: 'Highlight Fixated Elements',
                    type: 'checkbox',
                    checked: config.get('highlightFixatedElements'),
                    click: getConfigToggler('highlightFixatedElements')
                },
                { type: 'separator' },
                {
                    label: 'Open result folder',
                    click: openResultFolder
                }
            ]
        }, {
            label: 'Popup Wait Time',
            submenu: [
                {
                    label: '10s',
                    type: 'radio',
                    checked: config.get('popupWaitTime') == 10,
                    click: setConfig('popupWaitTime', 10)
                }, {
                    label: '20s',
                    type: 'radio',
                    checked: config.get('popupWaitTime') == 20,
                    click: setConfig('popupWaitTime', 20)
                }, {
                    label: '30s',
                    type: 'radio',
                    checked: config.get('popupWaitTime') == 30,
                    click: setConfig('popupWaitTime', 30)
                }, {
                    label: '40s',
                    type: 'radio',
                    checked: config.get('popupWaitTime') == 40,
                    click: setConfig('popupWaitTime', 40)
                }, {
                    label: '50s',
                    type: 'radio',
                    checked: config.get('popupWaitTime') == 50,
                    click: setConfig('popupWaitTime', 50)
                }, {
                    label: '60s',
                    type: 'radio',
                    checked: config.get('popupWaitTime') == 60,
                    click: setConfig('popupWaitTime', 60)
                }
            ]
        }, {
            label: 'Debug',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
            ]
        }, {
            role: 'window',
            submenu: [
                { role: 'minimize' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(template));

    // On Windows, check the arguments for a filepath
    if (process.platform === 'win32') {
        const filepath = process.argv.find((arg) => {
            return arg.endsWith('.pdf');
        });
        if (filepath) {
            openFile(filepath);
        }
    }
}

const isSecondInstance = electron.app.makeSingleInstance((commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();

        // On Windows, check the arguments for a filepath
        if (process.platform === 'win32') {
            const filepath = commandLine.find((arg) => {
                return arg.endsWith('.pdf');
            });
            if (filepath) {
                openFile(filepath);
            }
        }
    }
});

// If this is a second instance, we can quit as it is handled by the primary instance
if (isSecondInstance) {
    electron.app.quit();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron.app.on('ready', createWindow);

// Quit when all windows are closed.
electron.app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        electron.app.quit();
    }
});

electron.app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// On macOS emitted when the user wants to open a file with the application.
electron.app.on('open-file', (event, filepath) => {
    event.preventDefault();
    if (filepath.endsWith('.pdf')) {
        openFile(filepath);
    }
});

electron.app.on('quit', () => {
    logEvent(EVENTS.CLOSE);
    config.writeConfigToFile();
    if (writeStreamPromise) {
        writeStreamPromise.then((writeStream) => {
            writeStream.close();
            writeStreamPromise = null;
        });
    }
});


// Auto Updater
electron.app.on('ready', function() {
    autoUpdater.checkForUpdatesAndNotify();
});
