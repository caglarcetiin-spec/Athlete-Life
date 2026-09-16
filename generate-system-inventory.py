"""Generate a source-linked inventory; never read credentials or athlete data."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent

class Controls(HTMLParser):
    def __init__(self):
        super().__init__(); self.controls=[]; self.page='shared'; self.select=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='section' and 'page' in a.get('class','').split():self.page=a.get('id',self.page)
        if tag in ('input','select','textarea') and a.get('id'):
            row={'page':self.page,'id':a['id'],'type':a.get('type',tag),
                 'min':a.get('min',''),'max':a.get('max',''),'step':a.get('step',''),
                 'default':a.get('value',''),'options':[]}
            self.controls.append(row)
            if tag=='select':self.select=row
        if tag=='option' and self.select is not None:self.select['options'].append(a.get('value','(etiket değeri)'))
    def handle_endtag(self,tag):
        if tag=='select':self.select=None

def clean(value):return str(value).replace('|',' / ').replace('\n',' ')
def main():
    html=(ROOT/'index.html').read_text();parser=Controls();parser.feed(html)
    scripts=re.findall(r'<script src="([^"?]+)',html)
    lines=['# Motor ve çalışma parametreleri envanteri','',
           'Kaynak taraması: 16 Eylül 2026. Bu dosya kişisel kayıt veya bağlantı sırrı içermez.',
           'Sayfa alanları, kalıcı ayar anahtarları, yüklenen modüller ve model kural dosyaları aşağıdadır. Sayısal model katsayılarının tam tanımları bağlantı verilen kaynak dosyalarındadır; bu envanter klinik geçerlilik değerlendirmesi değildir.','',
           f'## Yüklenen {len(scripts)} JavaScript modülü','',
           '| Sıra | Modül | Dışa açılan isimler | Tanımlı fonksiyonlar |','|---|---|---|---|']
    settings={}
    for i,name in enumerate(scripts,1):
        source=(ROOT/name).read_text()
        exports=sorted(set(re.findall(r'window\.([\w]+)\s*=',source)))
        functions=sorted(set(re.findall(r'function\s+(\w+)\s*\(',source)))
        lines.append(f'| {i} | [{name}]({name}) | {clean(", ".join(exports))} | {clean(", ".join(functions))} |')
        for match in re.finditer(r'(?:db|d)\.settings\??\.([\w]+)',source):settings.setdefault(match[1],set()).add(name)
    lines+=['','## Kalıcı ayar anahtarları','', '| Ayar | Okuyan / yazan kaynak |','|---|---|']
    for name,sources in sorted(settings.items()):lines.append(f'| `{name}` | '+', '.join(f'[{s}]({s})' for s in sorted(sources))+' |')
    lines+=['','## Arayüzdeki çalışma parametreleri','',
            'Başlangıç değerleri HTML tanımlarıdır; saklanan kullanıcı değerleri ve hesaplanan öneriler açılışta bunların yerine geçebilir. Dinamik seçenekler ilgili modüllerden yüklenir.','',
            '| Sayfa | Alan | Tür | Alt / üst / adım | HTML başlangıcı | Seçenekler |','|---|---|---|---|---|---|']
    for c in parser.controls:lines.append('| '+ ' | '.join(clean(v) for v in (c['page'],c['id'],c['type'],f"{c['min']} / {c['max']} / {c['step']}",c['default'],', '.join(c['options'])))+' |')
    lines+=['','## Kural, kanıt ve katalog dosyaları','', '| Dosya | Üst düzey alanlar |','|---|---|']
    for p in sorted(ROOT.glob('*.json')):
        if p.name=='manifest.json':continue
        data=json.loads(p.read_text());keys=', '.join(data.keys()) if isinstance(data,dict) else f'{len(data)} kayıt'
        lines.append(f'| [{p.name}]({p.name}) | {clean(keys)} |')
    lines+=['','## Sunucu parametreleri','',
            '| Parametre | Davranış |','|---|---|',
            '| STORAGE_BACKEND | sqlite veya mongodb; hata halinde otomatik depo değişimi yok |',
            '| MONGODB_URI | Yerel `.env` / ortam değişkeninde bağlantı sırrı |',
            '| MONGODB_DATABASE | MongoDB veritabanı adı |',
            '| PORT | Varsayılan 10000 |',
            '| ATHLETE_LIFE_OS_DATA_DIR | SQLite veri klasörü |',
            '| MongoDB bağlantısı | Seçim 20 sn, bağlantı 10 sn, soket 15 sn; majority yazma onayı |',
            '| Snapshot saklama | Son 250 revizyon; liste API’si son 50; SHA-256 doğrulama |',
            '| MongoDB belge sınırı | 16 MiB; durum tek snapshot olarak tutulur |','']
    (ROOT/'SYSTEM_PARAMETER_INVENTORY.md').write_text('\n'.join(lines))
    print(f'Inventory generated: {len(scripts)} modules, {len(parser.controls)} controls, {len(settings)} settings.')

if __name__=='__main__':main()
