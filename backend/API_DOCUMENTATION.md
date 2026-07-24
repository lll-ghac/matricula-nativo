
# API Documentation

## Authentication

*   **POST /api/auth/register** - Register a new user.
*   **POST /api/auth/login** - Login a user and get a JWT token.

## Users

*   **GET /api/users** - Get all users.
*   **PUT /api/users/:id** - Update a user.
*   **DELETE /api/users/:id** - Soft delete a user.

## Students

*   **GET /api/student/check/:rut** - Check if a student is already enrolled.
*   **POST /api/students** - Create a new student enrollment.
*   **PUT /api/students/:id** - Update a student's enrollment.
*   **GET /api/students** - Get all students.
*   **GET /api/students/:id** - Get a single student.

## Apoderados

*   **GET /api/apoderados/check** - Checks if a guardian (apoderado) exists based on their RUT.
    *   **Query Parameter**: `rut` (e.g., `/api/apoderados/check?rut=12345678`). The backend will automatically handle the RUT without hyphen or verification digit for the database query.

## Courses

*   **GET /api/courses** - Get all courses.
*   **POST /api/courses** - Create a new course.
*   **PUT /api/courses/:id** - Update a course.
*   **DELETE /api/courses/:id** - Delete a course.

## Backups

*   **GET /api/backups** - Get all backups.
*   **POST /api/backups** - Create a new backup.
*   **DELETE /api/backups/:id** - Delete a backup.

## Year Management (Sistema de Año Vigente)

*   **GET /api/year/current** - Get the current academic year.
    *   **Response**: `{ year: 2025, activo: 1 }`
    *   **Usage**: Used throughout the frontend to synchronize all documents and receipts
    
*   **POST /api/year/set** - Set the current academic year (Admin only).
    *   **Body**: `{ year: 2025 }`
    *   **Features**: 
      - Automatically creates `alumnos_YYYY` table for the new year
      - Updates all system components in real-time
      - Validates year format and range
    
### Year Management Features:

1. **Dynamic Table Creation**: Automatically creates `alumnos_YYYY` tables when a new year is set
2. **Real-time Synchronization**: All receipts, documents, and UI components update automatically
3. **Multi-year Support**: Each academic year maintains its own student data table
4. **Admin Interface**: User-friendly panel for year management with confirmation dialogs

### Frontend Integration:
```typescript
// All components use this pattern to get current year
const response = await fetch('/api/year/current');
const { year } = await response.json();
```

## Settings (Legacy - Use Year Management instead)

*   **GET /api/settings/current-year** - Get the current school year (deprecated).
*   **PUT /api/settings/current-year** - Set the current school year (deprecated).

