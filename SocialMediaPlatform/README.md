# Friendzy

A small social network built with Django and SQLite: register/login, profiles with avatar and bio, posts with optional images, likes, comments, and following other users. The home feed shows posts from people you follow (or everyone via the "Everyone" tab).

## Run it (VS Code)

1. Open the `SocialMediaPlatform` project folder in VS Code (File > Open Folder).
2. Open a terminal (Ctrl+`) and create a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate          # Windows
   source venv/bin/activate       # macOS / Linux
   ```
3. Install and set up:
   ```
   pip install -r requirements.txt
   python manage.py makemigrations social
   python manage.py migrate
   python manage.py createsuperuser     # optional, for /admin
   python manage.py runserver
   ```
4. Visit http://127.0.0.1:8000/ and register an account. Create a second account in a private window to try following, likes and comments.

Run the tests with `python manage.py test`.

Uploaded avatars and post images are stored in `media/profiles/` and `media/posts/` (served by Django while `DEBUG = True`).
