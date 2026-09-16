"""Read-only, account-bound health summary. No diagnosis or inferred measurements."""
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import math
import re

MAX_SUMMARY_ROWS = 12
MAX_PERIOD_DAYS = 366
TEST_NAMES = {'hgb':'Hemoglobin (HGB)', 'wbc':'Lökosit (WBC)', 'plt':'Trombosit (PLT)',
              'ferritin':'Ferritin', 'vitd':'25-OH D vitamini', 'b12':'B12 vitamini', 'glucose':'Glukoz',
              'hba1c':'HbA1c', 'totalchol':'Total kolesterol', 'ldl':'LDL kolesterol', 'hdl':'HDL kolesterol',
              'tg':'Trigliserit', 'tsh':'TSH', 'creatinine':'Kreatinin', 'alt':'ALT', 'ast':'AST', 'crp':'CRP'}
MARKERS = set(TEST_NAMES)
SOURCE = 'https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/'


def clean(value, limit=100):
    return str(value if value is not None else '').strip()[:limit]


def number(value, optional=False):
    if value is None or str(value).strip() == '':
        if optional:
            return None
        raise ValueError('Ölçüm eksik.')
    value = str(value).strip().replace(',', '.')
    if not re.fullmatch(r'(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?', value, re.I):
        raise ValueError('Geçersiz sayı.')
    result = float(value)
    if not math.isfinite(result) or result < 0:
        raise ValueError('Geçersiz sayı.')
    return result


def day(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('Tarih biçimini kontrol et.')
    result = date.fromisoformat(value)
    if result.year < 1900:
        raise ValueError('Geçerli bir tarih gir.')
    return result


def fmt(value):
    if value is None:
        return '-'
    text = format(Decimal(format(value, '.15g')), 'f')
    if '.' in text:
        text = text.rstrip('0').rstrip('.')
    if len(text) > 22:
        text = format(value, '.10g')
    return text.replace('.', ',')


def date_text(value):
    return '.'.join(value.split('-')[::-1])


def duration_text(value):
    if value is None:
        return '-'
    total = math.floor(value + .5)
    return f'{total // 60} sa {total % 60} dk'


def sleep_entry(row):
    if not isinstance(row, dict):
        return None
    def minutes(value):
        if not isinstance(value, str) or not re.fullmatch(r'\d{2}:\d{2}', value):
            return None
        h, m = map(int, value.split(':'))
        return h * 60 + m if h < 24 and m < 60 else None
    start, end = minutes(row.get('sleepTime')), minutes(row.get('wakeTime'))
    if start is None or end is None or start == end:
        return None
    duration = (end - start + 1440) % 1440
    try:
        awake = number(row.get('nightAwake'), True) or 0
    except ValueError:
        return None
    if awake >= duration:
        return None
    try:
        quality = number(row.get('sleepQuality'), True)
    except ValueError:
        quality = None
    if quality is not None and not 1 <= quality <= 5:
        quality = None
    return {'minutes': duration - awake, 'quality': quality}


def normalize_report(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get('id'), str) or not raw['id']:
        raise ValueError('Rapor kimliği eksik.')
    report_date = day(raw.get('date')).isoformat()
    lab = clean(raw.get('lab'))
    rows = raw.get('rows')
    if not lab or not isinstance(rows, list) or not 1 <= len(rows) <= 60:
        raise ValueError('Rapor alanları eksik.')
    normalized, seen = [], set()
    for raw_row in rows:
        if not isinstance(raw_row, dict):
            raise ValueError('Geçersiz satır.')
        marker = raw_row.get('marker')
        name = TEST_NAMES.get(marker) or clean(raw_row.get('name'))
        if marker not in MARKERS | {'custom'} or not name:
            raise ValueError('Test adı eksik.')
        identity = (marker, tr_lower(name) if marker == 'custom' else '')
        if identity in seen:
            raise ValueError('Yinelenen test.')
        seen.add(identity)
        unit, method = clean(raw_row.get('unit'), 40), clean(raw_row.get('method'))
        if not unit:
            raise ValueError('Birim eksik.')
        value = number(raw_row.get('value'))
        low, high = number(raw_row.get('low'), True), number(raw_row.get('high'), True)
        if low is not None and high is not None and low >= high:
            raise ValueError('Referans sınırlarını kontrol et.')
        operator = raw_row.get('comparator') or '='
        if operator not in ('=', '<', '>', '≤', '≥'):
            raise ValueError('Geçersiz sonuç işareti.')
        normalized.append({'marker': marker, 'name': name, 'unit': unit, 'method': method,
                           'value': value, 'low': low, 'high': high, 'comparator': operator})
    fasting = raw.get('fasting') if raw.get('fasting') in ('fasting', 'nonfasting') else 'unknown'
    return {'id': raw['id'], 'date': report_date, 'lab': lab, 'fasting': fasting, 'rows': normalized}


def tr_lower(value):
    return value.replace('I', 'ı').replace('İ', 'i').lower()


def status(row):
    if row['comparator'] != '=':
        return 'unknown', 'Sınırlı sonuç'
    low, high, value = row['low'], row['high'], row['value']
    if low is None and high is None:
        return 'unknown', 'Aralık eksik'
    if low is not None and value < low:
        return 'low', 'Alt sınır altında'
    if high is not None and value > high:
        return 'high', 'Üst sınır üzerinde'
    return 'within', 'Tek sınıra uygun' if low is None or high is None else 'Rapor aralığında'


def reference(row):
    low, high = row['low'], row['high']
    if low is None and high is None:
        return '-'
    if low is None:
        return '≤ ' + fmt(high)
    if high is None:
        return '≥ ' + fmt(low)
    return fmt(low) + ' - ' + fmt(high)


def value_text(row):
    return (row['comparator'] if row['comparator'] != '=' else '') + fmt(row['value'])


def build_summary(state, user, start, end, revision=0, now=None):
    first, last = day(start), day(end)
    count_days = (last - first).days + 1
    if not 1 <= count_days <= MAX_PERIOD_DAYS:
        raise ValueError('Başlangıç bitişten sonra olamaz; en fazla 366 gün seçebilirsin.')
    now = now or datetime.now(timezone.utc)
    if last > now.date() + timedelta(days=1):
        raise ValueError('Gelecekteki bir dönem için sağlık raporu oluşturulamaz.')
    if not isinstance(state, dict):
        state = {}
    daily = state.get('daily') if isinstance(state.get('daily'), dict) else {}
    points = []
    for offset in range(count_days):
        key = (first + timedelta(days=offset)).isoformat()
        row = sleep_entry(daily.get(key))
        points.append({'date': key, **(row or {'minutes': None, 'quality': None})})
    known = [p for p in points if p['minutes'] is not None]
    rated = [p for p in known if p['quality'] is not None]
    sleep = {'points': points, 'count': len(known), 'days': count_days, 'rated': len(rated),
             'average': sum(p['minutes'] for p in known) / len(known) if known else None,
             'quality': sum(p['quality'] for p in rated) / len(rated) if rated else None}
    raw_reports = state.get('healthLabRecords', [])
    raw_reports = raw_reports if isinstance(raw_reports, list) else []
    reports, invalid = [], 0
    for raw in raw_reports:
        if isinstance(raw, dict) and raw.get('archivedAt'):
            continue
        # Reject malformed records as a unit, matching the application's active reports.
        try:
            report = normalize_report(raw)
        except (ValueError, TypeError, KeyError):
            invalid += 1
            continue
        if start <= report['date'] <= end:
            reports.append(report)
    reports.sort(key=lambda r: r['date'])
    series = defaultdict(list)
    all_rows = []
    for report in reports:
        for row in report['rows']:
            identity = row['marker'] if row['marker'] != 'custom' else 'custom:' + tr_lower(row['name'])
            key = (identity, row['unit'], tr_lower(report['lab']), row['method'], report['fasting'], row['low'], row['high'])
            code, label = status(row)
            point = {**row, 'date': report['date'], 'lab': report['lab'], 'fasting': report['fasting'],
                     'statusCode': code, 'statusLabel': label, 'resultText': value_text(row), 'referenceText': reference(row)}
            all_rows.append(point)
            series[key].append(point)
    latest = []
    for points_for_test in series.values():
        current = points_for_test[-1]
        previous = next((p for p in reversed(points_for_test[:-1]) if p['date'] < current['date']), None)
        delta = current['value'] - previous['value'] if previous and current['comparator'] == previous['comparator'] == '=' else None
        latest.append({**current, 'previous': previous, 'delta': delta})
    # Most recent series first; preserve explicit coverage counts instead of hiding omitted rows.
    latest.sort(key=lambda r: (r['date'], r['statusCode'] in ('high', 'low')), reverse=True)
    return {'name': ' '.join(clean(user.get('name'), 60).split()), 'from': start, 'to': end, 'revision': revision,
            'generatedAt': now.isoformat(), 'sleep': sleep, 'reportCount': len(reports),
            'measurementCount': len(all_rows), 'seriesCount': len(latest), 'rows': latest[:MAX_SUMMARY_ROWS],
            'omitted': max(0, len(latest) - MAX_SUMMARY_ROWS), 'invalidReports': invalid,
            'outsideCount': sum(r['statusCode'] in ('high', 'low') for r in all_rows),
            'unknownCount': sum(r['statusCode'] == 'unknown' for r in all_rows),
            'allRows': sorted(all_rows, key=lambda r: r['date'], reverse=True), 'source': SOURCE}
