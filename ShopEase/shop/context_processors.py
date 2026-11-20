def cart_count(request):
    """Expose the total number of items in the session cart to every template."""
    cart = request.session.get("cart", {})
    return {"cart_count": sum(cart.values())}
