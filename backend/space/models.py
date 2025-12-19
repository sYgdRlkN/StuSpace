from django.db import models

# Create your models here.

class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=100)
    role = models.CharField(max_length=10)
    credit_score = models.IntegerField(default=100)

    class Meta:
        db_table = 'user'


class StudySpace(models.Model):
    space_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    capacity = models.IntegerField()
    open_time = models.TimeField()
    close_time = models.TimeField()

    class Meta:
        db_table = 'study_space'


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('reserved', 'Reserved'),
        ('in_use', 'In Use'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    reservation_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)
    space = models.ForeignKey(StudySpace, db_column='space_id', on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='reserved'
    )

    class Meta:
        db_table = 'reservation'


class UsageRecord(models.Model):
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE)
    check_in_time = models.DateTimeField(null=True)
    check_out_time = models.DateTimeField(null=True)
    duration = models.IntegerField(null=True)

    class Meta:
        db_table = 'usage_record'


class AbnormalBehavior(models.Model):
    TYPE_CHOICES = [
        ('no_show', 'No Show'),
        ('overtime', 'Overtime'),
    ]
    abnormal_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, db_column='user_id', on_delete=models.CASCADE)
    space = models.ForeignKey(StudySpace, db_column='space_id', on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    record_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'abnormal_behavior'


class Feedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE)
    rating = models.IntegerField()  # 1-5
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback'
