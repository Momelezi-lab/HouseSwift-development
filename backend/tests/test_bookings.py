import os
import json
import tempfile

import pytest
import sys
import os

# Ensure the backend package/module is importable when tests run from the repo root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db, Booking, ServiceProvider


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Use a temporary SQLite database for tests
    db_file = tmp_path / "test_db.sqlite"
    monkeypatch.setenv('DATABASE_URL', f'sqlite:///{db_file}')

    # Disable email sending by unsetting EMAIL_HOST
    monkeypatch.delenv('EMAIL_HOST', raising=False)

    app.config['TESTING'] = True
    with app.app_context():
        db.create_all()

    with app.test_client() as client:
        yield client

    # Teardown
    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_create_booking_and_assign_provider(client):
    # Create a provider to assign
    prov_payload = {
        'name': 'Test Provider',
        'service_type': 'Mechanic',
        'phone': '+27123456789',
        'email': 'prov@example.com'
    }
    rv = client.post('/api/providers', json=prov_payload)
    assert rv.status_code == 201
    prov = rv.get_json()['provider']

    # Create a booking
    booking_payload = {
        'name': 'Alice',
        'email': 'alice@example.com',
        'phone': '+27110000000',
        'address': '123 Test St, Johannesburg',
        'date': '2025-12-01',
        'time': '10:00',
        'service': 'Mechanic Service',
        'details': 'Engine noise',
        'status': 'pending'
    }
    rv = client.post('/api/bookings', json=booking_payload)
    assert rv.status_code == 201
    resp = rv.get_json()
    booking = resp['booking']
    assert booking['name'] == 'Alice'
    booking_id = booking['id']

    # Assign provider
    assign_payload = {
        'provider_id': prov['id'],
        'priority_level': 'high',
        'estimated_price': 500.0,
        'email': booking_payload['email']  # customer email for notification
    }
    rv = client.post(f'/api/bookings/{booking_id}/assign', json=assign_payload)
    assert rv.status_code == 200
    resp = rv.get_json()
    updated = resp['booking']
    assert updated['assigned_provider_id'] == prov['id']
    assert updated['provider_name'] == prov['name']
    assert updated['status'] == 'confirmed'
