# GaRSIVis
The GaRSIVis front-end and back-end are found in the `GaRSIVis` and `GaRSIVisServer` directories respectively.

## Build and Run
This is a simplified setup building and running all required code inside a docker container.
Only docker has to be installed and running to setup the project.
1. Build the docker container  
    `$ docker build --rm -f Dockerfile -t GaRSIVis .`  
    Note, that the preprocessing requires a lot of memory, so it might be necessary to increase the memory available to Docker.
2. Run the built container  
    `$ docker run --rm -it -p 3000:3000 -p 5000:5000 -p 9000:9000 GaRSIVis:latest`
3. Open `http://localhost:3000`

# GaRSILogger
The GaRSILogger app is in `GaRSILogger`.
The reader app supports multiple OS, but the eye tracking connection (`GazeServer`) is currently windows only due to restrictions from the Tobii SDK.
