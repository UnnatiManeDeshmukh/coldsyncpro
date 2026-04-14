import re
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Customer
from .validators import (
    validate_phone, validate_username, validate_name,
    validate_email_format, validate_password_strength, validate_safe_text,
)


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'shop_name', 'owner_name', 'phone', 'address', 'village',
                  'credit_limit', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class UpdateProfileSerializer(serializers.ModelSerializer):
    full_name    = serializers.CharField(required=False, max_length=100)
    phone        = serializers.CharField(required=False, max_length=15)
    shop_name    = serializers.CharField(required=False, max_length=200)
    address      = serializers.CharField(required=False, max_length=500)
    village      = serializers.CharField(required=False, max_length=100)
    language     = serializers.CharField(required=False, max_length=10)
    old_password = serializers.CharField(required=False, write_only=True)
    new_password = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'phone', 'shop_name', 'address',
                  'village', 'language', 'old_password', 'new_password']

    def validate_email(self, value):
        value = validate_email_format(value)
        user = self.context['request'].user
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('This email is already in use by another account.')
        return value

    def validate_full_name(self, value):
        return validate_name(value)

    def validate_phone(self, value):
        clean = validate_phone(value)
        user = self.context['request'].user
        try:
            cp = user.customer_profile
            if Customer.objects.filter(phone=clean).exclude(pk=cp.pk).exists():
                raise serializers.ValidationError('This phone number is already registered.')
        except Customer.DoesNotExist:
            if Customer.objects.filter(phone=clean).exists():
                raise serializers.ValidationError('This phone number is already registered.')
        return clean

    def validate_shop_name(self, value):
        return validate_safe_text(value.strip(), 'Shop name')

    def validate_address(self, value):
        return validate_safe_text(value.strip(), 'Address')

    def validate_village(self, value):
        return validate_safe_text(value.strip(), 'Village')

    def validate_new_password(self, value):
        return validate_password_strength(value)

    def update(self, instance, validated_data):
        full_name    = validated_data.pop('full_name', None)
        phone        = validated_data.pop('phone', None)
        shop_name    = validated_data.pop('shop_name', None)
        address      = validated_data.pop('address', None)
        village      = validated_data.pop('village', None)
        language     = validated_data.pop('language', None)
        old_password = validated_data.pop('old_password', None)
        new_password = validated_data.pop('new_password', None)

        if 'email' in validated_data:
            instance.email = validated_data['email']
        if full_name is not None:
            parts = full_name.strip().split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name  = parts[1] if len(parts) > 1 else ''

        if new_password:
            if not old_password:
                raise serializers.ValidationError(
                    {'old_password': ['Current password is required to set a new password.']}
                )
            if not instance.check_password(old_password):
                raise serializers.ValidationError(
                    {'old_password': ['Current password is incorrect.']}
                )
            instance.set_password(new_password)

        instance.save()

        try:
            cp = instance.customer_profile
            if phone     is not None: cp.phone      = phone
            if shop_name is not None: cp.shop_name  = shop_name
            if address   is not None: cp.address    = address
            if village   is not None: cp.village    = village
            if language  is not None: cp.language   = language
            if full_name is not None: cp.owner_name = full_name.strip()
            cp.save()
        except Customer.DoesNotExist:
            Customer.objects.create(
                user=instance,
                shop_name=shop_name or '',
                owner_name=full_name or instance.get_full_name() or instance.username,
                phone=phone or '',
                address=address or '',
                village=village or '',
            )
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    full_name        = serializers.CharField(write_only=True, required=True, max_length=100)
    shop_name        = serializers.CharField(write_only=True, required=True, max_length=200)
    mobile_number    = serializers.CharField(write_only=True, required=True, max_length=15)
    address          = serializers.CharField(write_only=True, required=True, max_length=500)
    password         = serializers.CharField(write_only=True, required=True)
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm',
                  'full_name', 'shop_name', 'mobile_number', 'address']

    # ── Field-level validators ────────────────────────────────────────────────

    def validate_username(self, value):
        value = validate_username(value)
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        value = validate_email_format(value)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value

    def validate_password(self, value):
        return validate_password_strength(value)

    def validate_full_name(self, value):
        return validate_name(value)

    def validate_shop_name(self, value):
        return validate_safe_text(value.strip(), 'Shop name')

    def validate_address(self, value):
        return validate_safe_text(value.strip(), 'Address')

    def validate_mobile_number(self, value):
        clean = validate_phone(value)
        if Customer.objects.filter(phone=clean).exists():
            raise serializers.ValidationError('This phone number is already registered.')
        return clean

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        full_name     = validated_data.pop('full_name')
        shop_name     = validated_data.pop('shop_name')
        mobile_number = validated_data.pop('mobile_number')
        address       = validated_data.pop('address')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        parts = full_name.split(' ', 1)
        user.first_name = parts[0]
        user.last_name  = parts[1] if len(parts) > 1 else ''
        user.save()

        Customer.objects.create(
            user=user,
            shop_name=shop_name,
            owner_name=full_name,
            phone=mobile_number,
            address=address,
            village='',
            credit_limit=50000,
        )
        return user
