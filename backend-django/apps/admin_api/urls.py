from django.urls import path

from . import views


urlpatterns = [
    path("stats", views.get_stats),
    # GET = list, POST = create (bitta view ichida)
    path("questions", views.questions_collection),
    path("questions/bulk", views.bulk_create_questions),
    # PATCH = update, DELETE = delete (bitta view ichida)
    path("questions/<str:question_id>", views.question_detail),
    path("categories", views.list_categories),
    path("categories/rename", views.rename_category),
]
