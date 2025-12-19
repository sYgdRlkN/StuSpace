from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from .models import User, StudySpace, Reservation, UsageRecord, AbnormalBehavior
import json
from datetime import datetime, timedelta

# Helper for CORS headers (if middleware isn't enough or for OPTIONS)
def cors_response(data, status=200):
    response = JsonResponse(data, status=status, safe=False)
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@csrf_exempt
def register(request):
    if request.method == "OPTIONS":
        return cors_response({})
    
    if request.method != "POST":
        return cors_response({"msg": "method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return cors_response({"msg": "missing username or password"}, status=400)
            
        if User.objects.filter(username=username).exists():
            return cors_response({"msg": "username already exists"}, status=400)
            
        # Create user (default role: student)
        user = User.objects.create(
            username=username,
            password=password, # Note: In production, hash this!
            role='student'
        )
        
        return cors_response({"msg": "success", "user_id": user.user_id})
        
    except json.JSONDecodeError:
        return cors_response({"msg": "invalid json"}, status=400)
    except Exception as e:
        return cors_response({"msg": str(e)}, status=500)

@csrf_exempt
def login(request):
    if request.method == "OPTIONS":
        return cors_response({})

    if request.method != "POST":
        return cors_response({"msg": "method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")

        user = User.objects.get(username=username, password=password)
        return cors_response({
            "msg": "success",
            "user_id": user.user_id,
            "role": user.role,
            "username": user.username
        })
    except User.DoesNotExist:
        return cors_response({"msg": "fail"}, status=401)
    except Exception as e:
        return cors_response({"msg": str(e)}, status=500)

def space_list(request):
    # Simple GET request, usually handled by middleware for CORS, but let's be safe
    now = timezone.now()
    # Check availability for the next hour by default
    one_hour_later = now + timedelta(hours=1)

    spaces = StudySpace.objects.all()
    result = []

    for s in spaces:
        # Count active reservations in the next hour
        reserved_count = Reservation.objects.filter(
            space_id=s.space_id,
            start_time__lt=one_hour_later,
            end_time__gt=now,
            status='reserved'
        ).count()

        result.append({
            "space_id": s.space_id,
            "name": s.name,
            "location": s.location,
            "capacity": s.capacity,
            "available": max(s.capacity - reserved_count, 0)
        })

    return cors_response(result)

@csrf_exempt
@transaction.atomic
def reserve_space(request):
    if request.method == "OPTIONS":
        return cors_response({})

    if request.method != "POST":
        return cors_response({"msg": "method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        user_id = data.get("user_id")
        space_id = data.get("space_id")
        
        # Parse times (handling potential 'Z' for UTC)
        start_str = data.get("start_time").replace("Z", "+00:00")
        end_str = data.get("end_time").replace("Z", "+00:00")
        
        start_time = datetime.fromisoformat(start_str)
        end_time = datetime.fromisoformat(end_str)

        # Lock the space row for update to prevent race conditions
        try:
            space = StudySpace.objects.select_for_update().get(space_id=space_id)
        except StudySpace.DoesNotExist:
            return cors_response({"msg": "space not found"}, status=404)

        # 1. Capacity Check (Global capacity of the room)
        # Note: This logic assumes 'capacity' is total seats. 
        # We need to count *current* reservations overlapping with requested time.
        current_reservations = Reservation.objects.filter(
            space_id=space.space_id,
            status='reserved',
            start_time__lt=end_time,
            end_time__gt=start_time
        ).count()
        
        if current_reservations >= space.capacity:
            return cors_response({"msg": "full"}, status=400)

        # 2. Duplicate Reservation Check (Same user, same space, overlapping time? Or just same space?)
        # Usually: User shouldn't have *any* overlapping reservation, or maybe just not in this space.
        # Let's check if user has ANY reservation in this time slot to prevent double booking themselves.
        user_conflict = Reservation.objects.filter(
            user_id=user_id,
            status='reserved',
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exists()

        if user_conflict:
            return cors_response({"msg": "time conflict"}, status=400)

        # Create Reservation
        Reservation.objects.create(
            user_id=user_id,
            space_id=space.space_id,
            start_time=start_time,
            end_time=end_time,
            status='reserved'
        )

        return cors_response({"msg": "success"})

    except Exception as e:
        return cors_response({"msg": str(e)}, status=500)

def my_reservations(request):
    user_id = request.GET.get("user_id")
    if not user_id:
        return cors_response({"msg": "missing user_id"}, status=400)

    reservations = Reservation.objects.filter(
        user_id=user_id
    ).select_related("space").order_by("-start_time")

    result = []
    for r in reservations:
        result.append({
            "reservation_id": r.reservation_id,
            "space_name": r.space.name,
            "location": r.space.location,
            "start_time": r.start_time.isoformat(),
            "end_time": r.end_time.isoformat(),
            "status": r.status
        })

    return cors_response(result)

def admin_overview(request):
    user_id = request.GET.get("user_id")
    
    try:
        user = User.objects.get(user_id=user_id)
        if user.role != 'admin':
            return cors_response({"msg": "permission denied"}, status=403)
            
        total_spaces = StudySpace.objects.count()
        total_capacity = StudySpace.objects.aggregate(total=Sum("capacity"))["total"] or 0
        
        active_reservations = Reservation.objects.filter(status="reserved").count()
        history_reservations = Reservation.objects.exclude(status="reserved").count()
        
        return cors_response({
            "total_spaces": total_spaces,
            "total_capacity": total_capacity,
            "active_reservations": active_reservations,
            "history_reservations": history_reservations
        })
        
    except User.DoesNotExist:
        return cors_response({"msg": "user not found"}, status=404)

@csrf_exempt
def check_in(request):
    if request.method == "OPTIONS":
        return cors_response({})
    if request.method != "POST":
        return cors_response({"msg": "method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        reservation_id = data.get("reservation_id")
        user_id = data.get("user_id")

        reservation = Reservation.objects.get(reservation_id=reservation_id)
        
        if reservation.user_id != user_id:
            return cors_response({"msg": "permission denied"}, status=403)
            
        if reservation.status != 'reserved':
            return cors_response({"msg": "invalid status"}, status=400)

        # Time check: Allow check-in 15 mins before start until 15 mins after start
        now = timezone.now()
        if now < reservation.start_time - timedelta(minutes=15):
             return cors_response({"msg": "too early"}, status=400)
        
        reservation.status = 'in_use'
        reservation.save()
        
        UsageRecord.objects.create(
            reservation=reservation,
            check_in_time=now
        )
        
        return cors_response({"msg": "success"})

    except Reservation.DoesNotExist:
        return cors_response({"msg": "reservation not found"}, status=404)
    except Exception as e:
        return cors_response({"msg": str(e)}, status=500)

@csrf_exempt
def check_out(request):
    if request.method == "OPTIONS":
        return cors_response({})
    if request.method != "POST":
        return cors_response({"msg": "method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        reservation_id = data.get("reservation_id")
        user_id = data.get("user_id")

        reservation = Reservation.objects.get(reservation_id=reservation_id)
        
        if reservation.user_id != user_id:
            return cors_response({"msg": "permission denied"}, status=403)
            
        if reservation.status != 'in_use':
             return cors_response({"msg": "not checked in"}, status=400)

        now = timezone.now()
        reservation.status = 'completed'
        reservation.save()
        
        # Update UsageRecord
        record = UsageRecord.objects.filter(reservation=reservation).first()
        if record:
            record.check_out_time = now
            # Calculate duration in minutes
            duration = int((now - record.check_in_time).total_seconds() / 60)
            record.duration = duration
            record.save()
        
        return cors_response({"msg": "success"})

    except Reservation.DoesNotExist:
        return cors_response({"msg": "reservation not found"}, status=404)
    except Exception as e:
        return cors_response({"msg": str(e)}, status=500)

@csrf_exempt
def check_violations(request):
    if request.method == "OPTIONS":
        return cors_response({})
        
    now = timezone.now()
    
    # 1. Check No-Shows (Reserved but start_time + 30min < now)
    no_shows = Reservation.objects.filter(
        status='reserved',
        start_time__lt=now - timedelta(minutes=30)
    )
    
    count_no_show = 0
    for r in no_shows:
        r.status = 'cancelled'
        r.save()
        AbnormalBehavior.objects.create(
            user=r.user,
            space=r.space,
            type='no_show'
        )
        count_no_show += 1
        
    # 2. Check Overtime (In Use but end_time < now)
    overtimes = Reservation.objects.filter(
        status='in_use',
        end_time__lt=now
    )
    
    return cors_response({
        "msg": "success", 
        "processed_no_shows": count_no_show,
        "current_overtimes": overtimes.count()
    })
