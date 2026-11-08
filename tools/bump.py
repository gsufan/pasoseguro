#!/usr/bin/env python3
"""Set the build number in version.json, js/core.js and the asset URLs of index.html.

Usage: python3 tools/bump.py 1.1.4
"""
import json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
build = sys.argv[1]

(root / 'version.json').write_text(json.dumps({'build': build}) + '\n')

core = root / 'js/core.js'
core.write_text(re.sub(r"const BUILD = '[^']*';", f"const BUILD = '{build}';", core.read_text()))

index = root / 'index.html'
index.write_text(re.sub(r'\?b=[^"]*"', f'?b={build}"', index.read_text()))

print('build', build)
