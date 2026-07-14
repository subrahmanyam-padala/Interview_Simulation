# Viva Preparation Notes

## 1) One-Line Project Summary

This project is a web-based AI interview simulator that evaluates both what a candidate says (content quality) and how they say it (voice and facial confidence signals).

## 2) Key Innovation Points

- Dynamic interview questions generated per role/topic/difficulty
- Multi-signal evaluation:
  - Text content quality (OpenAI)
  - Voice fluency and clarity (speech-derived metrics)
  - Non-verbal confidence (face analysis)
- Final explainable report with actionable recommendations

## 3) Why MongoDB Instead of SQL

Interview responses contain nested and variable metrics. MongoDB allows flexible document structure for question-wise metrics without repeated schema migrations.

## 4) Why OpenAI Is Called from Backend Only

Security. API keys cannot be exposed to client-side JavaScript. Backend controls prompts, schema, and fallback behavior.

## 5) How Eye Contact Is Estimated

Face landmarks provide eye and nose coordinates. Offset between expected frontal alignment and observed alignment is mapped to an eye-contact score.

## 6) How Voice Clarity Is Estimated

Using transcript and timing:

- WPM (words per minute)
- Filler words count
- Pause patterns

These contribute to clarity and fluency scores.

## 7) Limitations (Explain Honestly)

- Browser speech recognition quality depends on accent/noise/device.
- Face analysis is approximate and camera-angle dependent.
- AI scoring can vary by prompt/model version.

## 8) Future Enhancements

- Resume-level personalization of question set
- Real audio signal processing (pitch, jitter, articulation)
- Multi-language interview support
- WebRTC-based proctoring mode

## 9) Likely Viva Questions

1. Why JWT instead of sessions?
2. How do you prevent unauthorized report access?
3. How are scores aggregated?
4. What happens when OpenAI API fails?
5. How would you scale for thousands of users?

## 10) Strong Answers (Short)

- JWT chosen for stateless API scalability.
- Route access protected by token + ownership check.
- Composite score combines content, communication, voice, and face metrics.
- Fallback scoring keeps system available during AI outages.
- Horizontal scaling possible with stateless backend + managed DB.
