import os
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, send_from_directory, send_file
from flask_cors import CORS
from flasgger import Swagger
from controllers.propellants_controller import propellants_controller
from controllers.engine_controller import engine_controller
from controllers.injector_controller import injector_controller
from controllers.engine_storage_controller import engine_storage_controller

app = Flask(__name__)

# Allow all origins
CORS(app, origins="*")

swagger_template_path = os.path.join(os.path.dirname(__file__), 'docs', 'swagger.yml')
swagger_config = {
    'headers': [],
    'specs': [
        {
            'endpoint': 'apispec',
            'route': '/swagger.json',
            'rule_filter': lambda rule: True,
            'model_filter': lambda tag: True,
        }
    ],
    'static_url_path': '/flasgger_static',
    'swagger_ui': True,
    'specs_route': '/swagger/',
}
Swagger(app, template_file=swagger_template_path, config=swagger_config)

# Register blueprints
app.register_blueprint(propellants_controller)
app.register_blueprint(engine_controller)
app.register_blueprint(injector_controller)
app.register_blueprint(engine_storage_controller)

# Serve React frontend static files (only used when running in container)
# In local dev, Vite handles serving the frontend directly.
UI_DIST = os.path.join(os.path.dirname(__file__), 'ui', 'dist')

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(UI_DIST, 'assets'), filename)

@app.route('/favicon.svg')
def serve_favicon():
    return send_from_directory(UI_DIST, 'favicon.svg')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    return send_file(os.path.join(UI_DIST, 'index.html'))

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    app.run(debug=debug, host=host, port=5000)
