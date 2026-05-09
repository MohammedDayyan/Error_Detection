import json
import sys
import urllib.request
import urllib.error


def parse_ai_text(text: str):
    explanation = "Explanation could not be generated."
    fix = "Fix could not be generated."

    if "EXPLANATION:" in text and "FIX:" in text:
        parts = text.split("FIX:", 1)
        explanation = parts[0].replace("EXPLANATION:", "").strip()
        fix = parts[1].strip()
    else:
        explanation = text.strip() or explanation
        fix = "Please see explanation."

    return explanation, fix


def request_groq(api_key: str, prompt: str):
    models = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
    ]

    messages = [
        {
            "role": "system",
            "content": "You are a helpful and expert AI debugging assistant.",
        },
        {
            "role": "user",
            "content": prompt,
        },
    ]

    last_error = None
    for model in models:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 1024,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GroqTestClient/1.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                body = response.read().decode("utf-8")
                parsed = json.loads(body)
                return parsed["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as err:
            try:
                error_body = err.read().decode("utf-8")
            except Exception:
                error_body = str(err)
            last_error = f"Model {model} failed: {error_body}"
        except Exception as err:
            last_error = f"Model {model} failed: {str(err)}"

    raise RuntimeError(last_error or "All Groq model attempts failed.")


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    if not raw:
        raise RuntimeError("No input payload received by ai_fix.py.")

    payload = json.loads(raw)
    error_message = payload.get("errorMessage", "")
    file_context = payload.get("fileContext", "")
    api_key = payload.get("apiKey", "")

    if not api_key:
        raise RuntimeError("GROQ_API_KEY is missing.")

    prompt = f"""You are an expert AI debugging assistant. I have encountered the following error in my logs:

Error Message:
{error_message}

Context/File:
{file_context}

Please provide:
1. A brief explanation of why this error likely occurred.
2. A suggested fix or steps to resolve it.

Format your response exactly as follows:
EXPLANATION:
<your explanation here>
FIX:
<your fix here>
"""

    ai_text = request_groq(api_key, prompt)
    explanation, fix = parse_ai_text(ai_text)
    sys.stdout.write(json.dumps({"explanation": explanation, "fix": fix}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(str(exc))
        sys.exit(1)
