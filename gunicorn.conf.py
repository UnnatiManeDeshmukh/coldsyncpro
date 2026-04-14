# Gunicorn configuration for ColdSync Pro production deployment
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Workers — gthread worker class supports SSE (Server-Sent Events) connections
# without blocking other requests. Each worker handles multiple threads.
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gthread"      # thread-based — required for SSE streaming
threads = 4                   # 4 threads per worker handles concurrent SSE connections
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = "logs/gunicorn_access.log"
errorlog  = "logs/gunicorn_error.log"
loglevel  = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "coldsync_pro"

# Security
limit_request_line   = 4096
limit_request_fields = 100

# Graceful restart
graceful_timeout = 30
max_requests      = 1000
max_requests_jitter = 50
