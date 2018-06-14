const electron = require('electron');

document.querySelectorAll('.primary-button').forEach((button) => {
    button.addEventListener('click', () => {
        const reason = button.value;
        electron.ipcRenderer.send('close-popup', reason);
        electron.remote.getCurrentWindow().close();
    });
});
