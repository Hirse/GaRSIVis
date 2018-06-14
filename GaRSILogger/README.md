# GazeReader
Electron App to read PDF documents while recording eye tracking.
Using the GazeServer to communicate with a tobii eye tracker.

## Development

### Windows
1. Install [Node.js](https://nodejs.org) (8+, preferably latest)
2. Install [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) by running `npm install --global windows-build-tools` in an elevated shell
3. Run `npm install`
4. Run `npm start` or use debugging
4. Run `npm dist` to create a distributable package

### Mac

`npm` has [some bugs](https://github.com/electron-userland/electron-builder/issues/1968) and does not work well on Mac right now, and `yarn` is a better option on Mac.

1. Install [Node.js](https://nodejs.org) (8+, preferably latest)
2. Run `yarn install`
3. Run `yarn start` to run locally
4. Run `yarn dist` to create a distributable package

Debug Environment is set up for [Visual Studio Code](https://code.visualstudio.com/).  
Install Workspace Recommended Extensions for best experience.

## Tracked Events
### ACTIVE
Reports a change of the currently active window.  
The active window is only polled every second, so the event could be delayed and possibly skip windows that are only active for less than one second.
```html
<ISO-DATETIME>|ACTIVE|<APP-ID>;<APP-TITLE>

2017-10-29T20:06:05.883Z|ACTIVE|electron.exe,GazeReader
```
*Note, the app-title may be stripped from data for privacy reasons.*

### BLUR
Reports a loss of focus for the main window.
```html
<ISO-DATETIME>|BLUR|

2017-10-29T20:06:05.883Z|BLUR|
```

### FOCUS
Reports a gain of focus for the main window.
```html
<ISO-DATETIME>|FOCUS|

2017-10-29T20:06:05.883Z|FOCUS|
```

### GAZE
Reports a gaze event.  
Gaze events are only recorded when they fall into the `textLayer` (the white page in the Reader).
```html
<ISO-DATETIME>|GAZE|<ABS-X>,<ABS-Y>;<REL-X>%,<REL-Y>%;<TEXT>

2017-10-29T20:06:09.010Z|GAZE|689.93,517.23;34.75%,36.32%;[textLayer]
2017-10-29T20:06:10.474Z|GAZE|974.06,562.03;4.58%,94.80%;trol group, and the conflicts of interest that are addressed
```
`ABS`-coordinates are relative to the window (content bound)  
`REL`-percentages are relative to the text element
`TEXT` is either `[textLayer]` or a string if a single line was hit

### FIXATIONSTART
Reports a fixation start event.  
Fixation start events are only recorded when they fall into the `textLayer` (the white page in the Reader).
```html
<ISO-DATETIME>|FIXATIONSTART|<ABS-X>,<ABS-Y>;<REL-X>%,<REL-Y>%;<TEXT>

2017-10-29T20:06:09.010Z|FIXATIONSTART|689.93,517.23;34.75%,36.32%;[textLayer]
2017-10-29T20:06:10.474Z|FIXATIONSTART|974.06,562.03;4.58%,94.80%;trol group, and the conflicts of interest that are addressed
```
`ABS`-coordinates are relative to the window  
`REL`-percentages are relative to the text element
`TEXT` is either `[textLayer]` or a string if a single line was hit

### FIXATIONDATA
Reports a fixation data event.  
Fixation data events are only recorded when they fall into the `textLayer` (the white page in the Reader).
```html
<ISO-DATETIME>|FIXATIONDATA|<ABS-X>,<ABS-Y>;<REL-X>%,<REL-Y>%;<TEXT>

2017-10-29T20:06:09.010Z|FIXATIONDATA|689.93,517.23;34.75%,36.32%;[textLayer]
2017-10-29T20:06:10.474Z|FIXATIONDATA|974.06,562.03;4.58%,94.80%;trol group, and the conflicts of interest that are addressed
```
`ABS`-coordinates are relative to the window  
`REL`-percentages are relative to the text element
`TEXT` is either `[textLayer]` or a string if a single line was hit

### FIXATIONEND
Reports a fixation end event.  
Fixation end events are only recorded when they fall into the `textLayer` (the white page in the Reader).
```html
<ISO-DATETIME>|FIXATIONEND|<ABS-X>,<ABS-Y>;<REL-X>%,<REL-Y>%;<TEXT>

2017-10-29T20:06:09.010Z|FIXATIONEND|689.93,517.23;34.75%,36.32%;[textLayer]
2017-10-29T20:06:10.474Z|FIXATIONEND|974.06,562.03;4.58%,94.80%;trol group, and the conflicts of interest that are addressed
```
`ABS`-coordinates are relative to the window  
`REL`-percentages are relative to the text element
`TEXT` is either `[textLayer]` or a string if a single line was hit

### HEAD
Reports a head pose event.
```html
<ISO-DATETIME>|HEAD|<LOCATION-X>,<LOCATION-Y>,<LOCATION-Z>;<ROTATION-X>,<ROTATION-Y>,<ROTATION-Z>

2017-10-29T19:39:03.361Z|HEAD|2.33,57.90,668.02;0.03,0.17,-0.03
```

### SCROLL
Reports a scroll change of the document.
```html
<ISO-DATETIME>|SCROLL|<PX-BEFORE>-><PX-AFTER>;<REL-BEFORE>%-><REL-AFTER>%

2017-10-29T20:06:11.116Z|SCROLL|10->410,0.11%->4.34%
```

### ZOOM
Reports a zoom change of the viewer.
```html
<ISO-DATETIME>|SCROLL|<FOCTOR-BEFORE>-><FACTOR-AFTER>

2017-10-29T20:06:13.056Z|ZOOM|1.25->1.1
```

### PDF
Reports a PDF size or position change, and it is triggered by a scrolling, window resizing or zooming.
```html
<ISO-DATETIME>|PDF|<LEFT>;<RIGHT>;<TOP>;<BOTTOM>;<WIDTH>;<HEIGHT>

2017-11-09T01:54:52.303Z|PDF|-81;1920;-3551;18992;2001;22543
```
`<LEFT>`, `<RIGHT>`, `<TOP>` and `<BOTTOM>` are relative to the window content bounding box.

### OPEN
Reports the opening of a new document.
```html
<ISO-DATETIME>|OPEN|<PATH>

2017-10-29T20:06:08.693Z|OPEN|C:\Users\Jan\Documents\Documents\539\2.1 - Whatmakes good research in software engineering.pdf
```

### REASON
Reports the user-selection of a reason for their absence.  
The user is given a choice after no gaze was recorded for a given time (currently 1 minute).
```html
<ISO-DATETIME>|REASON|<SELECTION>

2017-10-29T20:06:08.693Z|OPEN|distraction
```
`SELECTION` is one of `work`, `interruption`, or `distraction`

### CLOSE
Reports the closing of a document.
```html
<ISO-DATETIME>|CLOSE|

2017-10-29T20:06:08.693Z|CLOSE|
```

## Results
The results are stored in the `gazereader/sessions`-folder in the [`appData`-directory](https://electron.atom.io/docs/api/app/#appgetpathname):
* `%APPDATA%` on Windows
* `$XDG_CONFIG_HOME` or `~/.config` on Linux
* `~/Library/Application Support` on macOS

## Settings
Default Settings:
```js
{
    showGaze: false,
    highlightElements: false,
    gazeServerHost: 'localhost',
    gazeServerPort: 8887
}
```
The GazeServer-related settings can not be configured in the UI. They are only applied if set on start.
