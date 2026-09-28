import subprocess, sys, types
sys.path.insert(0, 'apps/api')
from pydantic import ValidationError
from alos.guided_planning import Competency
old = types.ModuleType('alos.guided_planning_before')
old.__package__ = 'alos'
sys.modules[old.__name__] = old
exec(subprocess.check_output(['git','show','1dcc4ac:apps/api/alos/guided_planning.py'], text=True), old.__dict__)
try:
    old.Competency(movement_id='zone-2-run', seconds=1800)
except ValidationError as exc:
    print('PRE-FIX: synthetic 30-minute cardio rejected:', [(e['loc'], e['type']) for e in exc.errors()])
else:
    raise AssertionError('Expected pre-fix failure')
assert Competency(movement_id='zone-2-run', seconds=1800).seconds == 1800
print('FIXED: same synthetic cardio accepted; no account or database accessed.')
