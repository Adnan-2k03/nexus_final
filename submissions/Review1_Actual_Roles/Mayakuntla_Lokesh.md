# CAP4001 – Capstone Project Proposal Report
## Individual Report

**Student Name:** Mayakuntla Lokesh  
**Student Register Number:** 22BCE9911  
**Programme:** Bachelor of Technology  
**Semester/Year:** Fall sem (2025-26)  
**Guide(s):** Saroj Kumar Panigrahy  
**Project Title:** A Real-Time Player Finding System  

---

## Team Composition

| Reg. No | Name | Major | Specialization |
|---------|------|-------|-----------------|
| 22BCE9357 | Adnan Hasshad Md | CSE | Core |
| 22BCE20420 | Tatikonda Srilekha | CSE | Core |
| 22BCE9911 | Mayakuntla Lokesh | CSE | Core |
| 22BCE9745 | Thokala Sravan | CSE | Core |

---

## Project and Task Description

### Project Summary
The project, "A Real-Time Player Finding System," is an MVP social platform designed to help users find and connect with others for specific gaming activities. The application will address the challenge of finding compatible teammates or opponents for online games. The MVP will focus on core functionality with an intuitive UI, including user profiles, a public request board, a 1v1 and team finder, and a real-time status system. The approach will utilize modern full-stack technologies to build a responsive, serverless application that prioritizes immediate, action-oriented requests with WebSocket-based real-time updates.

### Individual Role and Tasks
As the backend developer, my primary responsibilities will focus on designing and implementing the server-side application. Specifically, I will:

1. **Backend Architecture & Setup**
   - Configure Express.js server with TypeScript for type safety
   - Establish backend project structure and folder organization
   - Set up development and production environments
   - Configure middleware for authentication, CORS, and error handling

2. **Database Design & Management**
   - Design the complete database schema using Drizzle ORM
   - Create and manage database tables for users, player profiles, requests, notifications, etc.
   - Plan and implement indexing for performance optimization
   - Set up database migrations and synchronization

3. **API Development**
   - Develop REST API endpoints for all core features
   - Implement request validation using Zod schemas
   - Build authentication and authorization logic
   - Implement error handling and response formatting

4. **Business Logic Implementation**
   - Implement player discovery and search functionality with filtering by skill level and game preferences
   - Build user management and profile functionality
   - Develop notification system logic
   - Create real-time update handlers for WebSocket integration

5. **Integration & Testing**
   - Integrate third-party services (OAuth, Firebase, etc.)
   - Implement WebSocket support for real-time features
   - Conduct API testing and validation
   - Optimize database queries and performance

### Approach
The backend development will follow a systematic approach across 4 phases:
- **Phase 1 (Week 1-2):** Backend setup, database design, architecture planning, development environment configuration
- **Phase 2 (Week 3-4):** API endpoint development, database implementation, authentication setup
- **Phase 3 (Week 5-6):** Business logic implementation, WebSocket integration, service integration
- **Phase 4 (Week 7-8):** Testing, optimization, documentation, final refinements

---

## Outcome Matrix

| Outcome | Plan for Demonstrating Outcome |
|---------|--------------------------------|
| a) An ability to apply knowledge of mathematics, science, and engineering | Will apply data structures for player discovery and search functionality; utilize relational database theory for schema design; implement server architecture principles. |
| c) An ability to design a system, component, or process to meet desired needs within realistic constraints | Will design backend system considering API rate limits, database performance, scalability, and cost efficiency constraints. |
| d) An ability to function on multidisciplinary teams | Will collaborate with frontend developer on API specifications, coordinate with project lead on architecture, and support team integration efforts. |
| e) An ability to identify, formulate, and solve engineering problems | Will identify performance bottlenecks, solve database scalability issues, resolve real-time synchronization challenges. |
| g) An ability to communicate effectively | Will document API specifications, create database documentation, provide clear code comments, and communicate technical decisions. |
| k) An ability to use the techniques, skills, and modern engineering tools necessary for engineering practice | Will utilize Express.js, TypeScript, PostgreSQL, Drizzle ORM, WebSocket API, OAuth 2.0, Postman, and version control tools. |

---

## Realistic Constraints

- **Time Management:** Will design and implement all core backend features within 8-week timeline
- **Database Performance:** Will optimize queries and implement proper indexing for efficiency
- **Scalability:** Will design for eventual scaling beyond initial user base
- **Real-time Requirements:** Will implement WebSocket support with proper connection management
- **Service Integration:** Will manage multiple third-party service integrations
- **Code Quality:** Will maintain clean, well-documented code throughout development

---

## Engineering Standards

- **Backend Architecture:** Will follow RESTful principles and modern server design patterns
- **Database Standards:** Will adhere to normalized database design, proper indexing, and referential integrity
- **Code Quality:** Will utilize TypeScript strict mode, proper error handling, and consistent code structure
- **API Standards:** Will implement proper HTTP status codes, validation, and documentation
- **Security Standards:** Will implement input validation, secure authentication, and data protection
- **Performance:** Will optimize queries, implement caching where appropriate, and monitor performance
- **Documentation:** Will maintain API documentation, database documentation, and code comments
- **Version Control:** Will use Git with meaningful commits and proper branch management
