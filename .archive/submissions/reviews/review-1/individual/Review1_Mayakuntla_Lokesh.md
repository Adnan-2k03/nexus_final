# CAP4001 – Capstone Project Proposal Report
## Individual Report

**Student Name:** Mayakuntla Lokesh  
**Student Register Number:** 22BCE9911  
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
The project, "A Real-Time Player Matching System," is an MVP social platform designed to help users find and connect with others for specific gaming activities. The application will address the challenge of finding compatible teammates or opponents for online games. The MVP will focus on core functionality with an intuitive UI, including user profiles, a public request board, a 1v1 and team finder, and a real-time status system. The approach will utilize modern full-stack technologies to build a responsive, serverless application that prioritizes immediate, action-oriented requests with real-time updates.

### Individual Role and Tasks
As a full-stack development contributor, my primary responsibilities will include working on multiple integration layers and system components. Specifically, I will:

1. **Third-Party Integration Development**
   - Research and integrate Google OAuth 2.0 authentication system for user login
   - Implement Firebase integration for phone verification capabilities
   - Set up 100ms real-time voice channel integration for team communication
   - Configure Cloudflare R2 integration for user profile image storage and management
   - Plan additional service integrations for extended functionality

2. **API Testing & Validation**
   - Develop and execute comprehensive API testing for all backend endpoints
   - Create test cases for authentication flows, matchmaking logic, and real-time features
   - Validate request/response formats and error handling scenarios
   - Test WebSocket connections and real-time notification delivery

3. **Frontend & Backend Integration**
   - Collaborate on connecting frontend components to backend API endpoints
   - Implement proper error boundary handling and user feedback mechanisms
   - Test data flow between frontend and backend systems
   - Debug integration issues between multiple system components

4. **Feature Enhancement & Refinement**
   - Assist in implementing notification center functionality
   - Contribute to user profile management feature development
   - Support database query optimization efforts
   - Participate in feature testing and quality assurance

5. **Documentation & Knowledge Sharing**
   - Create API endpoint documentation with request/response examples
   - Document integration procedures for third-party services
   - Maintain implementation notes and guides
   - Provide technical feedback and participate in code reviews

### Approach
The development will follow an integration-focused approach:
- **Phase 1 (Week 1-2):** Research third-party service documentation, plan integration strategy, establish service accounts
- **Phase 2 (Week 3-4):** Implement OAuth and Firebase integration, configure Cloudflare R2 bucket, test authentication
- **Phase 3 (Week 5-6):** Integrate 100ms voice channels, configure Cloudflare R2 storage, conduct API testing
- **Phase 4 (Week 7-8):** Optimize integrations, improve error handling, finalize documentation, conduct system testing

---

## Outcome Matrix

| Outcome | Plan for Demonstrating Outcome |
|---------|--------------------------------|
| a) An ability to apply knowledge of mathematics, science, and engineering | Will apply software engineering principles for system integration; utilize authentication protocols and encryption standards; understand distributed system concepts. |
| c) An ability to design a system, component, or process to meet desired needs within realistic constraints | Will design integration architecture considering API rate limits, cost constraints, and service reliability. Will implement fallback mechanisms and error handling. |
| d) An ability to function on multidisciplinary teams | Will work with backend and frontend developers on integration points, coordinate testing efforts, and participate in team knowledge sharing. |
| e) An ability to identify, formulate, and solve engineering problems | Will resolve authentication token management issues, debug integration problems, fix data synchronization issues, and optimize validation workflows. |
| g) An ability to communicate effectively | Will document third-party service integrations with setup instructions, create troubleshooting guides, and communicate issues and solutions to team. |
| k) An ability to use the techniques, skills, and modern engineering tools necessary for engineering practice | Will utilize Google OAuth, Firebase SDK, Cloudflare R2 API, 100ms SDK, Postman for API testing, and debugging tools. |

---

## Realistic Constraints

- **API Rate Limits:** Will manage rate limiting from third-party services within free tier quotas
- **Cost Management:** Will select free or low-cost tiers for third-party services; implement cost monitoring
- **Service Reliability:** Will implement timeout and retry logic for external API calls; add fallback mechanisms
- **Authentication Complexity:** Will initially focus on Google OAuth; design for extensibility of additional methods
- **Storage Management:** Will integrate Cloudflare R2 for reliable and scalable file storage solution
- **Real-time Communication:** Will configure 100ms voice channels for group communication within resource limits
- **Storage Infrastructure:** Will utilize Cloudflare R2 for efficient and cost-effective file storage
- **Data Security:** Will ensure proper credential management using environment variables and secrets
- **Development Pace:** Will complete integrations within 8-week project timeline

---

## Engineering Standards

- **API Integration Standards:** Will follow RESTful principles for API consumption, proper HTTP status code handling, and validation
- **Authentication Standards:** Will implement OAuth 2.0 protocol correctly, maintain secure token storage, and implement session management
- **Error Handling:** Will apply consistent error handling patterns, provide meaningful error messages, and implement logging
- **Testing Standards:** Will follow systematic testing approaches, maintain test documentation, and execute integration scenarios
- **Code Quality:** Will apply clean code principles, maintain TypeScript type safety, and follow naming conventions
- **File Storage Standards:** Will implement proper file handling, validate uploads, and ensure efficient storage management
- **Documentation Standards:** Will provide integration setup guides, API usage documentation, and troubleshooting procedures
- **Security Standards:** Will implement proper credential management, follow secure coding practices, and validate external inputs
- **Version Control:** Will maintain organized commits, meaningful messages, and proper branch management
