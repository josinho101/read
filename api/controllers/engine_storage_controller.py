from flask import Blueprint, jsonify, request
from services import engine_storage_service as svc

engine_storage_controller = Blueprint('engine_storage_controller', __name__)


@engine_storage_controller.route('/api/v1/engines', methods=['GET'])
def list_engines():
    return jsonify(svc.list_engines()), 200


@engine_storage_controller.route('/api/v1/engines', methods=['POST'])
def save_engine():
    data = request.get_json(force=True)
    name = data.get('name', '').strip()
    version = data.get('version', '').strip()
    if not name or not version:
        return jsonify({'error': 'name and version are required'}), 400
    result = svc.save_engine(name, version, data)
    return jsonify(result), 201


@engine_storage_controller.route('/api/v1/engines/<name>/<version>', methods=['GET'])
def get_engine(name, version):
    return jsonify(svc.get_engine(name, version)), 200


@engine_storage_controller.route('/api/v1/engines/<name>/<version>', methods=['PUT'])
def update_engine(name, version):
    data = request.get_json(force=True)
    result = svc.update_engine(name, version, data)
    return jsonify(result), 200


@engine_storage_controller.route('/api/v1/engines/<name>/<version>', methods=['DELETE'])
def delete_engine(name, version):
    svc.delete_engine(name, version)
    return jsonify({'message': f"Engine '{name}' v{version} deleted."}), 200
