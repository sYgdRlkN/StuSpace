# StuSpace AI Coding Instructions

## Project Overview
StuSpace is a study space reservation system consisting of a Django backend and a vanilla JavaScript frontend. The architecture is decoupled: the backend provides a JSON API, and the frontend consumes it via `fetch`.

## Architecture & Structure
- **Backend (`backend/`)**: Django project.
  - `backend/backend/`: Project settings and main URL config.
  - `backend/space/`: Main application containing models, views, and business logic.
  - **API Style**: Custom JSON API using `django.http.JsonResponse` (not Django Rest Framework).
- **Frontend (`fronted/`)**: Static HTML/JS files.
  - `index.html`, `login.html`: UI pages.
  - `main.js`: API client and UI logic.
- **Database**: SQLite (default), managed via Django ORM.

## Critical Workflows

### Backend Setup & Run
1.  **Environment**:
    ```bash
    conda activate space
    # or
    pip install -r requirements.txt
    ```
2.  **Run Server**:
    ```bash
    cd backend
    python manage.py runserver
    ```
    Server runs at `http://127.0.0.1:8000`.

### Frontend Setup
- Serve `fronted/index.html` using a static file server (e.g., VS Code Live Server extension).
- **Do not** open files directly in the browser (`file://`), as CORS/fetch may fail.

### Database Changes
- Modify `backend/space/models.py`.
- Run migrations:
    ```bash
    cd backend
    python manage.py makemigrations
    python manage.py migrate
    ```

## Code Conventions & Patterns

### Backend (Django)
- **Views**:
    - Located in `backend/space/views.py`.
    - Use function-based views.
    - Decorate API views with `@csrf_exempt` (since frontend is external).
    - **Input**: Parse JSON from `request.body`:
        ```python
        import json
        data = json.loads(request.body)
        ```
    - **Output**: Return `JsonResponse`:
        ```python
        return JsonResponse({"msg": "success", "data": ...})
        ```
- **Authentication**:
    - **Custom User Model**: `space.models.User` is used, NOT Django's built-in `auth.User`.
    - **Mechanism**: Simple `user_id` based auth. The frontend sends `user_id` in the request body for authenticated actions.
    - **Passwords**: Currently stored as plain text (be careful when handling auth logic).
- **CORS**:
    - Handled via `django-cors-headers` middleware AND manually in some views (e.g., `login`).
    - When creating new views, ensure they handle `OPTIONS` requests if not covered by middleware, or rely on `corsheaders` configuration.

### Frontend (JavaScript)
- **API Calls**:
    - Base URL: `http://127.0.0.1:8000/api`.
    - Use `fetch` for requests.
    - Always set `Content-Type: application/json` for POST requests.
- **State Management**:
    - `user_id` is stored in `localStorage` after login.
    - Retrieve it to make authenticated requests: `const userId = localStorage.getItem("user_id");`.

## Common Tasks
- **Adding a new API endpoint**:
    1.  Define view in `backend/space/views.py`.
    2.  Add URL pattern in `backend/space/urls.py` (or `backend/backend/urls.py` if app urls are not included).
    3.  Implement frontend function in `fronted/main.js` to call it.
- **Debugging**:
    - Backend errors appear in the terminal running `runserver`.
    - Frontend errors appear in the browser console (F12).
