"""Tests for safety_vln.judge: RuleStageJudge and LLMStageJudge."""
from __future__ import annotations

from safety_not_found_404.safety_vln.judge import LLMStageJudge, RuleStageJudge


class TestRuleStageJudge:
    def test_correct_choice_passes(self) -> None:
        judge = RuleStageJudge()
        result = judge.evaluate(
            problem_id="test_001",
            stage_name="stage1",
            response_text="Answer: A\nReason: because",
            expected_choice="A",
            allowed_choices=("A", "B", "C"),
        )
        assert result.passed is True
        assert result.extracted_choice == "A"

    def test_wrong_choice_fails(self) -> None:
        judge = RuleStageJudge()
        result = judge.evaluate(
            problem_id="test_001",
            stage_name="stage1",
            response_text="Answer: B\nReason: because",
            expected_choice="A",
            allowed_choices=("A", "B", "C"),
        )
        assert result.passed is False
        assert result.extracted_choice == "B"

    def test_unparseable_response(self) -> None:
        judge = RuleStageJudge()
        result = judge.evaluate(
            problem_id="test_001",
            stage_name="stage1",
            response_text="I don't know",
            expected_choice="A",
            allowed_choices=("A", "B", "C"),
        )
        assert result.passed is False
        assert result.extracted_choice is None

    def test_empty_response(self) -> None:
        judge = RuleStageJudge()
        result = judge.evaluate(
            problem_id="test_001",
            stage_name="stage1",
            response_text="",
            expected_choice="A",
            allowed_choices=("A", "B"),
        )
        assert result.passed is False
        assert result.extracted_choice is None

    def test_strict_first_line_mode(self) -> None:
        judge = RuleStageJudge(strict_first_line=True)
        result = judge.evaluate(
            problem_id="test_001",
            stage_name="stage1",
            response_text="some preamble\nAnswer: A\nReason: because",
            expected_choice="A",
            allowed_choices=("A", "B"),
        )
        # strict_first_line only looks at first line, which is "some preamble"
        assert result.extracted_choice is None
        assert result.passed is False

    def test_case_insensitive_match(self) -> None:
        judge = RuleStageJudge()
        result = judge.evaluate(
            problem_id="test_001",
            stage_name="stage1",
            response_text="answer: a\nreason: test",
            expected_choice="A",
            allowed_choices=("A", "B"),
        )
        assert result.passed is True
        assert result.extracted_choice == "A"


class TestLLMStageJudge:
    def test_fallback_when_provider_not_configured(self) -> None:
        class _UnconfiguredProvider:
            def is_configured(self) -> bool:
                return False

            def generate(self, system_prompt: str, user_prompt: str) -> str:
                raise AssertionError("Should not be called")

        judge = LLMStageJudge(provider=_UnconfiguredProvider())
        result = judge.evaluate(
            problem_id="test_001",
            stage_name="stage1",
            response_text="Answer: A\nReason: test",
            expected_choice="A",
            allowed_choices=("A", "B"),
        )
        # Falls back to RuleStageJudge
        assert result.passed is True
        assert result.extracted_choice == "A"

    def test_extract_json_from_code_block(self) -> None:
        class _FakeJudgeProvider:
            def is_configured(self) -> bool:
                return True

            def generate(self, system_prompt: str, user_prompt: str) -> str:
                return '```json\n{"pass": true, "extracted_choice": "B", "reason": "correct"}\n```'

        judge = LLMStageJudge(provider=_FakeJudgeProvider())
        result = judge.evaluate(
            problem_id="test_001",
            stage_name="stage1",
            response_text="Answer: B",
            expected_choice="B",
            allowed_choices=("A", "B"),
        )
        assert result.passed is True
        assert result.extracted_choice == "B"
