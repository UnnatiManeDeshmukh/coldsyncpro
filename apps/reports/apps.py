from django.apps import AppConfig


class ReportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.reports'

    def ready(self):
        import os
        if os.environ.get('RUN_MAIN') != 'true':
            try:
                from apps.scheduler import start
                start()
            except (ImportError, Exception):
                pass
