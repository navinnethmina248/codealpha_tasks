from decimal import Decimal

from django.core.management.base import BaseCommand

from shop.models import Category, Product

SAMPLE = {
    "Electronics": [
        (
            "Wireless Headphones",
            "Over-ear Bluetooth headphones with 30h battery.",
            "59.99",
            25,
            "/static/images/wireless-headphones.jpg",
        ),
        ("Smart Watch", "Fitness tracking, heart-rate monitor and notifications.", "89.50", 15, ""),
        (
            "Portable Speaker",
            "Waterproof speaker with deep bass.",
            "34.00",
            40,
            "/static/images/bluetooth-speaker.jpg",
        ),
    ],
    "Home": [
        (
            "Ceramic Mug Set",
            "Set of four 350ml mugs.",
            "19.99",
            60,
            "/static/images/ceramic-coffee-mug.jpg",
        ),
        (
            "LED Desk Lamp",
            "Dimmable lamp with USB charging port.",
            "27.25",
            30,
            "/static/images/table-lamp.jpg",
        ),
    ],
    "Fashion": [
        (
            "Canvas Backpack",
            "Durable 20L backpack with laptop sleeve.",
            "42.00",
            20,
            "/static/images/travel-backpack.jpg",
        ),
        (
            "Classic Sunglasses",
            "UV400 protection, lightweight frame.",
            "15.75",
            50,
            "",
        ),
    ],
    "Beauty": [
        (
            "Eyeshadow Palette",
            "Crown eyeshadow palette with a range of matte and shimmer shades.",
            "19.99",
            28,
            "/static/images/eyeshadow-palette.jpg",
        ),
        (
            "Makeup Brush Set",
            "Makeup brush set with face and eye brushes and a blending sponge.",
            "16.99",
            40,
            "/static/images/makeup-brush-set.jpg",
        ),
    ],
}


class Command(BaseCommand):
    help = "Load sample categories and products."

    def handle(self, *args, **options):
        created = 0
        for category_name, products in SAMPLE.items():
            category, _ = Category.objects.get_or_create(name=category_name)
            for name, description, price, stock, image_url in products:
                _, was_created = Product.objects.get_or_create(
                    name=name,
                    defaults={
                        "category": category,
                        "description": description,
                        "price": Decimal(price),
                        "stock": stock,
                        "image_url": image_url,
                    },
                )
                created += was_created
        self.stdout.write(self.style.SUCCESS(f"Seeded {created} new products."))
