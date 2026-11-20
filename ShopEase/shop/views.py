from decimal import Decimal

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import CheckoutForm, RegisterForm
from .models import Category, Order, OrderItem, Product


# ---------- helpers ----------
def _build_cart(request):
    """Return (items, total) from the session cart. Drops products that no longer exist."""
    cart = request.session.get("cart", {})
    products = Product.objects.filter(id__in=[int(pk) for pk in cart.keys()])
    items, total = [], Decimal("0.00")
    for product in products:
        quantity = cart[str(product.pk)]
        subtotal = product.price * quantity
        items.append({"product": product, "quantity": quantity, "subtotal": subtotal})
        total += subtotal
    return items, total


def _parse_quantity(value, default=1):
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return default


# ---------- catalogue ----------
def home(request):
    products = Product.objects.select_related("category")
    categories = Category.objects.all()
    query = request.GET.get("q", "").strip()
    category_id = request.GET.get("category", "")

    if query:
        products = products.filter(Q(name__icontains=query) | Q(description__icontains=query))
    if category_id.isdigit():
        products = products.filter(category_id=int(category_id))

    return render(
        request,
        "home.html",
        {
            "products": products,
            "categories": categories,
            "query": query,
            "selected_category": int(category_id) if category_id.isdigit() else None,
        },
    )


def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)
    return render(request, "product_detail.html", {"product": product})


# ---------- cart ----------
def cart_view(request):
    items, total = _build_cart(request)
    return render(request, "cart.html", {"items": items, "total": total})


@require_POST
def add_to_cart(request, pk):
    product = get_object_or_404(Product, pk=pk)
    quantity = _parse_quantity(request.POST.get("quantity"), default=1) or 1
    cart = request.session.get("cart", {})
    new_quantity = cart.get(str(pk), 0) + quantity

    if new_quantity > product.stock:
        new_quantity = product.stock
        messages.warning(request, f"Only {product.stock} of {product.name} in stock.")
    if new_quantity <= 0:
        messages.error(request, f"{product.name} is out of stock.")
        return redirect("product_detail", pk=pk)

    cart[str(pk)] = new_quantity
    request.session["cart"] = cart
    messages.success(request, f"Added {product.name} to your cart.")
    return redirect("cart")


@require_POST
def update_cart(request, pk):
    product = get_object_or_404(Product, pk=pk)
    quantity = _parse_quantity(request.POST.get("quantity"), default=1)
    cart = request.session.get("cart", {})

    if quantity == 0:
        cart.pop(str(pk), None)
    else:
        if quantity > product.stock:
            quantity = product.stock
            messages.warning(request, f"Only {product.stock} of {product.name} in stock.")
        cart[str(pk)] = quantity
    request.session["cart"] = cart
    return redirect("cart")


@require_POST
def remove_from_cart(request, pk):
    cart = request.session.get("cart", {})
    cart.pop(str(pk), None)
    request.session["cart"] = cart
    messages.info(request, "Item removed from your cart.")
    return redirect("cart")


# ---------- checkout & orders ----------
@login_required
def checkout(request):
    items, total = _build_cart(request)
    if not items:
        messages.info(request, "Your cart is empty.")
        return redirect("home")

    if request.method == "POST":
        form = CheckoutForm(request.POST)
        if form.is_valid():
            with transaction.atomic():
                # Lock the product rows so stock can't be oversold.
                locked = {
                    p.pk: p
                    for p in Product.objects.select_for_update().filter(
                        pk__in=[i["product"].pk for i in items]
                    )
                }
                for item in items:
                    product = locked[item["product"].pk]
                    if item["quantity"] > product.stock:
                        messages.error(
                            request, f"Sorry, only {product.stock} of {product.name} left."
                        )
                        return redirect("cart")

                order = form.save(commit=False)
                order.user = request.user
                order.save()
                for item in items:
                    product = locked[item["product"].pk]
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        price=product.price,
                        quantity=item["quantity"],
                    )
                    product.stock -= item["quantity"]
                    product.save(update_fields=["stock"])

            request.session["cart"] = {}
            messages.success(request, f"Order #{order.pk} placed. Thank you!")
            return redirect("orders")
    else:
        form = CheckoutForm(initial={"full_name": request.user.get_full_name()})

    return render(request, "checkout.html", {"form": form, "items": items, "total": total})


@login_required
def orders(request):
    user_orders = Order.objects.filter(user=request.user).prefetch_related("items")
    return render(request, "orders.html", {"orders": user_orders})


# ---------- auth ----------
def register(request):
    if request.user.is_authenticated:
        return redirect("home")
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Welcome to ShopEase! Your account is ready.")
            return redirect("home")
    else:
        form = RegisterForm()
    return render(request, "register.html", {"form": form})
