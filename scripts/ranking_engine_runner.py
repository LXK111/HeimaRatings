import importlib.util
import json
import sys
from pathlib import Path


ALGORITHMS = {
    "elo": ("elo-rating/elo.py", "EloCalculator"),
    "sdr": ("sdr-rating/sdr.py", "SDRCalculator"),
    "glicko2": ("glicko2-rating/glicko2.py", "Glicko2Calculator"),
    "hybrid": ("sdr-glicko2-hybrid/sdr_glicko2.py", "SDRGlicko2Calculator"),
}


def load_calculator(algorithm):
    if algorithm not in ALGORITHMS:
        raise ValueError(f"Unsupported algorithm: {algorithm}")

    relative_path, class_name = ALGORITHMS[algorithm]
    algorithm_file = Path(__file__).resolve().parents[1] / "rating-algorithm" / relative_path

    spec = importlib.util.spec_from_file_location(f"hema_{algorithm}", algorithm_file)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load algorithm module: {algorithm_file}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    calculator_class = getattr(module, class_name)
    return calculator_class()


def main():
    try:
        raw_input = sys.stdin.read()
        request = json.loads(raw_input)
        algorithm = request.get("algorithm", "hybrid")
        calculator_input = {
            "players": request["players"],
            "matches": request["matches"],
        }
        calculator = load_calculator(algorithm)
        rankings = json.loads(calculator.run_from_json(json.dumps(calculator_input, ensure_ascii=False)))
        print(json.dumps({"algorithm": algorithm, "rankings": rankings}, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
