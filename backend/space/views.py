from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import User, StudySpace, Reservation
import json
from datetime import datetime, timedelta
from django.utils import timezone




@csrf_exempt
def login(request):
    # ===== 处理 OPTIONS 预检 =====
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    # ===== 只允许 POST =====
    if request.method != "POST":
        return JsonResponse({"msg": "method not allowed"}, status=405)

    response = JsonResponse({})

    # ⭐ 给真正的 POST 响应也加 CORS
    response["Access-Control-Allow-Origin"] = "*"

    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        response.content = json.dumps({"msg": "invalid json"})
        return response

    username = data.get("username")
    password = data.get("password")

    try:
        user = User.objects.get(username=username, password=password)
        response.content = json.dumps({
            "msg": "success",
            "user_id": user.user_id
        })
        return response
    except User.DoesNotExist:
        response.content = json.dumps({"msg": "fail"})
        return response



def space_list(request):
    now = timezone.now()
    one_hour_later = now + timedelta(hours=1)

    spaces = StudySpace.objects.all()
    result = []

    for s in spaces:
        reserved_count = Reservation.objects.filter(
            space_id=s.space_id,
            start_time__lt=one_hour_later,
            end_time__gt=now
        ).count()

        result.append({
            "space_id": s.space_id,
            "name": s.name,
            "location": s.location,
            "capacity": s.capacity,
            "available": max(s.capacity - reserved_count, 0)
        })

    return JsonResponse(result, safe=False)


@csrf_exempt
def reserve_space(request):
    if request.method == "POST":
        data = json.loads(request.body)

        start_time = datetime.fromisoformat(data["start_time"].replace("Z", ""))
        end_time = datetime.fromisoformat(data["end_time"].replace("Z", ""))

        space = StudySpace.objects.get(space_id=data["space_id"])

        reserved_count = Reservation.objects.filter(
            space_id=space.space_id,
            start_time__lt=end_time,
            end_time__gt=start_time
        ).count()

        if reserved_count >= space.capacity:
            return JsonResponse({"msg": "full"}, status=400)

        Reservation.objects.create(
            user_id=data["user_id"],
            space_id=space.space_id,
            start_time=start_time,
            end_time=end_time,
            status='reserved'
        )

        return JsonResponse({"msg": "success"})
