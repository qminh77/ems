# Event Management System (EMS)

## Overview

This is a full-stack event management system built with React (frontend) and Express.js (backend). The application allows users to manage events and attendees with QR code-based check-in functionality. It uses Replit authentication for secure access, PostgreSQL for data storage via Drizzle ORM, and includes comprehensive event and student management features with real-time check-in tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Framework**: Shadcn/ui components with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Framework**: Express.js with TypeScript for API development
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit OIDC integration with Passport.js for secure authentication
- **Session Management**: Express sessions with PostgreSQL storage
- **File Uploads**: QR code generation and storage for student check-ins
- **API Design**: RESTful endpoints with proper error handling and validation

### Database Schema
- **Users**: Stores user profiles from Replit authentication
- **Events**: Event management with dates, times, locations, and status
- **Attendees**: Student/participant information linked to events
- **Check-in Logs**: Tracks attendance with timestamps and QR code validation
- **Sessions**: Secure session storage for authentication persistence

### Authentication & Authorization
- **OIDC Integration**: Uses Replit's OpenID Connect for secure authentication
- **Session-based Auth**: Maintains user sessions with PostgreSQL storage
- **Route Protection**: Middleware-based authentication checks on protected routes
- **Unauthorized Handling**: Automatic redirect to login for expired sessions

### Key Features
- **Event Management**: Create, edit, delete, and manage events with full CRUD operations
- **Student Management**: Add students to events with automatic QR code generation
- **QR Code Check-in**: Generate unique QR codes for each student and scan for attendance
- **Real-time Dashboard**: Live statistics showing events, students, and check-in counts
- **Responsive Design**: Mobile-first design with adaptive sidebar and mobile menu
- **File Management**: QR code generation, storage, and download functionality

## External Dependencies

### Database
- **Neon Database**: PostgreSQL database hosting service
- **Drizzle ORM**: Type-safe database operations with schema management
- **Connection Pooling**: Neon serverless pooling for optimal performance

### Authentication
- **Replit OIDC**: OpenID Connect authentication provider
- **Passport.js**: Authentication middleware with session management
- **Session Store**: PostgreSQL-backed session storage for persistence

### UI Components
- **Radix UI**: Accessible primitive components for complex UI elements
- **Shadcn/ui**: Pre-built component library with customizable styling
- **Lucide React**: Consistent icon library for UI elements

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Static type checking for both frontend and backend
- **ESBuild**: Fast bundling for production builds
- **Replit Integration**: Development environment optimizations

### Utility Libraries
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Performant form handling with validation
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting utilities
- **QRCode**: QR code generation for student check-ins