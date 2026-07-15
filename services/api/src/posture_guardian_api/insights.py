"""Personalized session guidance with Microsoft Foundry and deterministic fallback."""

from dataclasses import dataclass

from openai import AsyncOpenAI

from posture_guardian_api.config import Settings


@dataclass(frozen=True)
class InsightInput:
    """Anonymous aggregate values safe to send to a configured model provider."""

    view_mode: str
    valid_minutes: float
    good_posture_rate: float
    event_count: int
    average_score: float
    primary_issue: str | None
    intervention_stage: str


def fallback_insight(data: InsightInput) -> str:
    """Generate concise, explainable guidance with no network dependency."""
    if data.valid_minutes < 1:
        return "這次有效資料較短，先把耳朵、肩膀與髖部完整放進畫面，再完成至少 5 分鐘觀察。"

    issue = data.primary_issue or "姿勢角度"
    if data.good_posture_rate >= 85:
        return (
            f"這次有 {data.good_posture_rate:.0f}% 的有效時間維持在個人基線範圍內。"
            "繼續每 25–30 分鐘起身活動，避免為了追求分數而僵硬坐著。"
        )
    if data.good_posture_rate >= 65:
        return (
            f"主要偏移是「{issue}」。下次先調整螢幕高度與椅背，再觀察 5 分鐘；"
            "提醒出現時緩慢回到舒服的中性坐姿。"
        )
    return (
        f"這次「{issue}」出現較頻繁。建議先休息 5 分鐘，重新校準相機與座椅位置，"
        "再開始較短的工作階段；若持續不適，應停止使用並尋求專業協助。"
    )


async def generate_insight(data: InsightInput, settings: Settings) -> tuple[str, str]:
    """Use Foundry when configured; always return a local fallback on failure."""
    if not settings.foundry_configured:
        return fallback_insight(data), "fallback"

    endpoint = settings.azure_foundry_endpoint.rstrip("/")
    base_url = endpoint if endpoint.endswith("/openai/v1") else f"{endpoint}/openai/v1"
    client = AsyncOpenAI(api_key=settings.azure_foundry_api_key, base_url=base_url)
    prompt = (
        "你是中學生姿勢覺察系統的教練。根據以下匿名彙總產生 70 字內繁體中文建議。"
        "只提供可執行的環境調整、休息與重新校準建議；不可診斷、恐嚇或聲稱醫療效果。\n"
        f"視角={data.view_mode}; 有效分鐘={data.valid_minutes:.1f}; "
        f"良好坐姿率={data.good_posture_rate:.1f}%; 提醒事件={data.event_count}; "
        f"平均分數={data.average_score:.1f}; 主要偏移={data.primary_issue or '無'}; "
        f"介入階段={data.intervention_stage}"
    )
    try:
        response = await client.responses.create(
            model=settings.azure_foundry_model,
            input=prompt,
            max_output_tokens=180,
        )
        text = response.output_text.strip()
        if text:
            return text, "foundry"
    except Exception:
        # Cloud access must never break the live posture session or contest demo.
        pass
    return fallback_insight(data), "fallback"
