from django.urls import path
from . import views

urlpatterns = [
    path("author-questions", views.submit_author_question),
]
