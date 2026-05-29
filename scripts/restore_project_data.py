#!/usr/bin/env python3
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("backup_id", nargs="?")
parser.add_argument("--apply", action="store_true")
args = parser.parse_args()
print("Dry-run restore skeleton. Use --apply in next-computer implementation.")
print(f"backup_id={args.backup_id} apply={args.apply}")
