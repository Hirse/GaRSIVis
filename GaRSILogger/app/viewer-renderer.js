const electron = require('electron');
const fs = require('fs');

let showGaze = false;
let highlightElements = false;
let showFixation = false;
let highlightFixatedElements = false;
let gazeServerHost;
let gazeServerPort;
let popupWaitTime;

let gazeTimeout;
let distractionDialogOpen = false;

electron.ipcRenderer.on('config-showGaze', (event, value) => {
    showGaze = value;
    document.querySelector('#gazeDot').style.display = (showGaze ? 'block' : 'none');
});

electron.ipcRenderer.on('config-highlightElements', (event, value) => {
    highlightElements = value;
});

electron.ipcRenderer.on('config-showFixation', (event, value) => {
    showFixation = value;
    document.querySelector('#fixationDot').style.display = (showFixation ? 'block' : 'none');
});

electron.ipcRenderer.on('config-highlightFixatedElements', (event, value) => {
    highlightFixatedElements = value;
});

electron.ipcRenderer.on('config-popupWaitTime', (event, value) => {
    popupWaitTime = value;
});

electron.ipcRenderer.on('config-gazeServerHost', (event, value) => {
    gazeServerHost = value;
    if (gazeServerHost && gazeServerPort) {
        startWebSocketConnections();
    }
});

electron.ipcRenderer.on('config-gazeServerPort', (event, value) => {
    gazeServerPort = value;
    if (gazeServerHost && gazeServerPort) {
        startWebSocketConnections();
    }
});

electron.ipcRenderer.send('config-request');

let isFileOpened = false;
let eventsRegistered = false;

electron.ipcRenderer.on('selected-file', function (event, path) {
    var data = new Uint8Array(fs.readFileSync(path));
    PDFViewerApplication.open(data).then(() => {
        isFileOpened = true;

        // Register events now because PDFViewerApplication might not be ready before
        if (!eventsRegistered) {
            const viewerContainer = document.querySelector('#viewerContainer');
            let scrollTimeout;
            let previousScroll = viewerContainer.scrollTop;
            viewerContainer.addEventListener('scroll', (event) => {
                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                }
                // Throttle scroll events to reduce number of log entries
                scrollTimeout = setTimeout(() => {
                    const currentScroll = event.target.scrollTop;
                    const maxScroll = event.target.scrollHeight;
                    const args = [
                        `${previousScroll}->${currentScroll}`,
                        `${(previousScroll / maxScroll * 100).toFixed(2)}%->${(currentScroll / maxScroll * 100).toFixed(2)}%`
                    ];
                    previousScroll = currentScroll;
                    electron.ipcRenderer.send('log-event', 'SCROLL', args);
                    logPDFBoundingRectEvent();
                    scrollTimeout = null;
                }, 100);
            });

            // "renderer-zoom" is a custom event only used for the electron renderer
            PDFViewerApplication.eventBus.on('renderer-zoom', (previous, current) => {
                electron.ipcRenderer.send('log-event', 'ZOOM', [`${previous}->${current}`]);
                logPDFBoundingRectEvent();
            });

            window.addEventListener('resize', logPDFBoundingRectEvent);
            eventsRegistered = true;
        }
        electron.remote.getCurrentWindow().setProgressBar(1, { mode: 'none' });
    });
});

electron.ipcRenderer.on('close-file', function () {
    PDFViewerApplication.close();
    isFileOpened = false;
});

electron.ipcRenderer.on('close-popup', function () {
    distractionDialogOpen = false;
});

/**
 * Message Event
 * @typedef {"GAZE" | "FIXATIONSTART" | "FIXATIONDATA" | "FIXATIONEND"} MessageEvent
 */

/**
 * Handler for incoming messages.
 * @param {MessageEvent} type Type of the message
 * @param {string} coordinates Coordinates of the eye gaze as '<X>,<Y>'
 */
function onMessage(type, coordinates) {
    // Clear distraction timeout on any gaze
    clearTimeout(gazeTimeout);

    // Ignore Gaze Events when there is no PDF opened
    if (!isFileOpened) {
        return;
    }

    // Ignore Gaze Events while the user is being asked for distraction reasons
    if (distractionDialogOpen) {
        return;
    }

    // Ignore details of Gaze Events when the window is hidden, but record that a Gaze happened
    // See https://github.com/electron/electron/blob/master/docs/api/browser-window.md#page-visibility
    if (document.hidden) {
        electron.ipcRenderer.send('log-event', type, '[hidden]');
        return;
    }

    const currentWindow = electron.remote.getCurrentWindow();
    const contentBounds = currentWindow.getContentBounds();
    const eyeGazeCoords = coordinates.split(',');

    eyeGazeCoords[0] = parseFloat(eyeGazeCoords[0]) - contentBounds.x;
    eyeGazeCoords[1] = parseFloat(eyeGazeCoords[1]) - contentBounds.y;

    // Show a dot for the current gaze if setting is on (default off)
    if (type === 'GAZE' && showGaze) {
        const dot = document.querySelector('#gazeDot');
        dot.style.left = `${eyeGazeCoords[0]}px`;
        dot.style.top = `${eyeGazeCoords[1]}px`;
    }

    // Show a dot for the current fixation if setting is on (default off)
    if (showFixation) {
        const dot = document.querySelector('#fixationDot');
        switch (type) {
            // On fixation start and data, show and move the dot
            case 'FIXATIONSTART':
            case 'FIXATIONDATA':
                dot.style.display = 'block';
                dot.style.left = `${eyeGazeCoords[0]}px`;
                dot.style.top = `${eyeGazeCoords[1]}px`;
                break;
            // On fixation end, hide the dot
            case 'FIXATIONEND':
                dot.style.display = 'none';
                break;
        }
    }

    const element = document.elementFromPoint(eyeGazeCoords[0], eyeGazeCoords[1]);
    if (element) {
        let content;
        if (element.classList.contains('textLayer')) {
            content = '[textLayer]';
        } else if (element.parentElement && element.parentElement.classList.contains('textLayer')) {
            content = element.textContent;

            // Highlight the latest read element if setting is on (default off)
            if (type === 'GAZE' && highlightElements) {
                element.style.transition = null;
                element.style.background = '#00feff';
                if (element.timeout) {
                    clearTimeout(element.timeout);
                }
                element.timeout = setTimeout(() => {
                    element.style.transition = 'background 1s linear';
                    element.style.background = null;
                    element.timeout = null;
                }, 500);
            }

            // Highlight the latest fixated element if setting is on (default off)
            if ((type === 'FIXATIONSTART' || type === 'FIXATIONDATA') && highlightFixatedElements) {
                element.style.transition = null;
                element.style['box-shadow'] = '0 0 3px 3px #ff1ad9';
                if (element.timeout) {
                    clearTimeout(element.timeout);
                }
                element.timeout = setTimeout(() => {
                    element.style.transition = 'box-shadow 1s linear';
                    element.style['box-shadow'] = null;
                    element.timeout = null;
                }, 500);
            }
        }
        if (content) {
            const clientRect = element.getBoundingClientRect();
            const px = (eyeGazeCoords[0] - clientRect.left) / clientRect.width * 100;
            const py = (eyeGazeCoords[1] - clientRect.top) / clientRect.height * 100;
            electron.ipcRenderer.send('log-event', type, [`${eyeGazeCoords[0].toFixed(2)},${eyeGazeCoords[1].toFixed(2)}`, `${px.toFixed(2)}%,${py.toFixed(2)}%`, content]);
        }
    }

    gazeTimeout = setTimeout(() => {
        distractionDialogOpen = true;
        electron.ipcRenderer.send('popup');
    }, 1000 * popupWaitTime);
}

function startWebSocketConnections() {

    // Showing connection status
    function onConnecting() {
        document.querySelector('#connectionStatus').className = 'progress';
        document.querySelector('#connectionStatus span').innerHTML = `Connecting to GazeServer at ${gazeServerHost}:${gazeServerPort}`;
    }

    function onConnected() {
        document.querySelector('#connectionStatus').className = 'success';
        document.querySelector('#connectionStatus span').innerHTML = `Connected to GazeServer at ${gazeServerHost}:${gazeServerPort}`;
    }

    function onDisconnected() {
        document.querySelector('#connectionStatus').className = 'error';
        document.querySelector('#connectionStatus span').innerHTML = `Disconnected from GazeServer at ${gazeServerHost}:${gazeServerPort}`;
    }

    onConnecting();
    const gazeWebSocket = new WebSocket(`ws://${gazeServerHost}:${gazeServerPort}/gaze`);
    gazeWebSocket.onmessage = (event) => {
        onMessage('GAZE', event.data);
    };
    gazeWebSocket.onopen = onConnected;
    gazeWebSocket.onclose = onDisconnected;

    const fixationWebSocket = new WebSocket(`ws://${gazeServerHost}:${gazeServerPort}/fixation`);
    fixationWebSocket.onmessage = (event) => {
        const [kind, coords] = event.data.split(': ');
        const typeMap = {
            FS: 'FIXATIONSTART',
            FD: 'FIXATIONDATA',
            FE: 'FIXATIONEND',
        };
        onMessage(typeMap[kind], coords);
    };
    fixationWebSocket.onopen = onConnected;
    fixationWebSocket.onclose = onDisconnected;

    const headPoseWebSocket = new WebSocket(`ws://${gazeServerHost}:${gazeServerPort}/head`);
    headPoseWebSocket.onmessage = (event) => {
        // Ignore head pose data when no file is open, the user is being asked for the distraction reason or the window is hidden
        if (!isFileOpened || distractionDialogOpen || document.hidden) {
            return;
        }
        // Ignore invalid head pose data
        if (event.data === '0.00,0.00,0.00;NaN,NaN,NaN') {
            return;
        }
        electron.ipcRenderer.send('log-event', 'HEAD', event.data);
    };
    headPoseWebSocket.onopen = onConnected;
    headPoseWebSocket.onclose = onDisconnected;
}

function logPDFBoundingRectEvent() {
    const rectData = getPDFBoundingRectData();
    if (rectData) {
        electron.ipcRenderer.send('log-event', 'PDF', rectData);
    }
}

/**
 * Get the pdf element bounding rect event data, relative to the app window content bound.
 * If pdf elements cannot be found, return null.
 * @return {[number, number, number, number, number, number] | null} Bounding rect as list or null
 */
function getPDFBoundingRectData() {
    const rect = getPDFBoundingRect();
    if (!rect) {
        return null;
    }
    return [rect.left, rect.right, rect.top, rect.bottom, rect.width, rect.height];
}

/**
 * @typedef {object} BoundingRect Offset and size of all pdf pages.
 * @property {number} top Offset to top
 * @property {number} right Offset to right
 * @property {number} bottom Offset to bottom
 * @property {number} left Offset to left
 * @property {number} width Width of the pdf
 * @property {number} height Height of the pdf
 */

/**
 * Get the pdf element bounding rect, relative to the app window content bound.
 * If pdf elements cannot be found, return null.
 * @return {BoundingRect | null} Bounding rect or null
 */
function getPDFBoundingRect() {
    const rect = {
        top: -1,
        right: -1,
        bottom: -1,
        left: -1,
        width: -1,
        height: -1
    };

    const pdfPages = document.querySelectorAll('.pdfViewer > .page');
    if (pdfPages.length == 0) {
        return null;
    }

    const firstPageRect = pdfPages[0].getBoundingClientRect();
    const lastPageRect = pdfPages[pdfPages.length - 1].getBoundingClientRect();

    rect.top = firstPageRect.top;
    rect.right = firstPageRect.right;
    rect.bottom = lastPageRect.bottom;
    rect.left = firstPageRect.left;
    rect.width = rect.right - rect.left;
    rect.height = rect.bottom - rect.top;

    return rect;
}

