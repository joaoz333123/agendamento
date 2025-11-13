from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='build')


@app.route('/')
def serve_root():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory(app.static_folder, path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
