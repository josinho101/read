from flask import Blueprint, jsonify, request
from services.cea import generate_rocket_engine_params

engine_controller = Blueprint('engine_controller', __name__)

@engine_controller.route('/api/v1/engine/design', methods=['GET'])
def get_engine_design():
    ox_code = request.args.get('ox_code', default='LOX')
    fuel_code = request.args.get('fuel_code', default='RP1')
    pc_bar = float(request.args.get('pc_bar', default=20.0))
    pe_bar = float(request.args.get('pe_bar', default=1.013))
    target_thrust_N = float(request.args.get('target_thrust_N', default=500.0))
    mr_min = float(request.args.get('mr_min', default=3.5))
    mr_max = float(request.args.get('mr_max', default=5.5))

    json_output = generate_rocket_engine_params(
        ox_code=ox_code,
        fuel_code=fuel_code,
        pc_bar=pc_bar,
        pe_bar=pe_bar,
        thrust_N=target_thrust_N,
        mr_min=mr_min,
        mr_max=mr_max
    )

    return jsonify(json_output), 200
