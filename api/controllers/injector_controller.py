from flask import Blueprint, jsonify, request
from services.injector import sweep_injector_designs

injector_controller = Blueprint('injector_controller', __name__)


@injector_controller.route('/api/v1/injector/sweep', methods=['GET'])
def get_injector_sweep():
    """
    Hydraulic sweep of injector orifice sizing across a pressure-drop range.

    Query parameters:
      m_dot_total_kgs       — total propellant mass flow (kg/s)
      of_ratio              — oxidizer-to-fuel mass ratio (dimensionless)
      pc_bar                — chamber pressure (bar)
      injector_type         — 'impinging' | 'pintle' | 'coaxial' | 'showerhead'
      ox_code               — oxidizer propellant code, e.g. 'LOX', 'N2O'
      fuel_code             — fuel propellant code, e.g. 'RP1', 'Ethanol'
      d_o_mm                — (optional) oxidizer orifice diameter (mm), default 1.5
      d_f_mm                — (optional) fuel orifice diameter (mm), default 1.2
      impingement_half_angle_deg — (optional) convergence half-angle for impinging type (°), default 45
    """
    try:
        m_dot_total_kgs = float(request.args.get('m_dot_total_kgs', 1.0))
        of_ratio        = float(request.args.get('of_ratio', 2.5))
        pc_bar          = float(request.args.get('pc_bar', 20.0))
        injector_type   = request.args.get('injector_type', 'impinging')
        ox_code         = request.args.get('ox_code', 'LOX')
        fuel_code       = request.args.get('fuel_code', 'RP1')
        d_o_mm          = float(request.args.get('d_o_mm', 1.5))
        d_f_mm          = float(request.args.get('d_f_mm', 1.2))
        impingement_half_angle_deg = float(request.args.get('impingement_half_angle_deg', 45.0))
    except (ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid parameter: {e}'}), 400

    pc_pa = pc_bar * 1e5    # convert bar → Pa for the service function

    try:
        sweep = sweep_injector_designs(
            m_dot_total=m_dot_total_kgs,
            OF_ratio=of_ratio,
            P_c=pc_pa,
            injector_type=injector_type,
            ox_code=ox_code,
            fuel_code=fuel_code,
            d_o_m=d_o_mm / 1000.0,   # mm → m
            d_f_m=d_f_mm / 1000.0,   # mm → m
            impingement_half_angle_deg=impingement_half_angle_deg,
        )
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    response = {
        'injector_type': injector_type.lower(),
        'propellant_pair': {
            'oxidizer': ox_code.upper(),
            'fuel': fuel_code.upper(),
        },
        'orifice_diameters_mm': {
            'oxidizer': d_o_mm,
            'fuel': d_f_mm,
        },
        'impingement_half_angle_deg': impingement_half_angle_deg if injector_type.lower() == 'impinging' else None,
        'sweep': sweep,
    }

    return jsonify(response), 200
