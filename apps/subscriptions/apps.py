from django.apps import AppConfig


class SubscriptionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.subscriptions'

    def ready(self):
        import sys
        # Don't run scheduler during migrations or management commands
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0:1]:
            from apps.subscriptions import scheduler
            scheduler.start()
