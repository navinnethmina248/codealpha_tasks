// Shared helpers + behaviour used on every page.
function getCsrfToken(form) {
  const input = form.querySelector("input[name=csrfmiddlewaretoken]");
  return input ? input.value : "";
}

// Submit a form with fetch and return parsed JSON (the Django views detect the AJAX header).
async function postForm(form) {
  const response = await fetch(form.action, {
    method: "POST",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRFToken": getCsrfToken(form),
    },
    body: new FormData(form),
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Request failed: " + response.status);
  return response.json();
}

document.addEventListener("DOMContentLoaded", function () {
  // Auto-dismiss flash messages after 4 seconds.
  document.querySelectorAll(".messages .msg").forEach(function (msg) {
    setTimeout(function () {
      msg.style.transition = "opacity .4s";
      msg.style.opacity = "0";
      setTimeout(function () { msg.remove(); }, 400);
    }, 4000);
  });
});
