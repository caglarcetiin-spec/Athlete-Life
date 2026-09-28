from fastapi.testclient import TestClient


def test_password_only_signup_is_explicit_and_reversible(app):
    app.state.settings.registration_enabled = True
    app.state.settings.email_verification_required = False
    with TestClient(app, headers={"Origin": "http://testserver"}) as client:
        assert client.get('/api/v2/auth/config').json()['email_verification_required'] is False
        body = {'username':'new-athlete','name':'Synthetic','password':'test-password-123'}
        response = client.post('/api/v2/auth/signup', json=body)
        assert response.status_code == 201
        assert response.json()['registration_email_verified'] is False
        assert client.post('/api/v2/auth/signup', json=body).status_code == 409
        assert client.post('/api/v2/auth/login', json={k:body[k] for k in ('username','password')}).status_code == 200
        assert client.get('/api/v2/auth/me').json()['is_admin'] is False
        app.state.settings.email_verification_required = True
        assert client.post('/api/v2/auth/signup', json=body | {'username':'another-user'}).status_code == 503


def test_closed_registration_still_denied(app):
    app.state.settings.email_verification_required = False
    with TestClient(app, headers={"Origin":"http://testserver"}) as client:
        assert client.post('/api/v2/auth/signup', json={'username':'new-athlete','name':'Synthetic','password':'test-password-123'}).status_code == 403
