from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['brand', 'bottle_size']
    search_fields = ['product_name', 'brand']
    ordering_fields = ['created_at', 'rate_per_bottle', 'expiry_date']

    def get_queryset(self):
        from django.utils import timezone
        qs = Product.objects.prefetch_related('stocks').all()
        # Non-admin users only see non-expired products
        user = self.request.user
        if not (user.is_authenticated and (user.is_staff or user.is_superuser)):
            qs = qs.filter(expiry_date__gte=timezone.now().date())
        return qs


@api_view(['GET'])
@permission_classes([AllowAny])
def brands_list(request):
    """Return distinct brands (non-expired products only) with product count and price range."""
    from django.utils import timezone
    from django.db.models import Min, Max, Count
    from django.core.cache import cache
    today = timezone.now().date()

    cache_key = f'brands_list_{today}'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    # Single query — no N+1
    brands = (
        Product.objects
        .filter(expiry_date__gte=today)
        .values('brand')
        .annotate(
            product_count=Count('id'),
            min_price=Min('rate_per_bottle'),
            max_price=Max('rate_per_bottle'),
        )
        .order_by('brand')
    )

    result = [
        {
            'brand':         b['brand'],
            'product_count': b['product_count'],
            'min_price':     float(b['min_price'] or 0),
            'max_price':     float(b['max_price'] or 0),
        }
        for b in brands
    ]
    cache.set(cache_key, result, 300)  # cache 5 minutes
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def catalog_products(request):
    """Return all non-expired products with stock info for the shop catalog."""
    from django.utils import timezone
    from django.core.cache import cache
    brand = request.query_params.get('brand', '')
    today = timezone.now().date()

    cache_key = f'catalog_products_{today}_{brand}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    qs = Product.objects.prefetch_related('stocks').filter(expiry_date__gte=today)
    if brand:
        qs = qs.filter(brand=brand)
    serializer = ProductSerializer(qs, many=True, context={'request': request})
    cache.set(cache_key, serializer.data, 300)  # cache 5 minutes
    return Response(serializer.data)
