"""
core/limiter.py
===============
Shared slowapi Limiter instance.
Import this singleton into routers that need rate limiting:

    from app.core.limiter import limiter

Register it on the app in main.py:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
