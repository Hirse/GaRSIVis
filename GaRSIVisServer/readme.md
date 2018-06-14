# GaRSIVis Server
Python Server(s) for the GaRSIVis application

## Setup
1. Install dependencies using `pip`
2. Load raw session files into the `sessions` folder
3. Generate the preprocessed data from the raw sessions:
    1. Run `preprocess.py`
    2. Run `chunk.py`
    3. Run `predict.py`
4. Start the servers:
    1. Run `vis_server.py` to serve the static data
    2. Run `vis_ws.py` to enable the interaction
 