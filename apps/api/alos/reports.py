"""Owner-scoped, printable summaries. The JSON backup remains the full data export."""

from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import CondPageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .brand import BRAND
from .errors import DomainError


def report_sections(snapshot, result, selection="training,nutrition"):
    chosen = set(selection.split(","))
    if not chosen or not chosen <= {"training", "nutrition", "health"}:
        raise DomainError("report_scope", "Rapor içeriği seçimini kontrol et.")
    sections = []
    if "training" in chosen:
        sections.append(
            {
                "title": "Antrenman kayıtları",
                "headers": ["Tarih", "Kuvvet seti", "Sabit tutuş (sn)", "Kardiyo (sn)", "Mesafe (m)"],
                "rows": [
                    [
                        r["date"],
                        r["strength_sets"],
                        r["isometric_seconds"],
                        r["cardio_seconds"],
                        r["distance_m"],
                    ]
                    for r in result["timeline"]
                ],
                "notes": [
                    "Planlanan set gerçekleşmiş set değildir. Kas dağılımı katalog varsayımıdır; gelişim veya hasar ölçümü değildir.",
                    f"Analiz edilen / kayıtlı: {result['coverage'].get('analyzed_sets', 'Bilgi yok')} / {result['coverage'].get('total_sets', 'Bilgi yok')}",
                ],
            }
        )
        sections.append(
            {
                "title": "Hedef çizgileri",
                "headers": ["Hedef", "Son kayıt", "Amaç", "İlerleme"],
                "rows": [
                    [
                        g["title"],
                        str(g["latest"]["value"]) + " " + g["unit"],
                        g["target"],
                        "Ölçüm yok" if g["progress"] is None else str(round(g["progress"], 1)) + " %",
                    ]
                    for g in result["goals"]
                ],
                "notes": ["Doğrusal hedef yüzdesi biyolojik tahmin değildir."],
            }
        )
    if "training" in chosen:
        sets = [
            r
            for r in result.get("report_records", {}).get("sets", [])
            if not r.get("deleted_at")
            and r.get("status") != "skipped"
            and result["window"]["from"] <= r.get("local_date", "") <= result["window"]["to"]
        ]
        sections.append(
            {
                "title": "Gerçek set ayrıntıları",
                "headers": ["Tarih", "Hareket / tür", "Gerçek miktar", "Harici yük", "Bildirilen efor"],
                "rows": [
                    [
                        r["local_date"],
                        r["name"]
                        + " / "
                        + {"working": "Çalışma", "warmup": "Isınma"}.get(r.get("set_kind"), "Belirtilmemiş"),
                        " · ".join(
                            str(r[k]) + " " + unit
                            for k, unit in (("reps", "tekrar"), ("seconds", "sn"), ("distance_m", "m"))
                            if r.get(k) is not None
                        )
                        or None,
                        str(r["external_kg"]) + " kg" if r.get("external_kg") is not None else None,
                        " · ".join(
                            label + " " + str(r[k])
                            for k, label in (("rir", "RIR"), ("rpe", "RPE"))
                            if r.get(k) is not None
                        )
                        or None,
                    ]
                    for r in sets
                ],
                "notes": ["Yalnız gerçekleşmiş setler. Serbest sağlık notları bu tabloya eklenmez."]
                + (
                    []
                    if sets or result["coverage"].get("total_sets", 0) == 0
                    else ["Bu eski karar ayrıntılı set anlık görüntüsü içermiyor; toplamlar korunur."]
                ),
            }
        )
    if "nutrition" in chosen:
        n = result["nutrition"]
        sections.append(
            {
                "title": "Seçili günün kaydedilen beslenmesi",
                "headers": ["Enerji (kcal)", "Protein (g)", "Karbonhidrat (g)", "Yağ (g)", "Su (ml)"],
                "rows": [
                    [
                        n["totals"]["kcal"],
                        n["totals"]["protein_g"],
                        n["totals"]["carbs_g"],
                        n["totals"]["fat_g"],
                        n["water_ml"],
                    ]
                ],
                "notes": [
                    "Bilinen toplamlar; tam günlük alım veya yeterlilik değildir.",
                    "Protein bilgisi eksik öğün: "
                    + str(n.get("missing_counts", {}).get("protein_g", "Bilgi yok")),
                ],
            }
        )
    if "health" in chosen:
        labs = [
            r
            for r in snapshot.get("labs", [])
            if not r.get("deleted_at")
            and result["window"]["from"] <= r["local_date"] <= result["window"]["to"]
        ]
        pain_notes = [
            r["area"] + ": " + str(r["intensity"]) + "/10 · " + str(r.get("note", ""))
            for r in snapshot.get("pains", [])
            if not r.get("deleted_at")
            and result["window"]["from"] <= r["local_date"] <= result["window"]["to"]
        ]
        sections.append(
            {
                "title": "Seçtiğin sağlık kayıtları",
                "headers": ["Tarih / test", "Sonuç / birim", "Referans", "Laboratuvar / yöntem"],
                "rows": [
                    [
                        r["local_date"] + " / " + r["analyte"],
                        str(r.get("comparator", "=")) + " " + str(r["value"]) + " " + r["unit"],
                        str(r["reference_low"]) + " - " + str(r["reference_high"]),
                        r["laboratory"] + " / " + r["method"],
                    ]
                    for r in labs
                ],
                "notes": (
                    [
                        "Bu eski karar sürümünde ayrıntılı sağlık kayıtları saklanmamış; güncel kayıtlar geçmiş kararın yerine konulmadı."
                    ]
                    if not snapshot and "report_records" not in result
                    else []
                )
                + list(result["readiness"]["reasons"])
                + pain_notes
                + [
                    "Referans dışında olmak tek başına tanı değildir. Farklı birim ve yöntemler birleştirilmez."
                ],
            }
        )
    return {
        "name": BRAND["name"],
        "tagline": BRAND["tagline"],
        "window": result["window"],
        "as_of": result["as_of"],
        "input_digest": result["input_digest"],
        "catalog_version": result.get("catalog_version"),
        "model_version": result["model_version"],
        "selection": sorted(chosen),
        "sections": sections,
    }


def build_pdf(snapshot, result, name, selection="training,nutrition"):
    report = report_sections(snapshot, result, selection)
    font_dir = Path(__file__).parent / "fonts"
    for name_, file in [("ALOS", "LiberationSans-Regular.ttf"), ("ALOSBold", "LiberationSans-Bold.ttf")]:
        if name_ not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(name_, str(font_dir / file)))
    ink = colors.HexColor(BRAND["theme"]["text"])
    muted = colors.HexColor("#596960")
    tint = colors.HexColor("#e9eee6")
    styles = {
        "title": ParagraphStyle(
            "title", fontName="ALOSBold", fontSize=26, leading=31, textColor=ink, spaceAfter=16
        ),
        "h": ParagraphStyle(
            "h",
            fontName="ALOSBold",
            fontSize=14,
            leading=19,
            textColor=ink,
            spaceBefore=20,
            spaceAfter=9,
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
        p(BRAND["name"] + " / KİŞİSEL RAPOR", "small"),
        Spacer(1, 15),
        p(BRAND["tagline"], "title"),
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
        return t

    for section in report["sections"]:
        widths = (
            [225, 90, 90, 90]
            if section["title"] == "Hedef çizgileri"
            else [495 / len(section["headers"])] * len(section["headers"])
        )
        section_table = table(section["headers"], section["rows"], widths)
        section_table.wrap(495, 10000)
        # Keep only the heading + header + first data row together, not the
        # entire potentially multi-page table.
        flow.append(CondPageBreak(sum(section_table._rowHeights[:2]) + 50))
        flow.append(p(section["title"], "h"))
        flow.append(section_table)
        flow.append(Spacer(1, 6))
        for note in section["notes"]:
            flow.append(p(note))
    flow.append(CondPageBreak(220))
    flow.append(p("Kaynaklar ve hesap sınırları", "h"))
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
        title=BRAND["name"] + " kişisel rapor",
        author=BRAND["name"],
    )

    def footer(canvas, doc):
        canvas.setStrokeColor(colors.HexColor("#dce0d8"))
        canvas.line(50, 34, 545, 34)
        canvas.setFont("ALOS", 8)
        canvas.setFillColor(muted)
        canvas.drawString(50, 21, BRAND["name"] + "  |  Kişisel kayıt özeti")
        canvas.drawRightString(545, 21, str(doc.page))

    doc.build(flow, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
