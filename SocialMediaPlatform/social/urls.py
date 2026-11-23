from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    path("", views.feed, name="feed"),
    path("post/new/", views.create_post, name="create_post"),
    path("post/<int:pk>/", views.post_detail, name="post_detail"),
    path("post/<int:pk>/like/", views.like_post, name="like_post"),
    path("post/<int:pk>/delete/", views.delete_post, name="delete_post"),
    path("user/<str:username>/", views.profile, name="profile"),
    path("user/<str:username>/follow/", views.follow_toggle, name="follow_toggle"),
    path("register/", views.register, name="register"),
    path("login/", auth_views.LoginView.as_view(template_name="accounts/login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
]
