"""Set or validate the canonical stable release version."""
from pathlib import Path
import json
import re
import sys
ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / 'joinads-reward-studio/joinads-reward-studio.php'
README = ROOT / 'joinads-reward-studio/readme.txt'
def current():
    return (ROOT / 'VERSION').read_text().strip()
def check():
    version = current()
    assert re.fullmatch(r'\d+\.\d+\.\d+', version), 'VERSION must be X.Y.Z'
    assert re.search(r'^ \* Version: ' + re.escape(version) + '$', MAIN.read_text(), re.M), 'Plugin header version mismatch'
    assert f"const VERSION = '{version}';" in MAIN.read_text(), 'Runtime version mismatch'
    assert f'Stable tag: {version}\n' in README.read_text(), 'readme stable tag mismatch'
    assert json.loads((ROOT / 'package.json').read_text())['version'] == version, 'package version mismatch'
    assert f'## {version} ' in (ROOT / 'CHANGELOG.md').read_text(), 'Add CHANGELOG notes for this version'
    return version
if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] != '--check':
        version = sys.argv[1]
        if not re.fullmatch(r'\d+\.\d+\.\d+', version): sys.exit('Use X.Y.Z')
        if tuple(map(int, version.split('.'))) <= tuple(map(int, current().split('.'))): sys.exit('New version must be greater than VERSION')
        (ROOT / 'VERSION').write_text(version + '\n')
        text = re.sub(r'(^ \* Version: )\S+', lambda m: m[1] + version, MAIN.read_text(), flags=re.M)
        MAIN.write_text(re.sub(r"const VERSION = '[^']+';", f"const VERSION = '{version}';", text))
        README.write_text(re.sub(r'^Stable tag: .*$', f'Stable tag: {version}', README.read_text(), flags=re.M))
        for file in ['package.json', 'package-lock.json']:
            path = ROOT / file
            data = json.loads(path.read_text()); data['version'] = version
            if 'packages' in data: data['packages']['']['version'] = version
            path.write_text(json.dumps(data, indent=2) + '\n')
        print(f'Version {version} set. Add its CHANGELOG entry, then run npm test and push to main.')
    else:
        print(check())
