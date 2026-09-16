"""Authenticated account snapshots only; active or explicitly selected user archive."""
from datetime import datetime, timezone
from health_report import day, clean, date_text, sleep_entry, duration_text


def build_report(data, user, start, end, archive_id='', revision=0):
    first, last = day(start), day(end)
    if first > last or (last-first).days > 1826:
        raise ValueError('Başlangıç ve bitişi kontrol et; en fazla 5 yıllık aralık seç.')
    label = 'Güncel kayıtlar'
    if archive_id:
        if not isinstance(archive_id, str):
            raise ValueError('Geçerli bir arşiv seç.')
        archive = next((a for a in data.get('workspaceArchives', []) if isinstance(a, dict) and a.get('id') == archive_id), None)
        if not archive or not isinstance(archive.get('data'), dict):
            raise ValueError('Bu hesapta seçilen arşiv bulunamadı.')
        data, label = archive['data'], clean(archive.get('name'), 100)
    sections = []
    def inside(value):
        try:
            return first <= day(value) <= last
        except (ValueError, TypeError):
            return False
    def text(value):
        if isinstance(value, list):
            return ', '.join(clean(x, 30) for x in value[:100])
        return clean(value, 500)
    def details(row, fields):
        return ' | '.join(f'{label}: {text(row[key])}' for key, label in fields if row.get(key) is not None and row.get(key) != '') or 'Ayrıntı girilmemiş'
    def add(title, rows):
        sections.append({'title': title, 'rows': rows, 'count': len(rows)})
        if sum(s['count'] for s in sections) > 2000:
            raise ValueError('Bu rapor 2000 kayıt satırını aşıyor. Daha kısa bir tarih aralığı seç.')
    def array(key):
        return [r for r in data.get(key, []) if isinstance(r, dict)] if isinstance(data.get(key), list) else []
    def mapping(key):
        return data.get(key, {}) if isinstance(data.get(key), dict) else {}
    periods = []
    for p in array('multisportPeriods') + array('trainingPeriods'):
        try:
            overlaps = day(p.get('startDate')) <= last and day(p.get('endDate')) >= first
        except (ValueError, TypeError):
            continue
        if not overlaps:
            continue
        periods.append([p['startDate'], clean(p.get('name'), 100), details(p, [('endDate','Bitiş'),('goal','Hedef'),('weeks','Hafta')])])
        for index, legacy_day in enumerate(p.get('weekly', [])):
            if isinstance(legacy_day, list):
                for row in legacy_day:
                    if isinstance(row, dict): periods.append(['', clean(row.get('name'),100), f'Gün (0=Pzt): {index} | '+details(row,[('sets','Set'),('min','Alt hedef'),('max','Üst hedef'),('rir','RIR'),('rest','Dinlenme (sn)')])])
        for b in p.get('blocks', []):
            if not isinstance(b, dict): continue
            periods.append(['', clean(b.get('title') or b.get('sportId'), 100), details(b,[('day','Haftanın günü (0=Pzt)'),('durationMin','Süre (dk)'),('methodId','Yöntem')])])
            for s in b.get('steps', []):
                if isinstance(s, dict): periods.append(['', clean(s.get('name'),100), details(s,[('sets','Set'),('reps','Tekrar'),('seconds','Süre (sn)'),('loadKg','Yük (kg)'),('rir','RIR'),('restSec','Dinlenme (sn)')])])
    add('Planlar ve dönemler', periods)
    sessions = []
    for r in array('sportSessions'):
        if not inside(r.get('date')): continue
        sessions.append([r['date'],clean(r.get('sportName'),100),details(r,[('durationMin','Dakika'),('effort','Zorluk /10'),('conditions','Koşullar'),('notes','Not')])])
        for a in (r.get('workout') or {}).get('actual', []):
            if not isinstance(a, dict) or not a.get('done'): continue
            s=next((s for s in (r.get('workout') or {}).get('steps',[]) if s.get('id')==a.get('stepId')), {})
            sessions.append([r['date'],clean(s.get('name') or 'Gerçekleşen set',100),details(a,[('index','Set sırası (0=ilk)'),('reps','Tekrar'),('seconds','Süre (sn)'),('loadKg','Yük (kg)'),('rir','RIR'),('distanceM','Mesafe (m)'),('restSec','Dinlenme (sn)')])])
        if isinstance(r.get('metrics'),dict) and r['metrics']:
            sessions.append([r['date'],'Branş ölçümleri',details(r['metrics'],[(k,k) for k in r['metrics']])])
    add('Branş seansları ve gerçekleşen setler',sessions)
    movements=[]
    for date, rows in sorted(mapping('trainingLogs').items()):
        if inside(date) and isinstance(rows,list):
            for r in rows:
                if isinstance(r,dict) and r.get('source')!='sport_program':
                    movements.append([date,clean(r.get('name'),100),details(r,[('sets','Set değerleri'),('metricUnit','Birim'),('load','Yük (kg)'),('rir','RIR')])])
    add('Bağımsız hareket kayıtları',movements)
    goals=[]
    for r in array('athleteGoals'):
        try:
            overlaps = day(r.get('startDate')) <= last and day(r.get('targetDate')) >= first
        except (ValueError, TypeError):
            continue
        if not overlaps: continue
        goals.append([r.get('startDate',''),clean(r.get('title') or r.get('name'),100),details(r,[('baseline','Başlangıç'),('target','Hedef'),('unit','Birim'),('targetDate','Hedef tarihi'),('conditions','Koşullar')])])
    for r in array('goalMeasurements'):
        if inside(r.get('date')): goals.append([r['date'],'Hedef ölçümü',details(r,[('goalId','Hedef kimliği'),('value','Değer'),('notes','Not')])])
    add('Hedefler ve ölçümler',goals)
    daily=[]
    for date,r in sorted(mapping('daily').items()):
        if not inside(date) or not isinstance(r,dict): continue
        sleep=sleep_entry(r)
        daily.append([date,'Günlük durum',details(r,[('weight','Kilo (kg)'),('energy','Enerji'),('stress','Stres'),('sleepQuality','Uyku kalitesi'),('sleepTime','Yatış'),('wakeTime','Uyanış')])+(' | Uyku: '+duration_text(sleep['minutes']) if sleep else '')])
    add('Uyku ve günlük durum',daily)
    for key,title,fields in [
        ('foodLogs','Beslenme kayıtları',[('name','Besin'),('n','Besin'),('servings','Porsiyon'),('serv','Ölçek'),('meal','Öğün'),('kcal','Kayıtlı kcal'),('p','Protein (g)'),('c','Karbonhidrat (g)'),('f','Yağ (g)')]),
        ('waterLogs','Su kayıtları',[('ml','Hacim (ml)'),('time','Saat')]),
        ('painLogs','Ağrı kayıtları',[]),('cycleDays','Döngü günlüğü',[('bleeding','Kanama'),('pain','Ağrı'),('fatigue','Yorgunluk'),('notes','Not')])]:
        rows=[]
        for date,values in sorted(mapping(key).items()):
            if not inside(date): continue
            for r in values if isinstance(values,list) else [values]:
                if isinstance(r,dict): rows.append([date,title,details(r,fields or [(k,k) for k in r])])
        add(title,rows)
    add('Vücut ölçümleri',[[r['date'],'Ölçüm',details(r,[(k,k) for k in r if k not in ('id','date','updatedAt','createdAt')])] for r in array('bodyMeasurements') if inside(r.get('date'))])
    add('Sağlık olayları',[[r.get('startDate',''),'Kullanıcı bildirimi',details(r,[('kind','Tür'),('severity','Düzey'),('endDate','Bitiş'),('notes','Not')])] for r in array('healthEpisodes') if inside(r.get('startDate')) or inside(r.get('endDate'))])
    labs=[]
    for r in array('healthLabRecords'):
        if not inside(r.get('date')) or r.get('archivedAt'): continue
        for v in r.get('rows',[]):
            if isinstance(v,dict): labs.append([r['date'],clean(v.get('name'),100),details(v,[('value','Değer'),('comparator','Karşılaştırma'),('unit','Birim'),('low','Alt sınır'),('high','Üst sınır')])+' | Lab: '+clean(r.get('lab'),100)])
    add('Kan tahlili kayıtları',labs)
    return {'name':clean(user.get('name'),60),'source':label,'from':start,'to':end,'revision':revision,
            'generatedAt':datetime.now(timezone.utc).isoformat(),'sections':sections,'entries':sum(s['count'] for s in sections)}


def render_pdf(report):
    from io import BytesIO
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, KeepTogether
    from health_report_pdf import fonts, paragraph
    fonts(); output=BytesIO(); story=[]
    story += [paragraph('ATHLETE LIFE / GENEL VERİ RAPORU',11,True),Spacer(1,14),paragraph(report['name'],23,True),Spacer(1,8),paragraph(report['source']+' | '+date_text(report['from'])+' - '+date_text(report['to']),10),Spacer(1,12),paragraph('Kullanıcı tarafından kaydedilen verilerin özeti. Eksik kayıtlar sonuç olarak yorumlanmaz. Fotoğraflar ve hesap güvenlik bilgileri dahil değildir. Kişisel notlar ilk 500 karakterle özetlenir; ham değerler için arşiv JSON dosyasını kullan. Sağlık kayıtları tanı veya sağlık kuruluşunun asıl raporu değildir.',9),Spacer(1,18)]
    for section in report['sections']:
        story.append(KeepTogether([paragraph(section['title']+' / '+str(section['count']),13,True),Spacer(1,8)]))
        if not section['rows']:
            story += [paragraph('Bu tarih aralığında kayıt yok.',9),Spacer(1,16)];continue
        rows=[[paragraph(h,8,True) for h in ['Tarih','Kayıt','Ayrıntı']]]
        rows += [[paragraph(date_text(r[0]) if r[0] else '',8),paragraph(r[1],8),paragraph(r[2],8)] for r in section['rows']]
        table=Table(rows,colWidths=[67,133,319],repeatRows=1,hAlign='LEFT')
        table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e9f0eb')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f6f8f5')]),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
        story += [table,Spacer(1,18)]
    def page(canvas,doc):
        canvas.setFont('HealthSans',8);canvas.setFillColor(colors.HexColor('#516255'))
        canvas.drawString(38,24,'Athlete Life | Kişisel veri özeti | Sürüm '+str(report['revision']))
        canvas.drawRightString(A4[0]-38,24,str(doc.page))
    SimpleDocTemplate(output,pagesize=A4,rightMargin=38,leftMargin=38,topMargin=38,bottomMargin=48,title='Athlete Life - Genel Veri Raporu',author='Athlete Life').build(story,onFirstPage=page,onLaterPages=page)
    return output.getvalue()
