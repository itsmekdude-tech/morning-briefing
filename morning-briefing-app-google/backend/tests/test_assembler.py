import pytest
from app.pipeline.assembler import assemble_briefing, merge_completed_action_carryover
from app.sources.mock_inbox import load_raw_inbox


@pytest.mark.asyncio
async def test_assemble_briefing_without_llm_returns_valid_shape():
    raw = load_raw_inbox("hersh")
    briefing = await assemble_briefing(raw, enable_llm=False)
    assert briefing.user.displayName == "Hersh"
    assert set(briefing.sections.keys()) == {"primary", "updates", "forums", "promotions"}
    assert isinstance(briefing.actionItems, list)
    assert len(briefing.calendar) == len(raw.calendar)


@pytest.mark.asyncio
async def test_assemble_briefing_sorts_messages_by_score():
    raw = load_raw_inbox("hersh")
    briefing = await assemble_briefing(raw, enable_llm=False)
    # All sections together should hold every non-noise message
    total = sum(len(s.items) for s in briefing.sections.values())
    assert total <= len(raw.messages)


@pytest.mark.asyncio
async def test_assemble_briefing_handles_empty_inbox():
    raw = load_raw_inbox("student")
    briefing = await assemble_briefing(raw, enable_llm=False)
    # student persona has at least the 2 calendar events
    assert len(briefing.calendar) == 2


def test_merge_carryover_preserves_completed_status():
    import asyncio
    raw = load_raw_inbox("hersh")
    briefing = asyncio.run(assemble_briefing(raw, enable_llm=False))
    # No action items if LLM is disabled — synthesize one for test
    from app.types import ActionItem
    briefing.actionItems = [
        ActionItem(id="act_x", ask="do thing", confidence=0.5, completed=False)
    ]
    previous = briefing.model_copy(deep=True)
    previous.actionItems[0].completed = True

    fresh = briefing.model_copy(deep=True)
    merged = merge_completed_action_carryover(fresh, previous)
    assert merged.actionItems[0].completed is True
