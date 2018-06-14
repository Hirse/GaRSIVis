#!/bin/bash

nohup node GaRSIVis/server.js &
echo "node started"

nohup python3 GaRSIVisServer/vis_server.py &
echo "python server started"

cd GaRSIVisServer
python3 vis_ws.py
