"""Build the public WordPress ZIP and its update manifest reproducibly."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json
import shutil
from version import check
root = Path(__file__).resolve().parents[1]
version = check()
plugin = root / 'joinads-reward-studio'
dist = root / 'dist'
dist.mkdir(exist_ok=True)
archive_path = dist / 'rewards-studio.zip'
with ZipFile(archive_path, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(plugin.rglob('*')):
        if path.is_file():
            info = ZipInfo(path.relative_to(root).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
# Preserve the previous local download name without changing the installed directory.
shutil.copyfile(archive_path, dist / 'joinads-reward-studio.zip')
repo = 'https://github.com/joinads/rewards-studio'
notes = (root / 'CHANGELOG.md').read_text().split(f'## {version} ', 1)[1].split('\n', 1)[1].split('\n## ', 1)[0].strip()
manifest = dict(name='Rewards Studio by CORE ( JOINADS )', slug='joinads-reward-studio', version=version,
                requires='6.6', requires_php='7.4', tested='7.1.4', homepage=repo,
                download_url=f'{repo}/releases/download/v{version}/rewards-studio.zip', changelog=notes)
(dist / 'update.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
(dist / 'release-notes.md').write_text(notes + '\n')
(dist / 'SHA256SUMS').write_text(''.join(f'{hashlib.sha256((dist / name).read_bytes()).hexdigest()}  {name}\n' for name in ['rewards-studio.zip', 'update.json']))
print(f'dist/rewards-studio.zip — v{version}')
