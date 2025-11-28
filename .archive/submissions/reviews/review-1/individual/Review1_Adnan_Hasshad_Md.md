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
The project, "A Real-Time Player Matching System," is an MVP social platform designed to help users find and connect with others for specific gaming activities. The application will address the challenge of finding compatible teammates or opponents for online games. The MVP will focus on core functionality with an intuitive UI, including user profiles, a public request board, a 1v1 and team finder, and a real-time status system. The approach will utilize modern full-stack technologies to build a responsive, serverless application that prioritizes immediate, action-oriented requests with WebSocket-based real-time updates.

### Individual Role and Tasks
As the primary backend developer, my responsibilities will encompass the complete backend architecture and database design. Specifically, I will:

1. **Backend Infrastructure & API Development**
   - Design and implement the Express.js server with TypeScript for type safety
   - Develop the REST API with multiple endpoints covering authentication, user management, matchmaking, and notifications
   - Implement WebSocket integration for real-time status updates and instant notifications
   - Configure session management, CORS, and security middleware

2. **Database Design & Schema Management**
   - Design the complete database schema using Drizzle ORM with PostgreSQL
   - Plan tables for users, match requests, match history, hidden matches, notifications, and connection records
   - Implement proper relationships, constraints, and indexing strategy
   - Set up automated database migration and synchronization using drizzle-kit

3. **Core Business Logic Implementation**
   - Implement user authentication with Google OAuth 2.0 integration
   - Develop the matchmaking algorithm considering game preferences, skill levels, and availability
   - Build notification system with real-time WebSocket events for match updates
   - Create user connection tracking and hiding mechanism for preference management

4. **API Validation & Security**
   - Implement request validation using Zod schemas for type-safe input handling
   - Develop middleware for authentication, logging, and error handling
   - Plan security measures for data protection and secure communication

### Approach
The backend development will follow a structured, iterative approach:
- **Phase 1 (Week 1-2):** Requirements analysis, database schema design, and architectural planning
- **Phase 2 (Week 3-4):** Backend infrastructure setup, API endpoint development, and authentication implementation
- **Phase 3 (Week 5-6):** Real-time functionality implementation, database optimization, and security hardening
- **Phase 4 (Week 7-8):** Testing, bug fixes, performance optimization, and comprehensive documentation

---

## Outcome Matrix

| Outcome | Plan for Demonstrating Outcome |
|---------|--------------------------------|
| a) An ability to apply knowledge of mathematics, science, and engineering | Will apply data structures and algorithms for matchmaking logic; utilize relational database theory for schema design; implement engineering principles for scalable system architecture. |
| c) An ability to design a system, component, or process to meet desired needs within realistic constraints | Will design the backend system architecture considering API rate limits, database performance, real-time constraints, and cost efficiency on cloud deployment. |
| d) An ability to function on multidisciplinary teams | Will coordinate with frontend developers on API contracts, collaborate on database schema validation, and ensure proper system integration across all components. |
| e) An ability to identify, formulate, and solve engineering problems | Will identify and solve matchmaking algorithm complexity, resolve real-time synchronization challenges, and optimize database performance issues. |
| g) An ability to communicate effectively | Will document all API endpoints with schemas, create technical specifications for database structure, and provide clear code documentation for maintainability. |
| k) An ability to use the techniques, skills, and modern engineering tools necessary for engineering practice | Will utilize TypeScript, Express.js, PostgreSQL, Drizzle ORM, WebSocket API, OAuth 2.0, and version control (Git) for professional development. |

---

## Realistic Constraints

- **Time Constraints:** 8-week development cycle requiring prioritization of core features over advanced features
- **Infrastructure Costs:** Will utilize cloud platforms with free tiers to minimize infrastructure expenses
- **User Scalability:** Will design for initial user base of 100-1000 concurrent users with eventual horizontal scaling capability
- **Real-time Performance:** WebSocket connections limited by server resources; will implement connection optimization
- **Authentication Options:** Will initially focus on Google OAuth; design extensibility for additional authentication methods
- **Database Complexity:** Will manage increasing complexity as features scale
- **Team Coordination:** Small team of 4 members requiring clear role definition and efficient communication

---

## Engineering Standards

- **Code Standards:** Will follow TypeScript strict mode, ESLint configuration, and consistent naming conventions
- **Database Standards:** Will adhere to normalized database design principles, proper indexing, and referential integrity
- **API Standards:** Will implement RESTful principles with proper HTTP status codes, versioning strategy, and Zod validation
- **Security Standards:** Will implement input validation, SQL injection prevention through parameterized queries, CORS security headers
- **Version Control:** Will use Git with meaningful commit messages and proper branch management
- **Documentation:** Will maintain API documentation, code comments, and architecture diagrams for team knowledge sharing
- **Performance:** Will optimize query performance through indexing and connection pooling
