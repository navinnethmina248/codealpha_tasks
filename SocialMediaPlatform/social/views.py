from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST

from .forms import CommentForm, PostForm, ProfileForm, RegisterForm
from .models import Follow, Post, Profile


# ---------- helpers ----------
def _is_ajax(request):
    return request.headers.get("x-requested-with") == "XMLHttpRequest"


def _safe_redirect(request, fallback, *args):
    """Redirect back to ?next / the referring page when it is on this site."""
    target = request.POST.get("next") or request.META.get("HTTP_REFERER", "")
    if target and url_has_allowed_host_and_scheme(target, allowed_hosts={request.get_host()}):
        return redirect(target)
    return redirect(fallback, *args)


def _annotated_posts(queryset):
    return queryset.select_related("author", "author__profile").annotate(
        like_count=Count("likes", distinct=True),
        comment_count=Count("comments", distinct=True),
    )


def _paginate(request, queryset, per_page=10):
    return Paginator(queryset, per_page).get_page(request.GET.get("page"))


def _liked_ids(user, page):
    return set(
        user.liked_posts.filter(pk__in=[p.pk for p in page]).values_list("pk", flat=True)
    )


# ---------- feed & posts ----------
@login_required
def feed(request):
    tab = request.GET.get("tab", "following")
    posts = Post.objects.all()
    if tab != "all":
        tab = "following"
        ids = list(request.user.following_set.values_list("following_id", flat=True))
        ids.append(request.user.id)
        posts = posts.filter(author_id__in=ids)

    page = _paginate(request, _annotated_posts(posts))
    suggestions = (
        User.objects.exclude(pk=request.user.pk)
        .exclude(followers_set__follower=request.user)
        .select_related("profile")[:5]
    )
    return render(
        request,
        "posts/feed.html",
        {
            "page": page,
            "tab": tab,
            "liked_ids": _liked_ids(request.user, page),
            "suggestions": suggestions,
        },
    )


@login_required
def create_post(request):
    if request.method == "POST":
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            messages.success(request, "Your post is live.")
            return redirect("feed")
    else:
        form = PostForm()
    return render(request, "posts/create_post.html", {"form": form})


@login_required
def post_detail(request, pk):
    post = get_object_or_404(_annotated_posts(Post.objects.all()), pk=pk)

    if request.method == "POST":
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.post = post
            comment.author = request.user
            comment.save()
            messages.success(request, "Comment added.")
            return redirect("post_detail", pk=pk)
    else:
        form = CommentForm()

    comments = post.comments.select_related("author", "author__profile")
    return render(
        request,
        "posts/post_detail.html",
        {
            "post": post,
            "comments": comments,
            "form": form,
            "liked_ids": {post.pk} if post.likes.filter(pk=request.user.pk).exists() else set(),
        },
    )


@login_required
@require_POST
def like_post(request, pk):
    post = get_object_or_404(Post, pk=pk)
    if post.likes.filter(pk=request.user.pk).exists():
        post.likes.remove(request.user)
        liked = False
    else:
        post.likes.add(request.user)
        liked = True

    if _is_ajax(request):
        return JsonResponse({"liked": liked, "count": post.likes.count()})
    return _safe_redirect(request, "post_detail", pk)


@login_required
@require_POST
def delete_post(request, pk):
    post = get_object_or_404(Post, pk=pk, author=request.user)
    post.delete()
    messages.info(request, "Post deleted.")
    return redirect("feed")


# ---------- profiles ----------
@login_required
def profile(request, username):
    owner = get_object_or_404(User.objects.select_related("profile"), username=username)
    profile_obj, _ = Profile.objects.get_or_create(user=owner)
    is_own = owner == request.user

    if request.method == "POST":
        if not is_own:
            return redirect("profile", username=username)
        form = ProfileForm(request.POST, request.FILES, instance=profile_obj)
        if form.is_valid():
            form.save()
            messages.success(request, "Profile updated.")
            return redirect("profile", username=username)
    else:
        form = ProfileForm(instance=profile_obj) if is_own else None

    page = _paginate(request, _annotated_posts(owner.posts.all()))
    return render(
        request,
        "accounts/profile.html",
        {
            "owner": owner,
            "form": form,
            "is_own": is_own,
            "is_following": Follow.objects.filter(
                follower=request.user, following=owner
            ).exists(),
            "followers_count": owner.followers_set.count(),
            "following_count": owner.following_set.count(),
            "page": page,
            "liked_ids": _liked_ids(request.user, page),
        },
    )


@login_required
@require_POST
def follow_toggle(request, username):
    target = get_object_or_404(User, username=username)
    if target == request.user:
        messages.error(request, "You can't follow yourself.")
        return redirect("profile", username=username)

    relation = Follow.objects.filter(follower=request.user, following=target)
    if relation.exists():
        relation.delete()
        following = False
    else:
        Follow.objects.create(follower=request.user, following=target)
        following = True

    if _is_ajax(request):
        return JsonResponse(
            {"following": following, "followers": target.followers_set.count()}
        )
    return _safe_redirect(request, "profile", username)


# ---------- auth ----------
def register(request):
    if request.user.is_authenticated:
        return redirect("feed")
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Welcome! Your account is ready.")
            return redirect("feed")
    else:
        form = RegisterForm()
    return render(request, "accounts/register.html", {"form": form})
