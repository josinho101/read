import os
from flask import Flask
from flask_cors import CORS
from flasgger import Swagger
from controllers.propellants_controller import propellants_controller
from controllers.engine_controller import engine_controller

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
