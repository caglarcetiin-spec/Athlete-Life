"""First-use UI fixture: isolated synthetic DB and local EVREN substitute only."""
from tools.v2.sport_training_fixture import create as create_sport_fixture


def create():
    app = create_sport_fixture()
    app.state.settings.registration_enabled = True
    app.state.settings.email_verification_required = False
    return app
