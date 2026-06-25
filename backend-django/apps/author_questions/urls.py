from django.urls import path
from . import views

# Public endpoints (require_auth — zakovat.urls da /api/ prefix bilan)
public_urlpatterns = [
    path("author-questions", views.submit_author_question),
]

# Admin endpoints (require_admin — admin_api/urls.py da /api/admin/ prefix bilan)
admin_urlpatterns = [
    path("author-questions", views.admin_list_author_questions),
    path("author-questions/<int:question_id>/approve", views.admin_approve_author_question),
    path("author-questions/<int:question_id>/reject", views.admin_reject_author_question),
]
