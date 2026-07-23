"""HTTP smoke tests for health and the complete derived-data lifecycle."""

from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from posture_guardian_api.main import app
from posture_guardian_api.router import pose_analyzer
from posture_guardian_api.schemas import SampleCreate


def register(client: TestClient) -> tuple[dict[str, str], dict[str, Any]]:
    """Create an isolated test account and return its bearer header and response body."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": f"student-{uuid4()}@example.com", "password": "safe-test-password"},
    )
    assert response.status_code == 201
    body = response.json()
    return {"Authorization": f"Bearer {body['access_token']}"}, body


def test_openapi_metadata() -> None:
    """The executable skeleton exposes stable API metadata."""
    schema = app.openapi()

    assert schema["info"]["title"] == "Posture Guardian API"
    assert schema["info"]["version"] == "0.1.0"


def test_api_sets_security_headers_and_preserves_cors_preflight() -> None:
    with TestClient(app) as client:
        response = client.options(
            "/api/v1/sessions",
            headers={
                "Origin": "http://localhost:8081",
                "Access-Control-Request-Method": "POST",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["permissions-policy"] == "camera=(), microphone=(), geolocation=()"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["x-robots-tag"] == "noindex, nofollow"


def test_session_lifecycle_stores_only_derived_values() -> None:
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["database"] == "ok"
        assert health.json()["insight_provider"] == "fallback"
        assert health.json()["insight_configured"] is False
        assert health.json()["insight_api_mode"] is None
        assert health.json()["insight_model"] is None
        assert health.json()["insight_prompt_version"] == "posture-coach-v1"

        headers, _ = register(client)
        assert client.post(
            "/api/v1/sessions",
            json={
                "view_mode": "side",
                "intervention_stage": "starter",
                "baseline": {"neck_flexion": 5, "trunk_flexion": 2},
            },
        ).status_code == 401

        created = client.post(
            "/api/v1/sessions",
            json={
                "view_mode": "side",
                "intervention_stage": "starter",
                "baseline": {"neck_flexion": 5, "trunk_flexion": 2},
            },
            headers=headers,
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
            headers=headers,
        )
        assert sample.status_code == 200

        completed = client.post(f"/api/v1/sessions/{session_id}/complete", headers=headers)
        assert completed.status_code == 200
        body = completed.json()
        assert body["summary"]["posture_event_count"] == 1
        assert body["summary"]["primary_issue"] == "頭頸前傾角度偏移"
        assert body["summary"]["insight_provider"] == "fallback"

        feedback = client.post(
            f"/api/v1/sessions/{session_id}/feedback",
            json={"reminder_fit": "just_right", "feeling": "in_control"},
            headers=headers,
        )
        assert feedback.status_code == 200
        assert feedback.json()["accepted"] is True

        history = client.get("/api/v1/sessions", headers=headers)
        assert history.status_code == 200
        assert history.json()["items"][0]["id"] == session_id

        deleted = client.delete("/api/v1/account/data", headers=headers)
        assert deleted.status_code == 200
        assert deleted.json()["deleted_sessions"] == 1


def test_session_input_rejects_mismatched_or_non_finite_metrics() -> None:
    with pytest.raises(ValidationError):
        SampleCreate.model_validate({"posture_score": float("nan")})

    with TestClient(app) as client:
        headers, _ = register(client)
        bad_baseline = client.post(
            "/api/v1/sessions",
            json={
                "view_mode": "side",
                "intervention_stage": "starter",
                "baseline": {"head_tilt": 0},
            },
            headers=headers,
        )
        assert bad_baseline.status_code == 422

        unexpected_field = client.post(
            "/api/v1/sessions",
            json={
                "view_mode": "side",
                "intervention_stage": "starter",
                "baseline": {"neck_flexion": 5, "trunk_flexion": 2},
                "raw_image": "must-not-be-accepted",
            },
            headers=headers,
        )
        assert unexpected_field.status_code == 422

        created = client.post(
            "/api/v1/sessions",
            json={
                "view_mode": "side",
                "intervention_stage": "starter",
                "baseline": {"neck_flexion": 5, "trunk_flexion": 2},
            },
            headers=headers,
        )
        session_id = created.json()["id"]
        bad_metric = client.post(
            f"/api/v1/sessions/{session_id}/samples",
            json={
                "duration_seconds": 1,
                "is_valid": True,
                "posture_score": 80,
                "metrics": {"head_tilt": 4},
            },
            headers=headers,
        )
        assert bad_metric.status_code == 422
        client.delete("/api/v1/account/data", headers=headers)


def test_authentication_hides_passwords_and_blocks_cross_account_access() -> None:
    with TestClient(app) as client:
        first_headers, first_account = register(client)
        assert "password" not in first_account
        assert first_account["token_type"] == "bearer"

        me = client.get("/api/v1/auth/me", headers=first_headers)
        assert me.status_code == 200
        assert me.json()["email"] == first_account["user"]["email"]

        duplicate = client.post(
            "/api/v1/auth/register",
            json={"email": first_account["user"]["email"], "password": "another-safe-password"},
        )
        assert duplicate.status_code == 409
        wrong_password = client.post(
            "/api/v1/auth/login",
            json={"email": first_account["user"]["email"], "password": "wrong-safe-password"},
        )
        assert wrong_password.status_code == 401

        created = client.post(
            "/api/v1/sessions",
            json={
                "view_mode": "side",
                "intervention_stage": "starter",
                "baseline": {"neck_flexion": 5, "trunk_flexion": 2},
            },
            headers=first_headers,
        )
        assert created.status_code == 201
        session_id = created.json()["id"]

        second_headers, _ = register(client)
        assert client.get("/api/v1/sessions", headers=second_headers).json()["items"] == []
        forbidden = client.post(
            f"/api/v1/sessions/{session_id}/samples",
            json={"duration_seconds": 1, "is_valid": True, "posture_score": 80},
            headers=second_headers,
        )
        assert forbidden.status_code == 404

        logged_out = client.post("/api/v1/auth/logout", headers=first_headers)
        assert logged_out.status_code == 204
        assert client.get("/api/v1/auth/me", headers=first_headers).status_code == 401


def test_degraded_readiness_returns_service_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(pose_analyzer, "model_path", Path("missing-model.task"))

    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 503
        assert response.json()["status"] == "degraded"
        assert client.get("/live").status_code == 200
