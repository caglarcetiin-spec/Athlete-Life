/* Extensible activity taxonomy, not a claim to exhaust all world sports. */
((root)=>{
'use strict';
const families={
 strength:'Kuvvet ve fitness',endurance:'Dayanıklılık ve atletizm',water:'Su sporları',
 team:'Takım sporları',racket:'Raket sporları',combat:'Dövüş sporları',
 gymnastics:'Jimnastik ve hareket',outdoor:'Doğa ve tırmanış',winter:'Kış ve buz',
 precision:'Hedef ve hassasiyet',wheels:'Tekerlekli sporlar',equestrian:'Binicilik',
 adaptive:'Para ve uyarlanmış sporlar',mind:'Zihin ve elektronik sporlar',traditional:'Geleneksel ve diğer'
};
const schemas={
 general:{name:'Genel seans',fields:[]},
 distance:{name:'Mesafe ve süre',fields:[['distanceKm','Mesafe','km',0.001,10000],['movingMinutes','Hareket süresi','dk',0.01,1440],['elevationM','Yükselti kazanımı','m',0,20000]]},
 swimming:{name:'Yüzme mesafesi',fields:[['distanceM','Mesafe','m',1,1000000],['movingMinutes','Aktif yüzme süresi','dk',0.01,1440],['poolLengthM','Havuz uzunluğu (isteğe bağlı)','m',1,1000]]},
 attempts:{name:'Deneme ve tamamlama',fields:[['attempts','Deneme sayısı','adet',1,10000,true],['completed','Tamamlanan deneme','adet',0,10000,true]]},
 precision:{name:'Deneme ve isabet',fields:[['attempts','Deneme sayısı','adet',1,10000,true],['hits','İsabet','adet',0,10000,true]]},
 rounds:{name:'Raunt kaydı',fields:[['rounds','Çalışılan raunt','adet',1,1000,true]]},
 matches:{name:'Maç / oyun kaydı',fields:[['matches','Maç / oyun sayısı','adet',1,1000,true]]}
};
// Columns: stable id | Turkish label | family | recording schema | search aliases.
const rows=`
strength|Kuvvet antrenmanı|strength|general|strength resistance ağırlık
calisthenics|Kalistenik|strength|general|calisthenics street workout vücut ağırlığı
bodybuilding|Vücut geliştirme|strength|general|bodybuilding hipertrofi
powerlifting|Powerlifting|strength|general|üçlü kuvvet
weightlifting|Halter|strength|general|weightlifting
strongman|Strongman|strength|general|strongwoman
functional-fitness|Fonksiyonel fitness|strength|general|crossfit cross training
kettlebell|Kettlebell sporu|strength|general|girya
arm-wrestling|Bilek güreşi|strength|rounds|arm wrestling
running|Koşu|endurance|distance|running jog yol koşusu
trail-running|Patika koşusu|endurance|distance|trail ultra
track-running|Pist koşusu|endurance|distance|atletizm sprint orta uzun mesafe
race-walking|Sportif yürüyüş|endurance|distance|race walking
walking|Yürüyüş|endurance|distance|walk
road-cycling|Yol bisikleti|endurance|distance|cycling bisiklet
track-cycling|Pist bisikleti|endurance|distance|velodrom
mountain-bike|Dağ bisikleti|endurance|distance|mtb
indoor-cycling|Salon bisikleti|endurance|distance|spinning
rowing|Kürek|endurance|distance|rowing
indoor-rowing|Kürek ergometresi|endurance|distance|ergometer indoor rowing
triathlon|Triatlon|endurance|general|triathlon
duathlon|Duatlon|endurance|general|duathlon
aquathlon|Akuatlon|endurance|general|aquathlon
modern-pentathlon|Modern pentatlon|endurance|general|pentathlon
athletics-jumps|Atletizm atlamaları|endurance|attempts|uzun yüksek üç adım sırıkla atlama
athletics-throws|Atletizm atışları|endurance|attempts|cirit gülle disk çekiç
combined-athletics|Çoklu atletizm|endurance|general|dekatlon heptatlon
swimming|Havuz yüzmesi|water|swimming|swim swimming serbest sırtüstü kurbağalama kelebek yüzme
open-water|Açık su yüzmesi|water|swimming|open water deniz yüzme
artistic-swimming|Artistik yüzme|water|general|senkronize yüzme
diving|Atlama|water|attempts|diving tramplen kule
water-polo|Su topu|water|matches|water polo
canoe-sprint|Kano sprint|water|distance|canoe kayak durgunsu
canoe-slalom|Kano slalom|water|attempts|whitewater
sea-kayak|Deniz kayağı|water|distance|sea kayak
rafting|Rafting|water|general|
sailing|Yelken|water|general|sailing
windsurfing|Rüzgâr sörfü|water|general|windsurf
kitesurfing|Uçurtma sörfü|water|general|kiteboard
surfing|Dalga sörfü|water|attempts|surf
sup|Ayakta kürek|water|distance|stand up paddle sup
water-ski|Su kayağı|water|attempts|water ski
wakeboard|Wakeboard|water|attempts|
scuba|Tüplü dalış|water|general|scuba
freediving|Serbest dalış|water|general|freediving
finswimming|Paletli yüzme|water|swimming|finswimming
lifesaving|Cankurtarma sporu|water|general|lifesaving
football|Futbol|team|matches|soccer football
futsal|Futsal|team|matches|salon futbolu
beach-soccer|Plaj futbolu|team|matches|
basketball|Basketbol|team|matches|basketball
basketball-3x3|3x3 basketbol|team|matches|
volleyball|Voleybol|team|matches|volleyball
beach-volleyball|Plaj voleybolu|team|matches|
handball|Hentbol|team|matches|handball
beach-handball|Plaj hentbolu|team|matches|
rugby-union|Ragbi union|team|matches|rugby
rugby-sevens|Yedili ragbi|team|matches|sevens
rugby-league|Ragbi league|team|matches|
american-football|Amerikan futbolu|team|matches|
flag-football|Bayrak futbolu|team|matches|flag football
baseball|Beyzbol|team|matches|baseball
softball|Softbol|team|matches|softball
cricket|Kriket|team|matches|cricket
field-hockey|Çim hokeyi|team|matches|hockey
floorball|Floorball|team|matches|
lacrosse|Lakros|team|matches|lacrosse
ultimate|Ultimate frizbi|team|matches|flying disc
netball|Netbol|team|matches|netball
korfball|Korfbol|team|matches|korfball
kabaddi|Kabaddi|team|matches|
australian-football|Avustralya futbolu|team|matches|
gaelic-football|Gaelik futbol|team|matches|
hurling|Hurling|team|matches|
tennis|Tenis|racket|matches|tennis
table-tennis|Masa tenisi|racket|matches|ping pong
badminton|Badminton|racket|matches|
squash|Squash|racket|matches|
padel|Padel|racket|matches|
pickleball|Pickleball|racket|matches|
racquetball|Raketbol|racket|matches|racquetball
beach-tennis|Plaj tenisi|racket|matches|
boxing|Boks|combat|rounds|boxing
kickboxing|Kickboks|combat|rounds|
muay-thai|Muay Thai|combat|rounds|tay boksu
mma|Karma dövüş sanatları|combat|rounds|mma
judo|Judo|combat|rounds|
karate|Karate|combat|rounds|
taekwondo|Tekvando|combat|rounds|taekwondo
wrestling|Güreş|combat|rounds|serbest grekoromen wrestling
bjj|Brezilya jiu-jitsu|combat|rounds|bjj brazilian
ju-jitsu|Ju-jitsu|combat|rounds|
sambo|Sambo|combat|rounds|
wushu|Wushu|combat|rounds|kung fu
kendo|Kendo|combat|rounds|
aikido|Aikido|combat|general|
fencing|Eskrim|combat|rounds|fencing epe flöre kılıç
sumo|Sumo|combat|rounds|
capoeira|Capoeira|combat|general|
artistic-gymnastics|Artistik jimnastik|gymnastics|attempts|gymnastics
rhythmic-gymnastics|Ritmik jimnastik|gymnastics|general|
trampoline|Trampolin jimnastik|gymnastics|attempts|
acrobatics|Akrobatik jimnastik|gymnastics|attempts|
aerobic-gymnastics|Aerobik jimnastik|gymnastics|general|
parkour|Parkur|gymnastics|attempts|parkour freerunning
dance|Dans sporu|gymnastics|general|dance ballroom latin
breaking|Breaking|gymnastics|rounds|breakdance
yoga|Yoga|gymnastics|general|
pilates|Pilates|gymnastics|general|
mobility|Mobilite çalışması|gymnastics|general|esneklik stretching
cheerleading|Cheerleading|gymnastics|general|
rope-skipping|İp atlama|gymnastics|general|jump rope
sport-climbing|Sportif tırmanış|outdoor|attempts|lead speed climbing
bouldering|Bouldering|outdoor|attempts|kaya tırmanış
mountaineering|Dağcılık|outdoor|distance|alpinism
hiking|Doğa yürüyüşü|outdoor|distance|trekking hiking
orienteering|Oryantiring|outdoor|distance|orienteering
adventure-racing|Macera yarışı|outdoor|general|
ice-climbing|Buz tırmanışı|outdoor|attempts|
caving|Mağaracılık|outdoor|general|
alpine-skiing|Alp disiplini kayak|winter|general|
cross-country-ski|Kayaklı koşu|winter|distance|cross country ski
biathlon|Biatlon|winter|general|biathlon
ski-jumping|Kayakla atlama|winter|attempts|
nordic-combined|Kuzey kombine|winter|general|
freestyle-ski|Serbest stil kayak|winter|attempts|
ski-mountaineering|Dağ kayağı|winter|distance|skimo
snowboard|Snowboard|winter|general|
figure-skating|Artistik buz pateni|winter|general|
speed-skating|Sürat pateni|winter|distance|
short-track|Kısa kulvar sürat pateni|winter|distance|
ice-hockey|Buz hokeyi|winter|matches|
curling|Curling|winter|matches|
bobsleigh|Bobsled|winter|attempts|bobsleigh
luge|Kızak|winter|attempts|luge
skeleton|Skeleton|winter|attempts|
archery|Okçuluk|precision|precision|archery
shooting|Atıcılık|precision|precision|shooting
golf|Golf|precision|general|
disc-golf|Disk golf|precision|general|
darts|Dart|precision|precision|darts
billiards|Bilardo|precision|general|snooker pool karambol
bowling|Bowling|precision|general|
petanque|Petank|precision|precision|petanque
bocce|Bocce|precision|precision|
lawn-bowls|Çim topu|precision|general|lawn bowls
skateboarding|Kaykay|wheels|attempts|skateboard
roller-skating|Paten|wheels|distance|inline skating
roller-derby|Roller derby|wheels|matches|
bmx-racing|BMX yarışı|wheels|attempts|
bmx-freestyle|BMX serbest stil|wheels|attempts|
motocross|Motokros|wheels|general|motocross
motor-racing|Motor sporları|wheels|general|karting otomobil motorsport
dressage|At terbiyesi|equestrian|general|dressage
show-jumping|Binicilik engel atlama|equestrian|attempts|
eventing|Üç günlük yarışma|equestrian|general|eventing
equestrian-endurance|Atlı dayanıklılık|equestrian|distance|
vaulting|Atlı jimnastik|equestrian|general|vaulting
polo|Polo|equestrian|matches|
para-athletics|Para atletizm|adaptive|general|
para-swimming|Para yüzme|adaptive|swimming|
para-cycling|Para bisiklet|adaptive|distance|
para-rowing|Para kürek|adaptive|distance|
para-canoe|Para kano|adaptive|distance|
para-triathlon|Para triatlon|adaptive|general|
para-powerlifting|Para halter|adaptive|general|
para-climbing|Para tırmanış|adaptive|attempts|
wheelchair-basketball|Tekerlekli sandalye basketbolu|adaptive|matches|
wheelchair-rugby|Tekerlekli sandalye ragbisi|adaptive|matches|
wheelchair-tennis|Tekerlekli sandalye tenisi|adaptive|matches|
wheelchair-fencing|Tekerlekli sandalye eskrimi|adaptive|rounds|
para-badminton|Para badminton|adaptive|matches|
para-table-tennis|Para masa tenisi|adaptive|matches|
para-judo|Para judo|adaptive|rounds|
para-taekwondo|Para tekvando|adaptive|rounds|
para-archery|Para okçuluk|adaptive|precision|
para-shooting|Para atıcılık|adaptive|precision|
para-equestrian|Para binicilik|adaptive|general|
blind-football|Görme engelli futbolu|adaptive|matches|
sitting-volleyball|Oturarak voleybol|adaptive|matches|
goalball|Goalball|adaptive|matches|golbol
boccia|Boccia|adaptive|general|
para-alpine|Para alp disiplini|adaptive|general|
para-biathlon|Para biatlon|adaptive|general|
para-cross-country|Para kayaklı koşu|adaptive|distance|
para-ice-hockey|Para buz hokeyi|adaptive|matches|
para-snowboard|Para snowboard|adaptive|general|
wheelchair-curling|Tekerlekli sandalye curling|adaptive|matches|
chess|Satranç|mind|matches|chess
go|Go|mind|matches|baduk
bridge|Briç|mind|matches|bridge
esports|Elektronik sporlar|mind|matches|esport e-spor
oil-wrestling|Yağlı güreş|traditional|rounds|
mas-wrestling|Mas güreşi|traditional|rounds|
sepak-takraw|Sepak takraw|traditional|matches|
tug-of-war|Halat çekme|traditional|rounds|
boules-sports|Boules sporları|traditional|general|
underwater-hockey|Sualtı hokeyi|traditional|matches|
underwater-rugby|Sualtı ragbisi|traditional|matches|
`;
const sports=rows.trim().split('\n').map(line=>{const[id,name,family,schema,aliases]=line.split('|');return {id,name,family,schema,aliases:aliases||'',support:'record-summary'}});
const methods=[
 ['continuous','Kesintisiz çalışma','Belirli bir süre veya mesafe boyunca kesintisiz çalışma. Süre, mesafe ve hissedilen zorlukla izlenir.'],
 ['interval','Aralıklı çalışma','Çalışma bölümleri ile dinlenme bölümlerini sırayla uygular. Dönem planında çalışma ve dinlenme adımları, seans kaydında gerçekleşen turlar tutulur.'],
 ['fartlek','Fartlek','Seans içinde tempo değişimlerine yer verir. Hız değişimlerini ve parkur koşullarını not et.'],
 ['technique','Teknik çalışma','Branşa özgü bir hareketin uygulanışına odaklanır. Tekrarın yanında teknik gözlemini kaydet.'],
 ['strength-sets','Kuvvet setleri','Hareket, dış yük, set, tekrar, RIR ve dinlenme ile tanımlanır. Set hedeflerini dönem adımlarına ekleyebilir, gerçekleşenleri bağlı seansta kaydedebilirsin.'],
 ['hypertrophy','Hipertrofi odaklı çalışma','Kas gelişimi hedefli direnç çalışması. Ayrıntılı hareket ve set kayıtları mevcut Antrenman ekranında tutulur.'],
 ['circuit','İstasyon çalışması','Birden fazla hareket veya istasyon sırayla uygulanır. İstasyonları ve tur düzenini seans notuna ekle.'],
 ['isometric','İzometrik çalışma','Belirli bir pozisyonda kuvvet üretimini sürdürür. Pozisyon ve tutuş süresi kayıt bağlamıdır.'],
 ['eccentric','Eksantrik odak','Direnç hareketinin uzama evresini vurgular. Hareket, yük ve uygulama temposunu not et.'],
 ['plyometric','Pliometrik çalışma','Sıçrama, sekme veya benzeri hızlı kuvvet uygulamalarını içerir. Temas sayısı ve hareket kalitesi kayıt bağlamıdır.'],
 ['speed','Sürat çalışması','Kısa süreli hız uygulamalarına odaklanır. Mesafe, süre ve dinlenmeyi ayrı not etmek karşılaştırmayı anlamlı kılar.'],
 ['agility','Çeviklik çalışması','Yön değiştirme ve uyaranlara yanıt çalışmalarını içerir. Parkur ve kullanılan uyaranı kaydet.'],
 ['tactics','Taktik çalışma','Karar verme, takım düzeni ve oyun senaryolarına odaklanır. Sayısal sonuçlara ek olarak senaryoyu not et.'],
 ['practice-match','Antrenman maçı','Oyun veya yarışma bağlamında uygulama. Rakip, format ve koşullar karşılaştırmanın parçasıdır.'],
 ['mobility','Mobilite','Hareket açıklığı ve hareket kontrolüne odaklanır. Çalışılan bölgeyi ve gözlemini kaydet.'],
 ['balance','Denge ve koordinasyon','Pozisyon kontrolü ve hareketler arası uyumu çalışır. Destek, yüzey ve kullanılan görevi not et.'],
 ['skill-progression','Beceri basamakları','Bir beceriyi daha küçük varyasyonlarla izler. Varyasyonu değiştirdiğinde karşılaştırma bağlamı da değişir.'],
 ['easy-session','Hafif seans','Kullanıcının hafif olarak sınıfladığı seans. Bu etiket gerçek toparlanma veya biyolojik iyileşme ölçümü değildir.']
].map(([id,name,description])=>({id,name,description}));
const goals={consistency:'Düzenli hareket',strength:'Kuvvet',endurance:'Dayanıklılık',skill:'Teknik / beceri',hypertrophy:'Kas gelişimi',competition:'Yarışma / müsabaka',hybrid:'Çok yönlü performans',enjoyment:'Keyif ve sosyal katılım'};
const equipment={bodyweight:'Vücut ağırlığı',dumbbells:'Dambıl',barbell:'Bar ve ağırlıklar',pullup:'Barfiks demiri',rings:'Halka',bands:'Direnç bandı',gym:'Spor salonu',pool:'Havuz',bike:'Bisiklet',racket:'Raket',court:'Saha / kort',track:'Pist / parkur',mat:'Minder',adaptive:'Uyarlanmış ekipman',other:'Diğer branş ekipmanı'};
const experience={new:'Yeni başlıyorum',returning:'Ara verdim, dönüyorum',regular:'Düzenli yapıyorum',competitive:'Yarışma / müsabaka deneyimim var'};
const normalize=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
function all(custom=[]){return [...sports,...(Array.isArray(custom)?custom:[]).filter(x=>x&&typeof x.name==='string'&&String(x.id).startsWith('custom:')&&Object.hasOwn(families,x.family)&&Object.hasOwn(schemas,x.schema))];}
function find(id,custom=[]){return all(custom).find(x=>x.id===id)||null;}
function search(query='',family='',custom=[]){const words=normalize(query).split(/\s+/).filter(Boolean);return all(custom).filter(s=>(!family||s.family===family)&&words.every(w=>normalize(s.name+' '+s.aliases+' '+families[s.family]).includes(w)));}
const api={version:1,families,schemas,sports,methods,goals,equipment,experience,all,find,search,normalize,
 support:'Branşa uygun ölçüm alanları, koşulları eşleşen karşılaştırmalar ve kaynaklı plan incelemesi. Programı kullanıcı oluşturur; genel bir başarı veya sakatlık puanı üretilmez.',
 sources:[{title:'IPC spor dizini',url:'https://www.paralympic.org/sports'},{title:'ARISF federasyon dizini',url:'https://arisf.sport/'},{title:'IOC kış disiplinleri',url:'https://support.olympics.com/hc/en-gb/articles/43002667811219-What-sports-are-in-the-Olympic-Winter-Games-Milano-Cortina-2026'}]};
root.SportCatalog=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
