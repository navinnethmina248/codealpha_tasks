from decimal import Decimal

from django.db import migrations


def add_beauty_products(apps, schema_editor):
    Category = apps.get_model("shop", "Category")
    Product = apps.get_model("shop", "Product")
    beauty, _ = Category.objects.get_or_create(name="Beauty")

    Product.objects.update_or_create(
        name="Eyeshadow Palette",
        defaults={
            "category": beauty,
            "description": "Crown eyeshadow palette with a range of matte and shimmer shades.",
            "price": Decimal("19.99"),
            "stock": 28,
            "image_url": "/static/images/eyeshadow-palette.jpg",
        },
    )
    Product.objects.update_or_create(
        name="Makeup Brush Set",
        defaults={
            "category": beauty,
            "description": "Makeup brush set with face and eye brushes and a blending sponge.",
            "price": Decimal("16.99"),
            "stock": 40,
            "image_url": "/static/images/makeup-brush-set.jpg",
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0002_alter_product_image_url"),
    ]

    operations = [
        migrations.RunPython(add_beauty_products, migrations.RunPython.noop),
    ]
