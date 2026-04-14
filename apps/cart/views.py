from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import CartItem
from .serializers import CartItemSerializer
from apps.products.models import Product


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart(request):
    """GET /api/cart/ — return current user's cart items"""
    items = CartItem.objects.filter(user=request.user).select_related('product')
    serializer = CartItemSerializer(items, many=True, context={'request': request})
    total = sum(i.subtotal for i in items)
    return Response({'items': serializer.data, 'total': round(total, 2), 'count': items.count()})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    """POST /api/cart/add/ — add or update item in cart"""
    product_id = request.data.get('product_id')
    quantity = int(request.data.get('quantity', 1))

    if not product_id:
        return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    if quantity < 1:
        return Response({'error': 'quantity must be >= 1'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    item, created = CartItem.objects.get_or_create(
        user=request.user, product=product,
        defaults={'quantity': quantity}
    )
    if not created:
        item.quantity = quantity
        item.save()

    serializer = CartItemSerializer(item, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, product_id):
    """POST /api/cart/update/<product_id>/ — increment/decrement quantity"""
    action = request.data.get('action', 'set')  # 'increment', 'decrement', 'set', 'remove'
    quantity = request.data.get('quantity', 1)

    try:
        item = CartItem.objects.get(user=request.user, product_id=product_id)
    except CartItem.DoesNotExist:
        return Response({'error': 'Item not in cart'}, status=status.HTTP_404_NOT_FOUND)

    if action == 'increment':
        item.quantity += 1
        item.save()
    elif action == 'decrement':
        if item.quantity <= 1:
            item.delete()
            return Response({'removed': True})
        item.quantity -= 1
        item.save()
    elif action == 'remove':
        item.delete()
        return Response({'removed': True})
    elif action == 'set':
        qty = int(quantity)
        if qty < 1:
            item.delete()
            return Response({'removed': True})
        item.quantity = qty
        item.save()

    serializer = CartItemSerializer(item, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_cart(request):
    """DELETE /api/cart/clear/ — remove all items from cart"""
    CartItem.objects.filter(user=request.user).delete()
    return Response({'message': 'Cart cleared'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_cart(request):
    """POST /api/cart/sync/ — sync localStorage cart to DB on login"""
    items = request.data.get('items', {})  # {product_id: quantity}
    if not items:
        return Response({'synced': 0})

    synced = 0
    with transaction.atomic():
        for product_id, quantity in items.items():
            try:
                product = Product.objects.get(id=int(product_id))
                qty = int(quantity)
                if qty < 1:
                    continue
                CartItem.objects.update_or_create(
                    user=request.user, product=product,
                    defaults={'quantity': qty}
                )
                synced += 1
            except (Product.DoesNotExist, ValueError):
                continue

    return Response({'synced': synced})
