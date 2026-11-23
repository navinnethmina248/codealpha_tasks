// Create-post page: live character counter and image preview.
document.addEventListener("DOMContentLoaded", function () {
  const textarea = document.querySelector("#post-form textarea");
  const counter = document.getElementById("char-count");
  if (textarea && counter) {
    textarea.setAttribute("placeholder", "Share something with the community...");
    const update = function () { counter.textContent = textarea.value.length; };
    textarea.addEventListener("input", update);
    update();
  }

  const fileInput = document.querySelector("#post-form input[type=file]");
  const preview = document.getElementById("image-preview");
  if (fileInput && preview) {
    fileInput.addEventListener("change", function () {
      const file = fileInput.files[0];
      if (file && file.type.startsWith("image/")) {
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    });
  }
});
