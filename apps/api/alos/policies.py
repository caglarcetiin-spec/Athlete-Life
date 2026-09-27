"""Approval boundary: no runtime switch can claim clinical review occurred."""

POLICIES = {
    "clinical_dose": {
        "version": "clinical-dose-disabled-1",
        "enabled": False,
        "approval": None,
        "reason": "Uzman incelemesi tamamlanmadı; sağlık kaydından sayısal egzersiz değişikliği üretilmez.",
    },
    "progression": {
        "version": "progression-review-2",
        "enabled": False,
        "approval": None,
        "reason": "Yük artış adımı ve uygunluk politikası onaylanmadı; sayısal artış kapalı, manuel plan düzenlenebilir.",
    },
}
