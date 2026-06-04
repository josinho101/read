def get_propellants():
    json_output = {
        "propellants": {
            "fuels": [
                {"name": "Liquid Hydrogen", "code": "LH2"},
                {"name": "RP1 - Rocket Grade Kerosene", "code": "RP1"},
                {"name": "Liquid Methane", "code": "CH4"},
                {"name": "Liquid Propane", "code": "C3H8"},
                {"name": "Liquid Ethane", "code": "C2H6"},
                {"name": "Liquid Ethanol", "code": "Ethanol"},
                {"name": "Liquid Methanol", "code": "CH3OH"},
                {"name": "Liquid Ammonia", "code": "NH3"},
                {"name": "Ammonium Perchlorate", "code": "AP"}
            ],
            "oxidizers": [
                {"name": "Liquid Oxygen", "code": "LOX"},
                {"name": "Nitrous Oxide", "code": "N2O"},
                {"name": "Nitrous Oxide (Boiling Point)", "code": "N2O_nbp"},
                {"name": "90% Hydrogen Peroxide", "code": "90_H2O2"},
                {"name": "Liquid Fluorine", "code": "F2"},
                {"name": "Water", "code": "H2O"}
            ]
        }
    }

    # Sort fuels alphabetically by the 'name' key
    json_output["propellants"]["fuels"] = sorted(
        json_output["propellants"]["fuels"], 
        key=lambda x: x["name"]
    )

    # Sort oxidizers alphabetically by the 'name' key
    json_output["propellants"]["oxidizers"] = sorted(
        json_output["propellants"]["oxidizers"], 
        key=lambda x: x["name"]
    )

    return json_output

def get_oxidizer_name_by_code(target_code):
    json_output = get_propellants()
    for oxidizer in json_output["propellants"]["oxidizers"]:
        if oxidizer["code"] == target_code:
            return oxidizer["name"]
    return None

def get_fuel_name_by_code(target_code):
    json_output = get_propellants()
    for fuel in json_output["propellants"]["fuels"]:
        if fuel["code"] == target_code:
            return fuel["name"]
    return None