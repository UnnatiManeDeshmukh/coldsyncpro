from rest_framework import serializers
from .models import Product

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_SIZE_MB   = 5


class ProductSerializer(serializers.ModelSerializer):
    available_stock = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def get_available_stock(self, obj):
        total = sum(
            (s.total_crates * obj.crate_size) + s.total_bottles
            for s in obj.stocks.all()
        )
        return total

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def validate_image(self, value):
        if value is None:
            return value
        # Size check
        if value.size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(
                f"Image too large. Max size is {MAX_IMAGE_SIZE_MB}MB."
            )
        # Type check
        content_type = getattr(value, 'content_type', '')
        if content_type and content_type not in ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                "Invalid image type. Use JPEG, PNG, or WebP."
            )
        # Extension check
        name = getattr(value, 'name', '')
        ext  = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
        if ext not in {'jpg', 'jpeg', 'png', 'webp'}:
            raise serializers.ValidationError(
                "Invalid file extension. Use .jpg, .jpeg, .png, or .webp"
            )
        return value

    def validate_crate_size(self, value):
        if value <= 0:
            raise serializers.ValidationError("Crate size must be greater than 0")
        return value

    def validate_rate_per_bottle(self, value):
        if value <= 0:
            raise serializers.ValidationError("Rate per bottle must be greater than 0")
        return value

    def to_representation(self, instance):
        if not hasattr(instance, '_prefetched_objects_cache'):
            instance._prefetched_objects_cache = {}
        return super().to_representation(instance)
