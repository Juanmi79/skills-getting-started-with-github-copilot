import copy
import urllib.parse

from fastapi.testclient import TestClient

from src.app import app, activities


import pytest


@pytest.fixture(autouse=True)
def client_and_db():
    # backup global in-memory activities and provide a TestClient
    backup = copy.deepcopy(activities)
    client = TestClient(app)
    yield client
    # restore global state to avoid cross-test pollution
    activities.clear()
    activities.update(backup)


def test_get_activities(client_and_db):
    client = client_and_db
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # basic sanity: known activity present
    assert "Chess Club" in data


def test_signup_adds_participant(client_and_db):
    client = client_and_db
    activity = "Chess Club"
    email = "test_signup_user@example.com"

    # ensure not present
    assert email not in activities[activity]["participants"]

    path = urllib.parse.quote(activity, safe="")
    resp = client.post(f"/activities/{path}/signup", params={"email": email})
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]


def test_delete_removes_participant(client_and_db):
    client = client_and_db
    activity = "Chess Club"
    email = "test_delete_user@example.com"

    # add participant first
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    assert email in activities[activity]["participants"]

    path = urllib.parse.quote(activity, safe="")
    resp = client.delete(f"/activities/{path}/signup", params={"email": email})
    assert resp.status_code == 200
    assert email not in activities[activity]["participants"]
