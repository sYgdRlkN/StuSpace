import os
import django
import random
from datetime import time, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.utils import timezone

from space.models import (
    User,
    StudySpace,
    Reservation,
    UsageRecord,
    AbnormalBehavior,
    Feedback,
)

def populate():
    print("Starting data population...")

    now = timezone.now()

    # 1. Create Admin
    admin, created = User.objects.get_or_create(
        username="admin",
        defaults={"password": "adminpassword", "role": "admin", "credit_score": 100},
    )
    if not created:
        admin.role = "admin"
        admin.credit_score = 100
        admin.save(update_fields=["role", "credit_score"])
    print("Ensured admin user.")

    # 2. Create Demo Students (easy for presentation)
    demo_users_spec = [
        {"username": "demo_low", "password": "123456", "role": "student", "credit_score": 55},
        {"username": "demo_mid", "password": "123456", "role": "student", "credit_score": 60},
        {"username": "demo_good", "password": "123456", "role": "student", "credit_score": 80},
        {"username": "demo_high", "password": "123456", "role": "student", "credit_score": 95},
    ]

    demo_users = {}
    for spec in demo_users_spec:
        u, _ = User.objects.get_or_create(
            username=spec["username"],
            defaults={
                "password": spec["password"],
                "role": spec["role"],
                "credit_score": spec["credit_score"],
            },
        )
        # Keep demo users deterministic
        u.password = spec["password"]
        u.role = spec["role"]
        u.credit_score = spec["credit_score"]
        u.save(update_fields=["password", "role", "credit_score"])
        demo_users[spec["username"]] = u

    print("Ensured demo users:", ", ".join(demo_users.keys()))

    # 3. Create Random Students (optional, for richer admin table)
    first_names = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 
                   'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

    count = 0
    for _ in range(80):
        fname = random.choice(first_names)
        lname = random.choice(last_names)
        username = f"{fname.lower()}.{lname.lower()}{random.randint(1, 999)}"
        
        if not User.objects.filter(username=username).exists():
            User.objects.create(
                username=username,
                password='password123',
                role='student',
                credit_score=random.choice([60, 70, 80, 90, 100]),
            )
            count += 1
    
    print(f"Created {count} student users.")

    # 4. Create Study Spaces
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

    # 5. Demo Reservations / Usage / Abnormal / Feedback
    # Pick a few spaces for predictable demo
    space_quiet = StudySpace.objects.get(name="Library 101 (Quiet Zone)")
    space_group = StudySpace.objects.get(name="Library 202 (Group Study)")
    space_discuss = StudySpace.objects.get(name="Discussion Room D-1")

    # Clean up old demo reservations/records for deterministic reruns
    demo_user_ids = [u.user_id for u in demo_users.values()]
    AbnormalBehavior.objects.filter(user_id__in=demo_user_ids).delete()
    Feedback.objects.filter(reservation__user_id__in=demo_user_ids).delete()
    UsageRecord.objects.filter(reservation__user_id__in=demo_user_ids).delete()
    Reservation.objects.filter(user_id__in=demo_user_ids).delete()

    # demo_good: reserved in near future
    Reservation.objects.create(
        user=demo_users["demo_good"],
        space=space_quiet,
        start_time=now + timedelta(minutes=5),
        end_time=now + timedelta(minutes=65),
        status="reserved",
    )

    # demo_high: in use right now
    r_in_use = Reservation.objects.create(
        user=demo_users["demo_high"],
        space=space_group,
        start_time=now - timedelta(minutes=20),
        end_time=now + timedelta(minutes=40),
        status="in_use",
    )
    UsageRecord.objects.create(
        reservation=r_in_use,
        check_in_time=now - timedelta(minutes=15),
        check_out_time=None,
        duration=None,
    )

    # demo_mid: completed yesterday with feedback
    r_completed = Reservation.objects.create(
        user=demo_users["demo_mid"],
        space=space_discuss,
        start_time=now - timedelta(days=1, hours=3),
        end_time=now - timedelta(days=1, hours=1),
        status="completed",
    )
    UsageRecord.objects.create(
        reservation=r_completed,
        check_in_time=r_completed.start_time + timedelta(minutes=3),
        check_out_time=r_completed.end_time,
        duration=120,
    )
    Feedback.objects.create(
        reservation=r_completed,
        rating=5,
        comment="环境很好，预约流程顺畅。",
    )

    # demo_low: no-show (already cancelled) + abnormal record
    r_no_show = Reservation.objects.create(
        user=demo_users["demo_low"],
        space=space_quiet,
        start_time=now - timedelta(hours=2),
        end_time=now - timedelta(hours=1),
        status="cancelled",
    )
    AbnormalBehavior.objects.create(
        user=demo_users["demo_low"],
        space=space_quiet,
        type="no_show",
    )

    # demo_high: overtime abnormal record example (reservation still in_use but already past end_time)
    r_overtime = Reservation.objects.create(
        user=demo_users["demo_high"],
        space=space_discuss,
        start_time=now - timedelta(hours=2),
        end_time=now - timedelta(minutes=10),
        status="in_use",
    )
    UsageRecord.objects.create(
        reservation=r_overtime,
        check_in_time=now - timedelta(hours=2) + timedelta(minutes=5),
        check_out_time=None,
        duration=None,
    )
    AbnormalBehavior.objects.create(
        user=demo_users["demo_high"],
        space=space_discuss,
        type="overtime",
    )

    print("Inserted demo reservations/usage/abnormal/feedback.")

    print("Data population completed.")

if __name__ == '__main__':
    populate()
