import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("DESCRIBE reservation;")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
