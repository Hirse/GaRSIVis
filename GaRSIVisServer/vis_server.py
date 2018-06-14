from flask import Flask, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_url_path='')
CORS(app)


@app.route('/data/<path:path>')
def send_file(path):
    return send_from_directory('data', path)


@app.after_request
def add_header(r):
    r.headers['Cache-Control'] = "no-cache"
    return r


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=3001)
