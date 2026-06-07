from flask import Blueprint, jsonify, request
from services.cea import generate_rocket_engine_params, get_station_properties

engine_controller = Blueprint('engine_controller', __name__)

@engine_controller.route('/api/v1/engine/design', methods=['GET'])
def get_engine_design():
    ox_code = request.args.get('ox_code', default='LOX')
    fuel_code = request.args.get('fuel_code', default='RP1')
    pc_bar = float(request.args.get('pc_bar', default=20.0))
    performance_mode = request.args.get('performance_mode', default='sea_level')
    target_thrust_N = float(request.args.get('target_thrust_N', default=500.0))
    mr_min = float(request.args.get('mr_min', default=3.5))
    mr_max = float(request.args.get('mr_max', default=5.5))
    l_star_m = request.args.get('l_star_m', None, type=float)
    contraction_ratio = request.args.get('contraction_ratio', 8.0, type=float)

    json_output = generate_rocket_engine_params(
        ox_code=ox_code,
        fuel_code=fuel_code,
        pc_bar=pc_bar,
        thrust_N=target_thrust_N,
        mr_min=mr_min,
        mr_max=mr_max,
        l_star_m=l_star_m,
        contraction_ratio=contraction_ratio,
        performance_mode=performance_mode
    )

    return jsonify(json_output), 200


@engine_controller.route('/api/v1/engine/station-properties', methods=['GET'])
def get_engine_station_properties():
    ox_code = request.args.get('ox_code', default='LOX')
    fuel_code = request.args.get('fuel_code', default='RP1')
    pc_bar = float(request.args.get('pc_bar', default=20.0))
    performance_mode = request.args.get('performance_mode', default='sea_level')
    mixture_ratio = float(request.args.get('mixture_ratio'))

    json_output = get_station_properties(
        ox_code=ox_code,
        fuel_code=fuel_code,
        pc_bar=pc_bar,
        mr=mixture_ratio,
        performance_mode=performance_mode
    )

    return jsonify(json_output), 200
