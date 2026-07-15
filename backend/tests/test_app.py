"""HTTP smoke tests for health and the complete derived-data lifecycle."""

from uuid import uuid4

from fastapi.testclient import TestClient

from posture_guardian_api.main import app


def test_openapi_metadata() -> None:
    """The executable skeleton exposes stable API metadata."""
    schema = app.openapi()

    assert schema["info"]["title"] == "Posture Guardian API"
    assert schema["info"]["version"] == "0.1.0"


def test_session_lifecycle_stores_only_derived_values() -> None:
    profile_id = f"test-{uuid4()}"
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["database"] == "ok"

        created = client.post(
            "/api/v1/sessions",
            json={
                "profile_id": profile_id,
                "view_mode": "side",
                "intervention_stage": "starter",
                "baseline": {"neck_flexion": 5, "trunk_flexion": 2},
            },
        )
        assert created.status_code == 201
        session_id = created.json()["id"]

        sample = client.post(
            f"/api/v1/sessions/{session_id}/samples",
            json={
                "duration_seconds": 1,
                "is_valid": True,
                "threshold_exceeded": True,
                "event_active": True,
                "posture_score": 42,
                "metrics": {"neck_flexion": 23},
                "deviations": {"neck_flexion": 18},
                "reasons": ["頭頸前傾角度偏移"],
            },
        )
        assert sample.status_code == 200

        completed = client.post(f"/api/v1/sessions/{session_id}/complete")
        assert completed.status_code == 200
        body = completed.json()
        assert body["summary"]["posture_event_count"] == 1
        assert body["summary"]["primary_issue"] == "頭頸前傾角度偏移"
        assert body["summary"]["insight_provider"] == "fallback"

        feedback = client.post(
            f"/api/v1/sessions/{session_id}/feedback",
            json={"reminder_fit": "just_right", "feeling": "in_control"},
        )
        assert feedback.status_code == 200
        assert feedback.json()["accepted"] is True

        history = client.get("/api/v1/sessions", params={"profile_id": profile_id})
        assert history.status_code == 200
        assert history.json()["items"][0]["id"] == session_id

        deleted = client.delete(f"/api/v1/profiles/{profile_id}/data")
        assert deleted.status_code == 200
        assert deleted.json()["deleted_sessions"] == 1
