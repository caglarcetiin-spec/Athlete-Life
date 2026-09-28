"""Synthetic chat/planner transport; only the guarded disposable browser database."""
from alos import ai_chat
from tools.v2.sport_training_fixture import create as base_create


def create():
    app = base_create()
    def respond(_settings, _data):
        return {"text": "Pazartesi ve çarşamba: halka çekişi ve şınav. Önce kontrollü teknik, sonra kuvvet. Her hareket 3 set, 6 tekrar; arada 90 saniye dinlenme. Sentetik sohbet programı."}
    ai_chat.respond = respond
    return app
