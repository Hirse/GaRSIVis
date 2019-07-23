[![doi](https://img.shields.io/badge/doi-10.1145%2F3205929.3205933-fcb426.svg)](https://doi.org/10.1145/3205929.3205933)

# GaRSIVis: Improving the Predicting of Self-Interruption during Reading using Gaze Data

[Jan Pilzer](https://github.com/Hirse), Shareen Mahmud, Vanessa Putnam, and [Tamara Munzner](https://www.cs.ubc.ca/~tmm). Proc. ETVIS 2018

Gaze pattern data provides a promising opportunity to create a predictive model of self-interruption during reading that could support active interventions to keep a reader's attention at times when self-interruptions are predicted to occur. We present two systems designed to help analysts create and improve such a model. We present GaRSIVis, (Gaze Reading Self-Interruption Visualizer), that integrates a visualization front-end suitable for data cleansing and a prediction back-end that can be run repeatedly as the input data is iteratively improved. It allows analysts refining the predictive model to filter out unwanted parts of the gaze data that should not be used in the prediction. It relies on data gathered by GaRSILogger, which logs gaze data and activity associated with interruptions during on-screen reading. By integrating data cleansing and our prediction results in our visualization, we enable analysts using GaRSIVis to come up with a comprehensible way of understanding self-interruption from gaze related features.

[Paper](documents/garsivis-cameraready.pdf), [Slides](documents/garsivis-talk.pdf)

## GaRSIVis
The GaRSIVis front-end and back-end are found in the `GaRSIVis` and `GaRSIVisServer` directories respectively.

### Build and Run
This is a simplified setup building and running all required code inside a docker container.
Only docker has to be installed and running to setup the project.
1. Build the docker container  
    `$ docker build --rm -f Dockerfile -t GaRSIVis .`  
    Note, that the preprocessing requires a lot of memory, so it might be necessary to increase the memory available to Docker.
2. Run the built container  
    `$ docker run --rm -it -p 3000:3000 -p 5000:5000 -p 9000:9000 GaRSIVis:latest`
3. Open `http://localhost:3000`

## GaRSILogger
The GaRSILogger app is in `GaRSILogger`.
The reader app supports multiple OS, but the eye tracking connection (`GazeServer`) is currently windows only due to restrictions from the Tobii SDK.
