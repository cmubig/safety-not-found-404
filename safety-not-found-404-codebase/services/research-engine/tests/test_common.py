"""Tests for common utilities: naming, time_utils, files."""
from __future__ import annotations

import re

from safety_not_found_404.common import new_run_id, slugify, utc_now_iso


class TestSlugify:
    def test_basic_slugification(self) -> None:
        assert slugify("GPT-4.1 Mini") == "gpt-4.1-mini"

    def test_special_characters_replaced(self) -> None:
        assert slugify("claude/sonnet@3.5") == "claude-sonnet-3.5"

    def test_empty_string_returns_model(self) -> None:
        assert slugify("") == "model"

    def test_preserves_dots_and_hyphens(self) -> None:
        assert slugify("gpt-4.1-mini") == "gpt-4.1-mini"


class TestNewRunId:
    def test_format_matches_expected_pattern(self) -> None:
        run_id = new_run_id()
        # Format: YYYYMMDDTHHMMSSZ_<6 digits>_<8 hex chars>
        assert re.match(r"\d{8}T\d{6}Z_\d{6}_[0-9a-f]{8}", run_id)

    def test_successive_calls_produce_unique_ids(self) -> None:
        ids = {new_run_id() for _ in range(100)}
        assert len(ids) == 100, "run IDs should be unique even in rapid succession"


class TestUtcNowIso:
    def test_returns_iso_string(self) -> None:
        result = utc_now_iso()
        assert "T" in result
        assert "+" in result or "Z" in result or "UTC" in result.upper() or result.endswith("+00:00")
