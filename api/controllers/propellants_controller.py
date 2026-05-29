from flask import Blueprint, jsonify
from services.propellants_service import get_propellants

propellants_controller = Blueprint('propellants_controller', __name__)

@propellants_controller.route('/api/v1/propellants', methods=['GET'])
def get_propellant_data():
    json_output = get_propellants()
    return jsonify(json_output), 200
