"""Foundry safety contract, timeout, and audit behavior tests."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

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


@pytest.mark.asyncio
async def test_foundry_uses_short_timeout_and_accepts_only_safe_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response = SimpleNamespace(
        output_text="趨勢：資料仍不足｜下一步：調高螢幕｜下次目標：觀察 10 分鐘",
        model="posture-coach-deployment",
        _request_id="request-test",
    )
    create = AsyncMock(return_value=response)
    close = AsyncMock()
    client = SimpleNamespace(responses=SimpleNamespace(create=create), close=close)
    received: dict[str, object] = {}

    def fake_client(**kwargs: object) -> SimpleNamespace:
        received.update(kwargs)
        return client

    monkeypatch.setattr(insights, "AsyncOpenAI", fake_client)
    settings = Settings(
        ai_provider="foundry",
        azure_foundry_endpoint="https://example.openai.azure.com",
        azure_foundry_api_key="test-placeholder",
        azure_foundry_model="posture-coach-deployment",
    )

    text, provider = await insights.generate_insight(insight_input(), settings)

    assert provider == "foundry"
    assert text.startswith("趨勢：")
    assert received["timeout"] == 8.0
    assert received["max_retries"] == 0
    close.assert_awaited_once()
