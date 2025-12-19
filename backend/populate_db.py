import os
import django
import random
from datetime import time

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from space.models import User, StudySpace

def populate():
    print("Starting data population...")

    # 1. Create Admin
    if not User.objects.filter(username='admin').exists():
        User.objects.create(username='admin', password='adminpassword', role='admin')
        print("Created admin user.")

    # 2. Create Students
    first_names = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 
                   'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

    count = 0
    for _ in range(200):
        fname = random.choice(first_names)
        lname = random.choice(last_names)
        username = f"{fname.lower()}.{lname.lower()}{random.randint(1, 999)}"
        
        if not User.objects.filter(username=username).exists():
            User.objects.create(
                username=username,
                password='password123',
                role='student'
            )
            count += 1
    
    print(f"Created {count} student users.")

    # 3. Create Study Spaces
    spaces_data = [
        {"name": "Library 101 (Quiet Zone)", "location": "Library 1F", "capacity": 50},
        {"name": "Library 202 (Group Study)", "location": "Library 2F", "capacity": 20},
        {"name": "Teaching Building A-301", "location": "Building A", "capacity": 100},
        {"name": "Teaching Building B-105", "location": "Building B", "capacity": 60},
        {"name": "Computer Lab C-201", "location": "Building C", "capacity": 40},
        {"name": "Discussion Room D-1", "location": "Student Center", "capacity": 6},
        {"name": "Discussion Room D-2", "location": "Student Center", "capacity": 6},
        {"name": "Discussion Room D-3", "location": "Student Center", "capacity": 8},
    ]

    for sp in spaces_data:
        if not StudySpace.objects.filter(name=sp["name"]).exists():
            StudySpace.objects.create(
                name=sp["name"],
                location=sp["location"],
                capacity=sp["capacity"],
                open_time=time(8, 0),  # 08:00
                close_time=time(22, 0) # 22:00
            )
            print(f"Created space: {sp['name']}")

    print("Data population completed.")

if __name__ == '__main__':
    populate()
