"""量界智算 adapter safety, configuration, and fallback behavior tests."""

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from posture_guardian_api import insights
from posture_guardian_api.config import Settings
from posture_guardian_api.insights import InsightInput


def insight_input() -> InsightInput:
    return InsightInput(
        view_mode="side",
        valid_minutes=12,
        good_posture_rate=72,
        event_count=2,
        average_score=74,
        primary_issue="頭頸前傾角度偏移",
        intervention_stage="starter",
    )


def liangjie_settings(**overrides: Any) -> Settings:
    values: dict[str, Any] = {
        "app_env": "production",
        "ai_provider": "liangjie",
        "ai_base_url": "https://api.example.com/v1",
        "ai_api_key": "test-placeholder",
        "ai_model": "posture-coach-model",
    }
    values.update(overrides)
    return Settings(**values)


def test_liangjie_requires_complete_secure_production_configuration() -> None:
    with pytest.raises(ValidationError, match="AI_BASE_URL"):
        Settings(ai_provider="liangjie")
    with pytest.raises(ValidationError, match="HTTPS"):
        liangjie_settings(ai_base_url="http://api.example.com/v1")
    with pytest.raises(ValidationError, match="query"):
        liangjie_settings(ai_base_url="https://api.example.com/v1?token=unsafe")


def test_model_output_contract_requires_exact_order_and_non_medical_text() -> None:
    assert insights.validate_model_insight(
        "趨勢：資料穩定｜下一步：調高螢幕｜下次目標：觀察 10 分鐘"
    )
    assert (
        insights.validate_model_insight(
            "下一步：調高螢幕｜趨勢：資料穩定｜下次目標：觀察 10 分鐘"
        )
        is None
    )
    assert (
        insights.validate_model_insight(
            "趨勢：可能罹患疾病｜下一步：就醫｜下次目標：接受治療"
        )
        is None
    )


def test_database_fields_encode_reserved_password_characters() -> None:
    settings = Settings(
        db_host="postgres",
        db_password="contains@/:?#%reserved",
    )

    assert "contains%40%2F%3A%3F%23%25reserved" in settings.normalized_database_url


@pytest.mark.asyncio
async def test_chat_completions_uses_exact_base_url_and_safe_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(
                    content="趨勢：資料逐漸穩定｜下一步：調高螢幕｜下次目標：觀察 10 分鐘"
                )
            )
        ],
        model="posture-coach-model",
        _request_id="request-test",
    )
    create = AsyncMock(return_value=response)
    close = AsyncMock()
    client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create)),
        close=close,
    )
    received: dict[str, object] = {}

    def fake_client(**kwargs: object) -> SimpleNamespace:
        received.update(kwargs)
        return client

    monkeypatch.setattr(insights, "AsyncOpenAI", fake_client)
    settings = liangjie_settings()

    text, provider = await insights.generate_insight(insight_input(), settings)

    assert provider == "liangjie"
    assert text.startswith("趨勢：")
    assert received["base_url"] == "https://api.example.com/v1"
    assert received["timeout"] == 8.0
    assert received["max_retries"] == 0
    assert create.await_args is not None
    assert create.await_args.kwargs["model"] == "posture-coach-model"
    assert create.await_args.kwargs["max_tokens"] == 180
    close.assert_awaited_once()


@pytest.mark.asyncio
async def test_responses_mode_is_supported(monkeypatch: pytest.MonkeyPatch) -> None:
    response = SimpleNamespace(
        output_text="趨勢：資料逐漸穩定｜下一步：調整椅背｜下次目標：觀察 10 分鐘",
        model="posture-coach-model",
        _request_id=None,
    )
    create = AsyncMock(return_value=response)
    close = AsyncMock()
    client = SimpleNamespace(responses=SimpleNamespace(create=create), close=close)
    monkeypatch.setattr(insights, "AsyncOpenAI", lambda **_: client)

    text, provider = await insights.generate_insight(
        insight_input(),
        liangjie_settings(ai_api_mode="responses"),
    )

    assert provider == "liangjie"
    assert text.startswith("趨勢：")
    assert create.await_args is not None
    assert create.await_args.kwargs["max_output_tokens"] == 180
    close.assert_awaited_once()


@pytest.mark.asyncio
async def test_provider_failure_or_rejected_output_returns_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create = AsyncMock(side_effect=TimeoutError("provider timeout"))
    close = AsyncMock()
    client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create)),
        close=close,
    )
    monkeypatch.setattr(insights, "AsyncOpenAI", lambda **_: client)

    text, provider = await insights.generate_insight(insight_input(), liangjie_settings())

    assert provider == "fallback"
    assert text.startswith("趨勢：")
    close.assert_awaited_once()


@pytest.mark.asyncio
async def test_client_initialization_failure_returns_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def failing_client(**_: object) -> None:
        raise RuntimeError("client initialization failed")

    monkeypatch.setattr(insights, "AsyncOpenAI", failing_client)

    text, provider = await insights.generate_insight(insight_input(), liangjie_settings())

    assert provider == "fallback"
    assert text.startswith("趨勢：")


@pytest.mark.asyncio
async def test_default_fallback_does_not_create_external_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def unexpected_client(**_: object) -> None:
        raise AssertionError("fallback must not create an external client")

    monkeypatch.setattr(insights, "AsyncOpenAI", unexpected_client)

    text, provider = await insights.generate_insight(insight_input(), Settings())

    assert provider == "fallback"
    assert text.startswith("趨勢：")


@pytest.mark.asyncio
async def test_short_session_does_not_spend_external_ai_quota(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def unexpected_client(**_: object) -> None:
        raise AssertionError("sessions shorter than ten minutes must use fallback")

    monkeypatch.setattr(insights, "AsyncOpenAI", unexpected_client)
    short_input = InsightInput(
        view_mode="side",
        valid_minutes=9.9,
        good_posture_rate=72,
        event_count=2,
        average_score=74,
        primary_issue="頭頸前傾角度偏移",
        intervention_stage="starter",
    )

    _, provider = await insights.generate_insight(short_input, liangjie_settings())

    assert provider == "fallback"
