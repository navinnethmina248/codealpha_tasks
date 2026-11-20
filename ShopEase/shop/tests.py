from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import Category, Order, Product


class ShopTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Gadgets")
        self.product = Product.objects.create(
            category=self.category, name="Widget", description="A widget",
            price=Decimal("10.00"), stock=5,
        )
        self.user = User.objects.create_user("alice", "a@example.com", "pass12345!")

    def test_home_lists_products_and_search(self):
        response = self.client.get(reverse("home"))
        self.assertContains(response, "Widget")
        response = self.client.get(reverse("home"), {"q": "nomatch"})
        self.assertNotContains(response, "Widget")

    def test_product_detail(self):
        response = self.client.get(self.product.get_absolute_url())
        self.assertEqual(response.status_code, 200)

    def test_add_to_cart_caps_at_stock(self):
        self.client.post(reverse("add_to_cart", args=[self.product.pk]), {"quantity": 99})
        self.assertEqual(self.client.session["cart"][str(self.product.pk)], 5)

    def test_checkout_requires_login(self):
        response = self.client.get(reverse("checkout"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("login"), response.url)

    def test_full_checkout_flow(self):
        self.client.login(username="alice", password="pass12345!")
        self.client.post(reverse("add_to_cart", args=[self.product.pk]), {"quantity": 2})
        response = self.client.post(
            reverse("checkout"),
            {"full_name": "Alice", "address": "1 Main St", "city": "Colombo",
             "postal_code": "00100", "phone": "0771234567"},
        )
        self.assertRedirects(response, reverse("orders"))
        order = Order.objects.get()
        self.assertEqual(order.total, Decimal("20.00"))
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)
        self.assertEqual(self.client.session["cart"], {})

    def test_register_logs_user_in(self):
        response = self.client.post(
            reverse("register"),
            {"username": "bob", "email": "b@example.com",
             "password1": "Str0ngPass!234", "password2": "Str0ngPass!234"},
        )
        self.assertRedirects(response, reverse("home"))
        self.assertTrue(User.objects.filter(username="bob").exists())
