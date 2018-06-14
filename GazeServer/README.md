# GazeServer
Server Component that sends eye tracking coordinates gathered by a tobii eye-tracker to a WebSocket.

## Building
Build the GazeServer using Visual Studio.  
The current configured target is `bin/x86/Debug`.

## Usage
Start the `GazeServer.exe` and connect to the WebSocket.  
Default address is `ws://localhost:8887/<event>`.

### Events
The GazeServer emits three different events, each on a different path:
* `/gaze`: GazePoint events in the form `<X>,<Y>`
* `/fixation`: Fixation events in the form `<KIND>: <X>,<Y>`
    * Fixation Begin events in the form `FS: <X>,<Y>`
    * Fixation Data events in the form `FD: <X>,<Y>`
    * Fixation End events in the form `FE: <X>,<Y>`
* `/head`: HeadPose events in the form `<Position.X>,<Position.Y>,<Position.Z>;<Rotation.X>,<Rotation.Y>,<Rotation.Z>`

All values are floating point with two decimals.

### Options
The GazeServer supports two optional flags:
* `/H` to set the host of the WebSocket URL (default `localhost`)
* `/P` to set the port of the WebSocket URL (default `8887`)
