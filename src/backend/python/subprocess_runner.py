import sys
import subprocess
import os

def start_calculator_process():
    script_path = os.path.join(os.path.dirname(__file__), "calculator.py")
    process = subprocess.Popen(
        [sys.executable, script_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    return process 