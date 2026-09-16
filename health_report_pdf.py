"""In-memory PDF output. Fonts are bundled, input text is escaped, no remote assets."""
from io import BytesIO
from pathlib import Path
import threading
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph, Table, TableStyle
from health_report import date_text, duration_text, fmt

FONT_LOCK = threading.Lock()
INK = colors.HexColor('#203c30')
MUTED = colors.HexColor('#516255')
LINE = colors.HexColor('#d8e0d6')
ACCENT = colors.HexColor('#246548')
BAD = colors.HexColor('#9c3030')
PALE = colors.HexColor('#f1f5ee')
WIDTH, HEIGHT = A4
LEFT, RIGHT = 38, WIDTH - 38
CONTENT = RIGHT - LEFT


def fonts():
    with FONT_LOCK:
        if 'HealthSans' not in pdfmetrics.getRegisteredFontNames():
            root = Path(__file__).parent / 'assets' / 'report-fonts'
            for name, filename in [('HealthSans', 'LiberationSans-Regular.ttf'), ('HealthBold', 'LiberationSans-Bold.ttf')]:
                pdfmetrics.registerFont(TTFont(name, str(root / filename)))


def paragraph(value, size=8, bold=False, color=INK, leading=None):
    style = ParagraphStyle('health', fontName='HealthBold' if bold else 'HealthSans',
                           fontSize=size, leading=leading or size * 1.3, textColor=color,
                           splitLongWords=True, spaceAfter=0)
    # Text-only input: never interpret user HTML, links, image or ReportLab expressions.
    return Paragraph(escape(str(value)).replace('\n', '<br/>'), style)


def draw_text(canvas, value, x, top, width, size=9, bold=False, color=INK):
    p = paragraph(value, size, bold, color)
    _, h = p.wrap(width, HEIGHT)
    p.drawOn(canvas, x, top-h)
    return h


def footer(canvas, number, revision):
    canvas.setStrokeColor(LINE)
    canvas.line(LEFT, 34, RIGHT, 34)
    draw_text(canvas, f'Athlete Life | Kişisel sağlık günlüğü | Veri sürümü {revision}', LEFT, 26, 430, 7, color=MUTED)
    canvas.setFont('HealthSans', 7)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(RIGHT, 17, str(number))


def sleep_chart(canvas, points, top):
    x0, x1, height = LEFT + 24, RIGHT - 8, 43
    bottom = top-height
    values = [p['minutes']/60 for p in points if p['minutes'] is not None]
    maximum = max(10, max(values, default=0))
    for v in [0, maximum/2, maximum]:
        y = bottom + v/maximum*height
        canvas.setStrokeColor(LINE); canvas.setLineWidth(.5);canvas.line(x0, y, x1, y)
        canvas.setFont('HealthSans', 6.5);canvas.setFillColor(MUTED)
        canvas.drawRightString(x0-5, y-2, fmt(round(v, 1)))
    last = None
    for i, point in enumerate(points):
        if point['minutes'] is None:
            last = None;continue
        x = x0 + i / max(1,len(points)-1) * (x1-x0)
        y = bottom + (point['minutes']/60) / maximum * height
        canvas.setStrokeColor(ACCENT);canvas.setFillColor(ACCENT);canvas.setLineWidth(1.25)
        if last:
            canvas.line(*last, x, y)
        canvas.circle(x,y,1.6,fill=1,stroke=0);last=(x,y)
    draw_text(canvas,date_text(points[0]['date']),x0,bottom-4,90,6.5,color=MUTED)
    canvas.setFont('HealthSans',6.5);canvas.setFillColor(MUTED)
    canvas.drawRightString(x1,bottom-12,date_text(points[-1]['date']))


def row_cells(row):
    previous = row['previous']
    return [row['name']+'\n'+row['lab'],row['resultText']+' '+row['unit']+'\n'+date_text(row['date']),
            ((previous['resultText']+' '+row['unit']+'\n'+date_text(previous['date'])) if previous else '-'),
            row['referenceText']+'\n'+row['statusLabel']]


def fit_summary(model):
    """Keep preview and PDF coverage identical; never crop a clinical value or unit."""
    fonts()
    widths = [CONTENT*.34, CONTENT*.20, CONTENT*.20, CONTENT*.26]
    kept, used = [], 0
    for row in model['rows']:
        height = max(paragraph(text, 7.5, i==1).wrap(w-14, HEIGHT)[1] for i,(text,w) in enumerate(zip(row_cells(row),widths))) + 6
        height = max(25.5, height)
        if used + height > 312:
            break
        kept.append({**row, '_height': height});used += height
    return {**model, 'rows': kept, 'omitted': model['seriesCount']-len(kept)}


def summary_page(canvas, model, appendix):
    draw_text(canvas,'ATHLETE LIFE / SAĞLIK ÖZETİ',LEFT,HEIGHT-34,CONTENT,9,True,ACCENT)
    name=model['name'] or 'Kişisel sağlık özeti'
    name_size=min(23, CONTENT / max(1, pdfmetrics.stringWidth(name,'HealthBold',1)))
    draw_text(canvas,name,LEFT,HEIGHT-55,CONTENT,name_size,True)
    draw_text(canvas,f"{date_text(model['from'])} - {date_text(model['to'])}  |  Kullanıcının kaydettiği bilgiler",LEFT,HEIGHT-89,CONTENT,9,color=MUTED)
    # Sleep panel: coverage is always printed next to the estimate.
    top=HEIGHT-121
    canvas.setFillColor(PALE);canvas.roundRect(LEFT,top-64,CONTENT,64,8,fill=1,stroke=0)
    stats=[('ORTALAMA UYKU',duration_text(model['sleep']['average'])),('KAYITLI GECE',f"{model['sleep']['count']} / {model['sleep']['days']}"),('ORTALAMA KALİTE',('-' if model['sleep']['quality'] is None else fmt(round(model['sleep']['quality'],2)))+' / 5')]
    for i,(label,value) in enumerate(stats):
        x=LEFT+14+i*CONTENT/3
        draw_text(canvas,label,x,top-11,CONTENT/3-20,7,True,MUTED)
        draw_text(canvas,value,x,top-29,CONTENT/3-20,17,True)
    draw_text(canvas,f"Kalite: {model['sleep']['rated']} bildirim. Eksik geceler sıfır sayılmaz. Grafik: saat; boşluklar eksik kayıt.",LEFT,top-73,CONTENT,7,color=MUTED)
    sleep_chart(canvas,model['sleep']['points'],top-96)
    top=HEIGHT-292
    draw_text(canvas,'KAN TAHLİLLERİ',LEFT,top,CONTENT,11,True)
    draw_text(canvas,f"{model['reportCount']} rapor / {model['measurementCount']} sonuç / {model['seriesCount']} ölçüm serisi. Dönemde sınır dışı: {model['outsideCount']}; yorumlanamayan: {model['unknownCount']}.",LEFT,top-20,CONTENT,7.5,color=MUTED)
    rows=model['rows']
    y=top-44
    headers=['Test / laboratuvar','Son ölçüm','Önceki ölçüm*','Rapor aralığı / durum']
    widths=[CONTENT*.34,CONTENT*.20,CONTENT*.20,CONTENT*.26]
    canvas.setFillColor(PALE);canvas.roundRect(LEFT,y-22,CONTENT,22,4,fill=1,stroke=0)
    x=LEFT
    for label,width in zip(headers,widths):
        draw_text(canvas,label,x+7,y-6,width-14,7.5,True);x+=width
    y-=23
    if not rows:
        draw_text(canvas,'Seçilen dönemde geçerli, arşivlenmemiş bir tahlil kaydı yok.',LEFT+7,y-14,CONTENT-14,9,color=MUTED)
    for row in rows:
        row_height=row['_height']
        cells=row_cells(row)
        x=LEFT
        for index,(value,width) in enumerate(zip(cells,widths)):
            draw_text(canvas,value,x+7,y-5,width-14,7.5,index==1,BAD if index==3 and row['statusCode'] in ('low','high') else INK)
            x+=width
        y-=row_height;canvas.setStrokeColor(LINE);canvas.setLineWidth(.4);canvas.line(LEFT,y,RIGHT,y)
    # Fixed footnotes reserve space even when the maximum number of rows is shown.
    notices=[]
    if model['omitted']:
        notices.append(f"Özette {len(rows)}/{model['seriesCount']} seri var; {model['omitted']} seri gösterilmiyor. "+('Tam sonuçlar ekte.' if appendix else 'Tam liste için uygulamada ekli PDF seçeneğini aç.'))
    else:
        notices.append('Bu sayfa her ölçüm serisinin seçili dönemdeki son sonucunu gösterir; tam tahlil dökümü değildir.')
    if model['invalidReports']:
        notices.append(f"{model['invalidReports']} bozuk/eksik rapor analize alınmadı.")
    notices.append('* Önceki: aynı test, birim, laboratuvar, yöntem, açlık ve referans sınırlarıyla önceki farklı gün. Bilinmeyen koşullar eşitliği doğrulamaz.')
    notices.append('Aralık dışı sonuç tanı değildir; aralık içi sonuç sağlık güvencesi değildir. Klinik yorum ve laboratuvarın kritik sonuç uyarıları için hekiminle görüş.')
    foot_top=min(y-10,HEIGHT-694)
    draw_text(canvas,'\n'.join(notices),LEFT,foot_top,CONTENT,7.2,color=MUTED)
    draw_text(canvas,'Kaynak: NIH / MedlinePlus - Laboratuvar sonuçlarını anlamak',LEFT,62,CONTENT,7,color=ACCENT)
    draw_text(canvas,'Hazırlanma: '+model['generatedAt'][:19].replace('T',' ')+' UTC',LEFT,48,CONTENT,6.5,color=MUTED)
    canvas.linkURL(model['source'],(LEFT,50,RIGHT,63),relative=0)
    footer(canvas,1,model['revision']);canvas.showPage()


def render_pdf(model, include_all=False):
    model=fit_summary(model);fonts();output=BytesIO();canvas=Canvas(output,pagesize=A4,pageCompression=1)
    canvas.setTitle('Athlete Life - Kişisel sağlık özeti');canvas.setAuthor('Athlete Life')
    summary_page(canvas,model,include_all)
    if include_all and model['allRows']:
        data=[[paragraph(h,8,True) for h in ['Tarih / laboratuvar','Test / koşullar','Sonuç','Rapor aralığı / durum']]]
        fasting={'fasting':'Açlık','nonfasting':'Tokluk','unknown':'Açlık bilinmiyor'}
        for r in model['allRows']:
            data.append([paragraph(date_text(r['date'])+'\n'+r['lab'],8),
                         paragraph(r['name']+'\n'+fasting[r['fasting']]+' / '+(r['method'] or 'Yöntem bilinmiyor'),8),
                         paragraph(r['resultText']+' '+r['unit'],8,True),
                         paragraph(r['referenceText']+'\n'+r['statusLabel'],8,color=BAD if r['statusCode'] in ('high','low') else INK)])
        table=Table(data,colWidths=[CONTENT*.26,CONTENT*.32,CONTENT*.18,CONTENT*.24],repeatRows=1)
        table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),PALE),('LINEBELOW',(0,0),(-1,-1),.4,LINE),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
        page=2
        while table:
            draw_text(canvas,'TAHLİL DÖKÜMÜ / EK',LEFT,HEIGHT-38,CONTENT,12,True,ACCENT)
            draw_text(canvas,model['name']+' | '+date_text(model['from'])+' - '+date_text(model['to']),LEFT,HEIGHT-59,CONTENT,8,color=MUTED)
            parts=table.split(CONTENT,HEIGHT-116)
            if not parts:
                raise ValueError('Tahlil satırı PDF sayfasına sığmıyor.')
            part=parts[0];_,height=part.wrap(CONTENT,HEIGHT)
            part.drawOn(canvas,LEFT,HEIGHT-83-height)
            footer(canvas,page,model['revision']);canvas.showPage();page+=1
            table=parts[1] if len(parts)>1 else None
    canvas.save()
    return output.getvalue()
