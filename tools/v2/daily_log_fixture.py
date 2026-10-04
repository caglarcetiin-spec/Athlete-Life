"""Synthetic narrative transport on a guarded disposable database."""

from alos import daily_log as d

from tools.v2.sport_training_fixture import create as base_create


def create():
    app = base_create()

    def extract(_settings, data):
        return d.Extraction(
            entries=[
                d.Entry(
                    kind="water",
                    quote="2,5 litre su",
                    amount=2.5,
                    unit="l",
                    scope="total" if len(data.messages) > 1 else "unknown",
                ),
                d.Entry(kind="meal", quote="Pilav yedim", name="Pilav"),
                d.Entry(
                    kind="sleep", quote="02:00–07:00 uyudum", start="02:00", end="07:00"
                ),
                d.Entry(
                    kind="work",
                    commute_min=0,
                    prep_min=0,
                    quote="10:00 işe başladım 8 saat çalıştım; ulaşım 0 dk hazırlık 0 dk",
                    start="10:00",
                    amount=8,
                    unit="h",
                ),
                d.Entry(
                    kind="workout",
                    quote="30 dk kalistenik; 3 set 5 tekrar pushup yaptım",
                    name="Kalistenik",
                    amount=30,
                    unit="min",
                    movements=[
                        d.Movement(
                            name="pushup",
                            quote="3 set 5 tekrar pushup yaptım",
                            sets=3,
                            reps=5,
                        )
                    ],
                ),
            ],
            questions=[] if len(data.messages) > 1 else ["Su günün toplamı mı, ek mi?"],
        )

    d.extract = extract
    return app
