from fastapi import APIRouter
from pydantic import BaseModel, Field

from service.settingsService import get_reply_settings, update_reply_settings

router = APIRouter(prefix="/settings", tags=["Settings"])


class ReplyPromptsPayload(BaseModel):
    follow_up: str = Field(default="", description="Prompt used for follow-up replies")
    recap: str = Field(default="", description="Prompt used for recap replies")
    quick: str = Field(default="", description="Prompt used for quick replies")


class ReplySettingsPayload(BaseModel):
    topBlock: str = Field(default="")
    bottomBlock: str = Field(default="")
    styles: dict = Field(default_factory=dict)
    prompts: ReplyPromptsPayload


@router.get("/reply-prompts")
def read_reply_prompts() -> ReplySettingsPayload:
    settings = get_reply_settings()
    return ReplySettingsPayload(**settings)


@router.put("/reply-prompts")
def write_reply_prompts(payload: ReplySettingsPayload) -> ReplySettingsPayload:
    updated = update_reply_settings(
        top_block=payload.topBlock,
        bottom_block=payload.bottomBlock,
        style_official=str((payload.styles or {}).get("official") or ""),
        style_semi_official=str((payload.styles or {}).get("semi_official") or ""),
        follow_up=payload.prompts.follow_up,
        recap=payload.prompts.recap,
        quick=payload.prompts.quick,
    )
    return ReplySettingsPayload(**updated)
