from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import Comment, Follow, Post, Profile


class SocialTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@example.com", "pass12345!")
        self.bob = User.objects.create_user("bob", "b@example.com", "pass12345!")
        self.client.login(username="alice", password="pass12345!")

    def test_profile_created_automatically(self):
        self.assertTrue(Profile.objects.filter(user=self.alice).exists())

    def test_login_required(self):
        self.client.logout()
        response = self.client.get(reverse("feed"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("login"), response.url)

    def test_create_post_and_feed(self):
        self.client.post(reverse("create_post"), {"content": "Hello world"})
        post = Post.objects.get()
        self.assertEqual(post.author, self.alice)
        response = self.client.get(reverse("feed"))
        self.assertContains(response, "Hello world")

    def test_feed_only_shows_followed_users(self):
        Post.objects.create(author=self.bob, content="Bob post")
        self.assertNotContains(self.client.get(reverse("feed")), "Bob post")
        Follow.objects.create(follower=self.alice, following=self.bob)
        self.assertContains(self.client.get(reverse("feed")), "Bob post")
        self.assertContains(self.client.get(reverse("feed"), {"tab": "all"}), "Bob post")

    def test_like_toggle_ajax(self):
        post = Post.objects.create(author=self.bob, content="Like me")
        url = reverse("like_post", args=[post.pk])
        response = self.client.post(url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.json(), {"liked": True, "count": 1})
        response = self.client.post(url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        self.assertEqual(response.json(), {"liked": False, "count": 0})

    def test_comment(self):
        post = Post.objects.create(author=self.bob, content="Comment me")
        self.client.post(reverse("post_detail", args=[post.pk]), {"content": "Nice!"})
        self.assertEqual(Comment.objects.get().content, "Nice!")

    def test_follow_toggle_and_self_follow_blocked(self):
        self.client.post(reverse("follow_toggle", args=["bob"]))
        self.assertTrue(Follow.objects.filter(follower=self.alice, following=self.bob).exists())
        self.client.post(reverse("follow_toggle", args=["bob"]))
        self.assertFalse(Follow.objects.exists())
        self.client.post(reverse("follow_toggle", args=["alice"]))
        self.assertFalse(Follow.objects.exists())

    def test_only_author_can_delete(self):
        post = Post.objects.create(author=self.bob, content="Mine")
        response = self.client.post(reverse("delete_post", args=[post.pk]))
        self.assertEqual(response.status_code, 404)
        self.assertTrue(Post.objects.filter(pk=post.pk).exists())

    def test_update_own_bio(self):
        self.client.post(reverse("profile", args=["alice"]), {"bio": "Hi there"})
        self.assertEqual(Profile.objects.get(user=self.alice).bio, "Hi there")

    def test_register(self):
        self.client.logout()
        response = self.client.post(
            reverse("register"),
            {"username": "carol", "email": "c@example.com",
             "password1": "Str0ngPass!234", "password2": "Str0ngPass!234"},
        )
        self.assertRedirects(response, reverse("feed"))
        self.assertTrue(User.objects.filter(username="carol").exists())
