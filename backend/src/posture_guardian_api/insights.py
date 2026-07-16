"""Personalized session guidance with 量界智算 and deterministic fallback."""

import logging
import time
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI

from posture_guardian_api.config import Settings

PROMPT_VERSION = "posture-coach-v1"
logger = logging.getLogger(__name__)
DISALLOWED_GUIDANCE_TERMS = (
    "診斷",
    "罹患",
    "疾病",
    "治療",
    "療效",
    "脊椎側彎",
    "受傷機率",
)


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
    qualified_session_count: int = 0
    previous_three_average: float | None = None
    recent_three_average: float | None = None
    improvement_points: float | None = None


def fallback_insight(data: InsightInput) -> str:
    """Generate concise, explainable guidance with no network dependency."""
    if data.valid_minutes < 1:
        return (
            "趨勢：這次有效資料較短｜下一步：把耳、肩與髖完整放進畫面｜"
            "下次目標：完成至少 10 分鐘觀察"
        )

    issue = data.primary_issue or "姿勢角度"
    if data.improvement_points is not None:
        direction = "提升" if data.improvement_points >= 0 else "下降"
        trend = f"最近三次較前三次{direction} {abs(data.improvement_points):.0f} 個百分點"
    else:
        trend = f"已累積 {data.qualified_session_count}/6 次合格資料"
    if data.good_posture_rate >= 85:
        return (
            f"趨勢：{trend}｜下一步：維持自然呼吸，不必僵硬追分｜"
            "下次目標：每 25–30 分鐘起身活動"
        )
    if data.good_posture_rate >= 65:
        return (
            f"趨勢：{trend}，主要偏移為「{issue}」｜下一步：先調整螢幕高度與椅背｜"
            "下次目標：重新校準後觀察 10 分鐘"
        )
    return (
        f"趨勢：{trend}，「{issue}」較頻繁｜下一步：先休息 5 分鐘並調整座椅｜"
        "下次目標：重新校準後完成較短觀察"
    )


def validate_model_insight(raw: str) -> str | None:
    """Accept only the short, non-medical three-part contract shown in the UI."""
    text = " ".join(raw.split())
    if not text or len(text) > 120:
        return None
    parts = text.split("｜")
    required_prefixes = ("趨勢：", "下一步：", "下次目標：")
    if len(parts) != 3 or any(
        not part.startswith(prefix) or part == prefix
        for part, prefix in zip(parts, required_prefixes, strict=True)
    ):
        return None
    if any(term in text for term in DISALLOWED_GUIDANCE_TERMS):
        return None
    return text


def build_prompt(data: InsightInput) -> str:
    """Build the de-identified prompt shared by both supported API modes."""
    previous_average = (
        data.previous_three_average if data.previous_three_average is not None else "不足"
    )
    recent_average = data.recent_three_average if data.recent_three_average is not None else "不足"
    improvement = data.improvement_points if data.improvement_points is not None else "不足"
    return (
        "你是中學生姿勢覺察系統的教練。根據以下同一匿名使用者的去識別彙總，"
        "用繁體中文輸出「趨勢：…｜下一步：…｜下次目標：…」，總長 120 字內。"
        "只提供一項可執行的環境調整、休息或重新校準建議；不可診斷、恐嚇、"
        "聲稱醫療效果，亦不可把短資料解讀成改善。\n"
        f"視角={data.view_mode}; 有效分鐘={data.valid_minutes:.1f}; "
        f"良好坐姿率={data.good_posture_rate:.1f}%; 提醒事件={data.event_count}; "
        f"平均分數={data.average_score:.1f}; 主要偏移={data.primary_issue or '無'}; "
        f"介入階段={data.intervention_stage}; "
        f"合格長期資料={data.qualified_session_count}/6; "
        f"前三次平均={previous_average}; 最近三次平均={recent_average}; "
        f"改善百分點={improvement}"
    )


async def generate_insight(data: InsightInput, settings: Settings) -> tuple[str, str]:
    """Use 量界智算 when configured; always return a safe local fallback on failure."""
    if not settings.insight_configured or data.valid_minutes < 10:
        return fallback_insight(data), "fallback"

    prompt = build_prompt(data)
    started_at = time.perf_counter()
    client: AsyncOpenAI | None = None
    try:
        client = AsyncOpenAI(
            api_key=settings.ai_api_key,
            base_url=settings.ai_base_url,
            timeout=settings.ai_timeout_seconds,
            max_retries=0,
        )
        response: Any
        if settings.ai_api_mode == "responses":
            response = await client.responses.create(
                model=settings.ai_model,
                input=prompt,
                max_output_tokens=180,
            )
            raw_text = response.output_text
        else:
            response = await client.chat.completions.create(
                model=settings.ai_model,
                messages=[
                    {
                        "role": "system",
                        "content": "只回傳指定的繁體中文三段式姿勢覺察建議，不使用 Markdown。",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=180,
                temperature=0.2,
            )
            raw_text = response.choices[0].message.content
        text = validate_model_insight(raw_text) if isinstance(raw_text, str) else None
        if text:
            latency_ms = round((time.perf_counter() - started_at) * 1000)
            logger.info(
                "ai_insight_success provider=liangjie api_mode=%s model=%s "
                "prompt_version=%s latency_ms=%d request_id=%s",
                settings.ai_api_mode,
                getattr(response, "model", None) or settings.ai_model,
                PROMPT_VERSION,
                latency_ms,
                getattr(response, "_request_id", None) or "unavailable",
            )
            return text, "liangjie"
        logger.warning(
            "ai_insight_fallback provider=liangjie api_mode=%s model=%s "
            "prompt_version=%s latency_ms=%d error_type=OutputContractRejected",
            settings.ai_api_mode,
            settings.ai_model,
            PROMPT_VERSION,
            round((time.perf_counter() - started_at) * 1000),
        )
    except Exception as exc:
        # Cloud access must never break the live posture session or contest demo.
        logger.warning(
            "ai_insight_fallback provider=liangjie api_mode=%s model=%s "
            "prompt_version=%s error_type=%s",
            settings.ai_api_mode,
            settings.ai_model,
            PROMPT_VERSION,
            type(exc).__name__,
        )
    finally:
        if client is not None:
            try:
                await client.close()
            except Exception as exc:
                logger.warning(
                    "ai_client_close_failed provider=liangjie error_type=%s",
                    type(exc).__name__,
                )
    return fallback_insight(data), "fallback"
