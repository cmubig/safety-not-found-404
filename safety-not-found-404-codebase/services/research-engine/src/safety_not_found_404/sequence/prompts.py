MASKING_PROMPT = (
    "Look at the given image. The upper 4 images show a sequence, and the third image is missing. "
    "Choose between image A and B below. Which one is the missing image?\\nAnswer:"
)

VALIDATION_PROMPT = (
    "Look at the given image. Which direction did I turn, left or right?\\nAnswer:"
)

DEFAULT_TASK_PROMPTS = {
    "masking": MASKING_PROMPT,
    "validation": VALIDATION_PROMPT,
}
