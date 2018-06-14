const electron = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Configuration Singleton.
 * Handles reading and writing to file.
 */
class Config {

    /**
     * Create a Config Object.
     * Reads the config from the file.
     * Initializes the config file if it does not exist.
     */
    constructor() {
        this.CONFIG_FILE_NAME = 'settings.json';
        this.DEFAULT_CONFIG = {
            showGaze: false,
            highlightElements: false,
            showFixation: false,
            highlightFixatedElements: false,
            popupWaitTime: 10, // 10 second
            gazeServerHost: 'localhost',
            gazeServerPort: 8887
        };

        const userDataPath = electron.app.getPath('userData');
        this.configFilePath = path.join(userDataPath, this.CONFIG_FILE_NAME);
        this.assertConfig();
        this.handlers = {};
        Object.keys(this.DEFAULT_CONFIG).forEach((property) => {
            this.handlers[property] = [];
        });

        // On config request send all current values
        electron.ipcMain.on('config-request', (event) => {
            Object.keys(this.DEFAULT_CONFIG).forEach((property) => {
                event.sender.send(`config-${property}`, this.config[property]);
            });
        });
    }

    /**
     * Get the current value of a configuration property.
     * That value is not necessarily in the file yet.
     * @param {string} property Configuration property.
     */
    get(property) {
        return this.config[property];
    }

    /**
     * Set the value of a property.
     * Setting a value does not write it to the file.
     * This also notifies all event listeners and send an event to all Webcontents.
     * @param {string} property Configuration property.
     * @param {any} value Configuration property value.
     */
    set(property, value) {
        this.config[property] = value;
        this.handlers[property].forEach((handler) => {
            handler(value);
        });
        const webContents = electron.webContents.getAllWebContents();
        webContents.forEach((webContent) => {
            webContent.send(`config-${property}`, this.config[property]);
        });
    }

    /**
     * Register an event listener for a configuration property.
     * @param {string} property Configuration property.
     * @param {function} handler Event handler.
     */
    onChange(property, handler) {
        this.handlers[property].push(handler);
    }

    /**
     * Read the config from the file if it exists.
     * Initialize the file with the default configuration otherwise.
     * @private
     */
    assertConfig() {
        if (!fs.existsSync(this.configFilePath)) {
            this.config = this.DEFAULT_CONFIG;
            this.writeConfigToFile();
        } else {
            this.readConfigFile();
        }
    }

    /**
     * Write the current configuration to file.
     */
    writeConfigToFile() {
        const configString = JSON.stringify(this.config, null, 2);
        fs.writeFileSync(this.configFilePath, configString);
    }

    /**
     * Read the current configuration from file.
     * The read configuration is extended with missing defaults.
     */
    readConfigFile() {
        let config = fs.readFileSync(this.configFilePath);
        config = JSON.parse(config.toString());
        config = Object.assign({}, this.DEFAULT_CONFIG, config);
        this.config = config;
    }

    /**
     * Get an instance of the Config class.
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new Config();
        }
        return this.instance;
    }
}

module.exports = Config;
