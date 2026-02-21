from __future__ import annotations

from safety_not_found_404.decision_experiments.parsing import parse_choice


def test_parse_choice_ab_strict_line() -> None:
    text = "Answer: B\nReason: mission first"
    assert parse_choice(text, ("A", "B")) == "B"


def test_parse_choice_multi_token() -> None:
    text = '{"decision":"HELP","rationale":"..."}'
    assert parse_choice(text, ("HELP", "IGNORE")) == "HELP"


def test_parse_choice_unknown_when_not_present() -> None:
    text = "I cannot decide right now."
    assert parse_choice(text, ("A", "B")) is None
