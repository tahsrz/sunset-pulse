# Guardian Security Utility (Mini-LLM)

This utility serves as a secure "gatekeeper" for LLM interactions in the Sunset Pulse project. It pre-scans queries for malicious intent, protects sensitive API tokens, and handles simple questions using a lightweight, cost-effective model.

## Features

- **Adversarial Sanitization**: Detects and blocks prompt injection attempts inspired by "Claude leaks" and common jailbreaks.
- **Token Protection**: Automatically masks OpenAI, Anthropic, and generic API keys/secrets before they reach the main model.
- **Database Scrape Prevention**: Identifies and blocks natural language and SQL-style attempts to dump or manipulate the database.
- **Mini-LLM Routing**: Routes "easy" questions (e.g., common knowledge, simple definitions) to a free/lightweight model (`google/gemma-3-4b-it`) to save costs and reduce latency.
- **Risk Scoring**: Provides a detailed risk analysis for every query.

## Installation & Setup

1. **Environment Variables**:
   Set `OPENROUTER_API_KEY` in your environment or `.env` file to enable the mini-llm features.

2. **Usage**:
   ```bash
   python utils/security/guardian.py "What is the capital of France?"
   ```

## Integration

You can import the `Guardian` class into your backend services (Python) or call the script as a subprocess from Node.js/Next.js.

### Example (Python)
```python
from utils.security.guardian import Guardian

guardian = Guardian()
result = guardian.process_query(user_input)

if result["status"] == "BLOCKED":
    return "Access Denied"
elif result["status"] == "RESOLVED_BY_MINI":
    return result["response"]
else:
    # Proceed to main LLM with result["query"] (sanitized)
    pass
```

### Example (Node.js)
```javascript
const { execSync } = require('child_process');
const result = JSON.parse(execSync(`python utils/security/guardian.py "${userInput}"`));
```

## Security Patterns

The guardian monitors for:
- `Ignore all previous instructions`
- `[INTERNAL]` or `system message`
- `SELECT * FROM` or `database dump`
- Hardcoded `sk-...` tokens
- And more...
