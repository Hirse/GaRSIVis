FROM brileb73/python3-node6

COPY GaRSIVis GaRSIVis
COPY GaRSIVisServer GaRSIVisServer
COPY data GaRSIVisServer/sessions

RUN cd GaRSIVis && npm i
RUN cd GaRSIVis && npm run build:prod

RUN cd GaRSIVisServer && python3 -m pip install -r requirements.txt
RUN cd GaRSIVisServer && python3 preprocess.py && python3 chunk.py && python3 predict.py

COPY start.sh start.sh

EXPOSE 3000 3001 3002

CMD ./start.sh
