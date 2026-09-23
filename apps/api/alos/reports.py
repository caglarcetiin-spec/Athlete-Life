"""Owner-scoped, printable summaries. The JSON backup remains the full data export."""

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_pdf(snapshot, result, name):
    font_dir = Path(__file__).parent / "fonts"
    for name_, file in [("ALOS", "LiberationSans-Regular.ttf"), ("ALOSBold", "LiberationSans-Bold.ttf")]:
        if name_ not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(name_, str(font_dir / file)))
    ink = colors.HexColor("#203d36")
    muted = colors.HexColor("#596960")
    tint = colors.HexColor("#e9eee6")
    styles = {
        "title": ParagraphStyle(
            "title", fontName="ALOSBold", fontSize=26, leading=31, textColor=ink, spaceAfter=16
        ),
        "h": ParagraphStyle(
            "h", fontName="ALOSBold", fontSize=14, leading=19, textColor=ink, spaceBefore=20, spaceAfter=9
        ),
        "body": ParagraphStyle(
            "body", fontName="ALOS", fontSize=10, leading=15, textColor=muted, spaceAfter=7
        ),
        "cell": ParagraphStyle("cell", fontName="ALOS", fontSize=8, leading=11, textColor=ink),
        "small": ParagraphStyle("small", fontName="ALOS", fontSize=8, leading=12, textColor=muted),
    }

    def p(text, style="body"):
        return Paragraph(escape(str("Belirtilmedi" if text is None or text == "" else text)), styles[style])

    flow = [
        p("ATHLETE LIFE / KİŞİSEL RAPOR", "small"),
        Spacer(1, 15),
        p("Kendi ritminde ilerle.", "title"),
        p(name),
        p(result["window"]["from"] + " - " + result["window"]["to"]),
        p("Hesap zamanı: " + result["as_of"] + " / Model: " + result["model_version"], "small"),
        p(result["notice"]),
    ]

    def table(headers, rows, widths=None):
        t = Table(
            [[p(v, "cell") for v in headers]]
            + [[p("Bilgi yok" if v is None else v, "cell") for v in row] for row in rows],
            colWidths=widths,
            repeatRows=1,
            hAlign="LEFT",
        )
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), tint),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor("#bcc7bb")),
                    ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#dce0d8")),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        flow.append(t)

    flow.append(p("01 / Durum ve veri kapsamı", "h"))
    for reason in result["readiness"]["reasons"]:
        flow.append(p(reason))
    flow.append(
        p(
            "Eksik bilgiler: "
            + (
                ", ".join(result["coverage"]["missing"])
                or "Listelenmiş eksik yok; bu, biyolojik doğrulama anlamına gelmez."
            )
        )
    )
    flow.append(p("02 / Gerçek antrenman kayıtları", "h"))
    table(
        ["Tarih", "Kuvvet seti", "Sabit tutuş (sn)", "Kardiyo (sn)", "Mesafe (m)"],
        [
            [r["date"], r["strength_sets"], r["isometric_seconds"], r["cardio_seconds"], r["distance_m"]]
            for r in result["timeline"]
        ],
        [90, 95, 105, 105, 100],
    )
    flow.append(p("03 / Hedefler", "h"))
    table(
        ["Hedef", "Son kayıt", "Hedef değer", "İlerleme"],
        [
            [
                g["title"],
                str(g["latest"]["value"]) + " " + g["unit"],
                str(g["target"]) + " " + g["unit"],
                "Ölçüm yok"
                if g["progress"] is None
                else str(round(g["progress"], 1)) + " % (hedef farkına göre)",
            ]
            for g in result["goals"]
        ],
        [160, 110, 110, 115],
    )
    flow.append(p("04 / Beslenme ve uyku", "h"))
    n = result["nutrition"]
    table(
        ["Seçili günün kapsamı", "Enerji (kcal)", "Protein (g)", "Su (ml)"],
        [
            [
                {"not_logged": "Kayıt yok", "partial": "Kısmi günlük", "complete": "Tamamlandı"}[n["status"]],
                n["totals"]["kcal"],
                n["totals"]["protein_g"],
                n["water_ml"],
            ]
        ],
        [165, 110, 110, 110],
    )
    flow.append(
        p(
            "Kaydedilmiş son iki gündeki uyku aralıkları: "
            + str(result["readiness"]["sleep_hours_in_recorded_intervals"] or "Bilgi yok")
            + " saat. Eksik beslenme günü sıfır tüketim değildir."
        )
    )
    labs = [
        r
        for r in snapshot.get("labs", [])
        if not r.get("deleted_at") and result["window"]["from"] <= r["local_date"] <= result["window"]["to"]
    ]
    flow.append(p("05 / Laboratuvar kayıtları", "h"))
    table(
        ["Tarih / test", "Sonuç / birim", "Rapordaki sınırlar", "Laboratuvar / yöntem"],
        [
            [
                r["local_date"] + " / " + r["analyte"],
                str(r.get("comparator", "=")) + " " + str(r["value"]) + " " + r["unit"],
                str(r["reference_low"]) + " - " + str(r["reference_high"]),
                r["laboratory"] + " / " + r["method"],
            ]
            for r in labs
        ],
        [150, 100, 105, 140],
    )
    flow.append(
        p(
            "Referans aralığı dışındaki sonuç tek başına tanı değildir. Birim, laboratuvar ve yöntem farklıysa doğrudan karşılaştırma yapılmaz."
        )
    )
    flow.append(p("06 / Kaynaklar ve hesap sınırları", "h"))
    from .evidence import REGISTRY

    for rule_id in result["evidence_ids"]:
        rule = REGISTRY[rule_id]
        flow.extend(
            [
                p(rule.title, "small"),
                p(str(rule.url or "Ürün varsayımı; harici biyolojik doğrulama yok."), "small"),
            ]
        )
    flow.append(
        p(
            "Bu belge okunabilir bir özet rapordur; tam JSON yedeğinin yerine geçmez. Ham kayıtlar, geçmiş sürümler ve medya tam yedekte bulunur.",
            "small",
        )
    )
    output = BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=50,
        rightMargin=50,
        topMargin=44,
        bottomMargin=47,
        title="Athlete Life kişisel rapor",
        author="Athlete Life",
    )

    def footer(canvas, doc):
        canvas.setStrokeColor(colors.HexColor("#dce0d8"))
        canvas.line(50, 34, 545, 34)
        canvas.setFont("ALOS", 8)
        canvas.setFillColor(muted)
        canvas.drawString(50, 21, "ATHLETE LIFE  |  Kişisel kayıt özeti")
        canvas.drawRightString(545, 21, str(doc.page))

    doc.build(flow, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
