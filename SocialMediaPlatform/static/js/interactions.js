// Likes, follows and delete confirmation without full page reloads.
// If JavaScript fails, the forms still work as normal POSTs.
document.addEventListener("DOMContentLoaded", function () {
  // Like / unlike
  document.querySelectorAll("form.like-form").forEach(function (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        const data = await postForm(form);
        const button = form.querySelector(".like-btn");
        button.classList.toggle("liked", data.liked);
        button.querySelector(".heart").innerHTML = data.liked ? "&#9829;" : "&#9825;";
        button.querySelector(".like-count").textContent = data.count;
      } catch (err) {
        form.submit();
      }
    });
  });

  // Follow / unfollow
  document.querySelectorAll("form.follow-form").forEach(function (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        const data = await postForm(form);
        const button = form.querySelector(".follow-btn");
        button.textContent = data.following ? "Unfollow" : "Follow";
        button.classList.toggle("secondary", data.following);
        const followers = document.getElementById("followers-count");
        if (followers) followers.textContent = data.followers;
      } catch (err) {
        form.submit();
      }
    });
  });

  // Confirm before deleting a post
  document.querySelectorAll("form.delete-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      if (!confirm("Delete this post? This cannot be undone.")) e.preventDefault();
    });
  });
});
