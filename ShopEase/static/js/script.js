document.addEventListener("DOMContentLoaded", function () {
  // Auto-dismiss flash messages after 4 seconds.
  document.querySelectorAll(".messages .msg").forEach(function (msg) {
    setTimeout(function () {
      msg.style.transition = "opacity .4s";
      msg.style.opacity = "0";
      setTimeout(function () { msg.remove(); }, 400);
    }, 4000);
  });

  // Ask for confirmation before removing an item from the cart.
  document.querySelectorAll("form[action*='/cart/remove/']").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      if (!confirm("Remove this item from your cart?")) e.preventDefault();
    });
  });
});
