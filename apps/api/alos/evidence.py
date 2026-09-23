"""Versioned product rules with deliberately separate literature/review status."""

from datetime import date
from typing import Literal

from pydantic import Field, HttpUrl

from .contracts import StrictModel


class EvidenceRule(StrictModel):
    id: str
    version: int = 1
    status: Literal["reviewed", "provisional", "heuristic", "deprecated"]
    title: str
    authors_year: str
    url: HttpUrl | None = None
    doi: str | None = None
    pmid: str | None = None
    accessed_on: date | None = None
    access_scope: str
    population: str
    experience: str
    outcome: str
    evidence_type: str
    limitation: str
    product_parameter: str
    human_review: str = "Spor bilimi uzmanı incelemesi bekleniyor"
    interpretation: str = Field(max_length=1500)


RULES = [
    EvidenceRule(
        id="progressive-resistance",
        status="provisional",
        title="Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews",
        authors_year="Currier ve ark., ACSM 2026",
        url="https://pubmed.ncbi.nlm.nih.gov/41843416/",
        doi="10.1249/MSS.0000000000003897",
        pmid="41843416",
        accessed_on=date(2026, 9, 17),
        access_scope="Başlık, DOI ve PubMed özeti doğrulandı; tam metin erişimi CAPTCHA ile engellendi.",
        population="Sağlıklı yetişkinler, 18 yaş ve üzeri",
        experience="Derlemelerde farklı antrenman geçmişleri; ileri ring sporcusuna özgü değil",
        outcome="Kuvvet, hipertrofi ve fiziksel performans",
        evidence_type="Sistematik derlemelerin meslek kuruluşu bildirisi",
        limitation="Kişisel yük, beceri yeterliği veya toparlanma yarılanma süresi sağlamaz.",
        product_parameter="starter-heuristic-1; progression-advice-1",
        interpretation="Düzenli progresif direnç çalışması için genel dayanak. Başlangıç taslağındaki sayılar kişisel doğrulama almış reçete değildir.",
    ),
    EvidenceRule(
        id="cycle-individual",
        status="provisional",
        title="The Effects of Menstrual Cycle Phase on Exercise Performance in Eumenorrheic Women: A Systematic Review and Meta-Analysis",
        authors_year="McNulty ve ark., 2020",
        url="https://pmc.ncbi.nlm.nih.gov/articles/PMC7497427/",
        doi="10.1007/s40279-020-01319-3",
        pmid="32661839",
        accessed_on=date(2026, 9, 17),
        access_scope="Özet, popülasyon ve sonuç bölümleri incelendi; bağımsız uzman incelemesi yok.",
        population="18–40 yaş, ömenoreik, hormonal kontraseptif kullanmayan sağlıklı kadınlar",
        experience="Aktivite geçmişi için kısıtlama yok",
        outcome="Egzersiz performansı; doğrudan kas büyümesi değil",
        evidence_type="Sistematik derleme ve meta-analiz",
        limitation="Çalışmalar arası farklılık ve düşük kanıt kalitesi; diğer fizyolojik durumlara doğrudan genellenmez.",
        product_parameter="cycle-phase-multiplier=null",
        interpretation="Döngü fazından otomatik performans cezası veya kas gelişimi yüzdesi üretilmez. Kişinin bildirdiği belirtiler ayrı izlenir.",
    ),
    EvidenceRule(
        id="session-rpe",
        status="provisional",
        title="A new approach to monitoring exercise training",
        authors_year="Foster ve ark., 2001",
        url="https://pubmed.ncbi.nlm.nih.gov/11708692/",
        pmid="11708692",
        accessed_on=date(2026, 9, 17),
        access_scope="PubMed bibliyografisi ve özet incelendi; tam metin incelenmedi.",
        population="Bisiklet egzersizi ve basketbol katılımcıları",
        experience="Özet bireysel antrenman geçmişini yeterince ayrıntılandırmıyor",
        outcome="Öz-bildirimle antrenman yükü; doku hasarı değil",
        evidence_type="Karşılaştırmalı araştırma",
        limitation="Kalp hızı yönteminden mutlak değerleri farklı; her modalite eşdeğer sayılmaz.",
        product_parameter="actual-event duration_minutes × reported_rpe",
        interpretation="Süre ve efor mevcutsa öz-bildirim yükü ayrı bir keyfi birimle gösterilir. Sprinti hipertrofi setine dönüştürmez.",
    ),
    EvidenceRule(
        id="lab-reference",
        status="provisional",
        title="How to Understand Your Lab Results",
        authors_year="U.S. National Library of Medicine, MedlinePlus",
        url="https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/",
        accessed_on=date(2026, 9, 17),
        access_scope="Referans aralığı, birim ve yorumlama bölümleri incelendi.",
        population="Laboratuvar sonucu alan kişiler",
        experience="Uygulanamaz",
        outcome="Sonuçların bağlam içinde anlaşılması",
        evidence_type="Resmî sağlık bilgilendirmesi",
        limitation="Tanı rehberi veya herkes için tek referans aralığı değildir.",
        product_parameter="lab own-reference flag; same lab/method/unit trend grouping",
        interpretation="Yalnız kullanıcının raporundaki referans sınırları karşılaştırılır. Farklı birim, yöntem veya laboratuvar sonuçları aynı seriye karıştırılmaz.",
    ),
    EvidenceRule(
        id="illness-return",
        status="provisional",
        title="International Olympic Committee consensus statement on acute respiratory illness in athletes part 1: acute respiratory infections",
        authors_year="IOC uzman grubu, 2022",
        url="https://pubmed.ncbi.nlm.nih.gov/35863871/",
        doi="10.1136/bjsports-2022-105759",
        pmid="35863871",
        accessed_on=date(2026, 9, 17),
        access_scope="Bibliyografik eşleşme doğrulandı; yayıncı tam metnine erişilemedi.",
        population="Akut solunum yolu enfeksiyonu yaşayan sporcular",
        experience="Çeşitli sporcular",
        outcome="Hastalık değerlendirmesi ve spora dönüş",
        evidence_type="Uzman konsensüsü",
        limitation="Burada doğrulanmış bireysel dönüş protokolü veya yüzde azaltma kuralı olarak uygulanmaz.",
        product_parameter="illness caution prompt; no fixed return percentage",
        interpretation="Rahatsızlık ve toparlanma kaydı görünür bir uyarı üretir. Program otomatik ağırlaştırılmaz; dönüş uygunluğu klinik değerlendirme gerektirebilir.",
    ),
    EvidenceRule(
        id="exposure-decay",
        status="heuristic",
        title="Athlete Life residual exposure model",
        authors_year="Athlete Life mühendislik modeli, 2026",
        access_scope="Kaynak kodu ve yazılım özellik testleri",
        population="Kullanıcı kayıtları; biyolojik doğrulama kohortu yok",
        experience="Kişiye kalibre edilmemiş",
        outcome="Kaydedilmiş maruziyetin zamana göre azalan temsili",
        evidence_type="Ürün varsayımı",
        limitation="Gerçek kas hasarı, güvenli antrenman garantisi, klinik olasılık veya kesin iyileşme saati değildir.",
        product_parameter="exposure-1; strength36h, isometric36h, skill24h, cardio24h, circuit30h",
        interpretation="Hareket-kas katsayıları ve yarılanma süreleri ürün varsayımıdır. Modaliteler ve birimleri ayrı tutulur; bilinmeyen hareket yükü kaybolmaz, eşleştirilmemiş olarak görünür.",
    ),
]
REGISTRY = {r.id: r for r in RULES}
