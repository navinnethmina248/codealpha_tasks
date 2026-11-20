# ShopEase

A small full-stack e-commerce site built with Django and SQLite: product catalogue with search and categories, session cart, user registration/login, checkout and order history, plus the Django admin for managing products and orders.

## Run it (VS Code)

1. Open the `ShopEase` folder in VS Code (File > Open Folder).
2. Open a terminal (Ctrl+`) and create a virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate          # Windows
   source venv/bin/activate       # macOS / Linux
   ```
3. Install and set up:
   ```
   pip install -r requirements.txt
   python manage.py makemigrations shop
   python manage.py migrate
   python manage.py seed                 # optional sample products
   python manage.py createsuperuser      # for /admin
   python manage.py runserver
   ```
4. Visit http://127.0.0.1:8000/ (admin at /admin/).

Run the tests with `python manage.py test`.

Tip: press F5 in VS Code to start the server with the included debug configuration (select your venv as the Python interpreter first).
