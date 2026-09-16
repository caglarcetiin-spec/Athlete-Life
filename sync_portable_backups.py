"""Merge verified portable backups without dropping existing record IDs."""
import argparse,copy,json
from pathlib import Path
from state_common import checksum
from state_repository import create_store,load_environment
RECORDS={'trainingLogs','foodLogs','waterLogs','painLogs','bodyMeasurements','runs','capabilityRecords','guidedWorkoutHistory','adHocSessions','photoProgress','events'}

def merge(a,b,path=()):
    if isinstance(a,dict) and isinstance(b,dict):
        out=copy.deepcopy(a)
        for k,v in b.items():out[k]=merge(out[k],v,path+(k,)) if k in out else copy.deepcopy(v)
        return out
    if isinstance(a,list) and isinstance(b,list) and path and path[0] in RECORDS:
        def key(v):
            if isinstance(v,dict):
                for k in ('entryId','logId','id'):
                    if v.get(k):return str(v[k])
            return checksum(v)
        out={key(v):copy.deepcopy(v) for v in a}
        out.update({key(v):copy.deepcopy(v) for v in b})
        return list(out.values())
    return copy.deepcopy(b)

def read_backup(path):
    raw=json.loads(path.read_text());content={k:v for k,v in raw.items() if k!='integrity'}
    if raw.get('format')!='alos-portable-backup' or checksum(content)!=raw.get('integrity',{}).get('sha256'):
        raise ValueError('Invalid backup integrity')
    if raw.get('photos'):raise ValueError('Photo migration required')
    return raw

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources',nargs='+',type=Path);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args();backups=sorted([read_backup(p) for p in args.sources],key=lambda x:x['exportedAt'])
    data={};events={};hashes=[]
    for backup in backups:
        data=merge(data,backup['data']);events=merge(events,backup.get('events') or {});hashes.append(backup['integrity']['sha256'])
    load_environment();store=create_store(Path('unused.sqlite3'))
    if store.backend!='mongodb':raise ValueError('MongoDB required')
    try:
        store.init_db();current=store.read_state()
        if current:
            data=merge(data,current['data'])
            events=merge(events,current['data'].get('_portableImport',{}).get('events') or {})
        data['_portableImport']={'sha256':checksum(hashes),'sources':hashes,'events':events}
        print('Verified backups:',len(backups),'current revision:',current['revision'] if current else 0)
        print('Merged counts:',{k:sum(len(v) for v in data.get(k,{}).values()) for k in ('trainingLogs','foodLogs','waterLogs')},'events:',len(events.get('events',[])))
        if not args.apply:return
        if current and current['data']==data:
            print('Already synchronized.');return
        # Preserve every original package, and the pre-sync server snapshot.
        archive=store.collection.database['portable_backups']
        for b in backups:
            archive.update_one({'_id':b['integrity']['sha256']},{'$setOnInsert':{'payload':b}},upsert=True)
        if current:
            archive.update_one({'_id':'before-sync-'+current['checksum']},{'$setOnInsert':{'snapshot':current}},upsert=True)
        latest=store.read_state()
        if (latest or {}).get('checksum')!=(current or {}).get('checksum'):
            raise RuntimeError('Concurrent change detected; retry')
        result=store.commit_state(data,'verified-backups-sync')
        verified=store.read_state()
        if not verified or verified['checksum']!=result['checksum']:raise RuntimeError('Verification failed')
        expected=copy.deepcopy(data);expected['meta']=result['data']['meta']
        if verified['data']!=expected:raise RuntimeError('Data mismatch')
        print('Synchronization verified. Revision:',result['revision'])
    finally:store.client.close()

if __name__=='__main__':
    try:main()
    except Exception as exc:
        print('Synchronization stopped:',type(exc).__name__);raise SystemExit(1)
