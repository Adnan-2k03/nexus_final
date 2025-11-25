# CAP4001 – Capstone Project Proposal Report
## Individual Report

**Student Name:** Adnan Hasshad Md  
**Student Register Number:** 22BCE9357  
**Programme:** Bachelor of Technology  
**Semester/Year:** Fall sem (2025-26)  
**Guide(s):** Saroj Kumar Panigrahy  
**Project Title:** A Real-Time Player Matching System  

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
The project, "A Real-Time Player Matching System," is an MVP social platform designed to help users find and connect with others for specific gaming activities. The application addresses the challenge of finding compatible teammates or opponents for online games. The MVP focuses on core functionality with an intuitive UI, including user profiles, a public request board, a 1v1 and team finder, and a real-time status system. The approach utilizes modern full-stack technologies to build a responsive, serverless application that prioritizes immediate, action-oriented requests with WebSocket-based real-time updates.

### Individual Role and Tasks
As a core developer, my responsibilities encompassed the comprehensive backend architecture and database design. Specifically, I:

1. **Backend Infrastructure Development**
   - Designed and implemented the Express.js server with TypeScript for type safety
   - Established the complete REST API with 15+ endpoints covering authentication, user management, matchmaking, and notifications
   - Implemented WebSocket integration for real-time status updates and instant notifications using ws library
   - Configured session management and CORS for secure cross-origin requests

2. **Database Schema Design & Management**
   - Designed the complete database schema using Drizzle ORM with PostgreSQL
   - Created tables for users, match requests, match history, hidden matches, notifications, and connection records
   - Implemented proper relationships, constraints, and indexing for optimal query performance
   - Configured automated database migration and synchronization using drizzle-kit

3. **Core Business Logic Implementation**
   - Implemented user authentication with Google OAuth 2.0 integration
   - Built the matchmaking algorithm considering game preferences, skill levels, and availability
   - Created notification system with real-time WebSocket events for match updates
   - Developed user connection tracking and hiding mechanism for preference management

4. **API Development & Integration**
   - Built RESTful endpoints for user profiles, match requests, and connection management
   - Implemented request validation using Zod schemas for type-safe input handling
   - Integrated third-party services (Firebase, 100ms, AWS S3) for extended functionality
   - Created middleware for authentication, logging, and error handling

### Approach
The development followed an iterative approach:
- **Phase 1 (Week 1-2):** Requirements analysis, database schema design, and architectural planning
- **Phase 2 (Week 3-4):** Backend infrastructure setup, API endpoint development, and authentication implementation
- **Phase 3 (Week 5-6):** Real-time functionality implementation, database optimization, and security hardening
- **Phase 4 (Week 7-8):** Testing, bug fixes, performance optimization, and documentation

---

## Outcome Matrix

| Outcome | Plan for Demonstrating Outcome |
|---------|--------------------------------|
| a) An ability to apply knowledge of mathematics, science, and engineering | Applied data structures and algorithms for efficient matchmaking logic; utilized relational database theory for schema design; implemented engineering principles in system architecture ensuring scalability and maintainability. |
| c) An ability to design a system, component, or process to meet desired needs within realistic constraints | Designed the backend system architecture considering API rate limits, database performance, real-time constraints, and production deployment. Implemented caching strategies and query optimization to handle concurrent users efficiently. |
| d) An ability to function on multidisciplinary teams | Coordinated with frontend developers on API contracts, worked with team members on database schema validation, and ensured proper integration between all system components through documentation and code reviews. |
| e) An ability to identify, formulate, and solve engineering problems | Identified matchmaking algorithm complexity and implemented efficient solutions; resolved real-time synchronization issues with WebSocket error handling; solved database connection pooling challenges. |
| g) An ability to communicate effectively | Documented all API endpoints with request/response schemas, created technical specifications for database structure, and provided clear code comments for maintainability. Communicated design decisions and architectural choices to team members. |
| k) An ability to use the techniques, skills, and modern engineering tools necessary for engineering practice | Utilized TypeScript, Express.js, PostgreSQL, Drizzle ORM, WebSocket API, OAuth 2.0, Docker concepts, and version control (Git) for professional software development. |

---

## Realistic Constraints

- **Time Constraints:** 8-week development cycle requiring prioritization of core features over advanced features
- **Infrastructure Costs:** Utilized Replit's free tier with PostgreSQL Neon backend to minimize infrastructure expenses
- **User Scalability:** Designed with eventual horizontal scaling in mind, currently optimized for initial user base of 100-1000 concurrent users
- **Real-time Performance:** WebSocket connections limited by server resources; implemented connection pooling and message queue optimization
- **Authentication Complexity:** Simplified initial implementation with Google OAuth; extensible for additional authentication methods
- **Development Team:** Small team of 4 members requiring clear role definition and efficient communication

---

## Engineering Standards

- **Code Standards:** Followed TypeScript strict mode, ESLint configuration, and consistent naming conventions
- **Database Standards:** Adhered to normalized database design principles (3NF), proper indexing, and referential integrity
- **API Standards:** RESTful principles with proper HTTP status codes, versioning strategy, and request/response validation using Zod
- **Security Standards:** Implemented input validation, SQL injection prevention through parameterized queries, CORS security headers, and secure session management
- **Version Control:** Used Git with meaningful commit messages and branch management for code organization
- **Documentation:** Maintained API documentation, code comments, and architecture diagrams for team knowledge sharing
