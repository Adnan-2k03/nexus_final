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
The project, "A Real-Time Player Matching System," is an MVP social platform designed to help users find and connect with others for specific gaming activities. The application addresses the challenge of finding compatible teammates or opponents for online games. The MVP focuses on core functionality with an intuitive UI, including user profiles, a public request board, a 1v1 and team finder, and a real-time status system. The approach utilizes modern full-stack technologies to build a responsive, serverless application that prioritizes immediate, action-oriented requests with real-time updates.

### Individual Role and Tasks
As a full-stack development contributor, my responsibilities included working on multiple integration layers and system components. Specifically, I:

1. **Third-Party Integration Development**
   - Researched and integrated Google OAuth 2.0 authentication system
   - Implemented Firebase authentication and phone verification capabilities
   - Set up 100ms real-time voice channel integration for team communication
   - Configured AWS S3 integration for user profile image storage and management
   - Integrated Stripe payment system skeleton for future premium features

2. **API Testing & Validation**
   - Developed and executed comprehensive API testing for all backend endpoints
   - Created test cases for authentication flows, matchmaking logic, and real-time features
   - Validated request/response formats and error handling scenarios
   - Tested WebSocket connections and real-time notification delivery

3. **Frontend & Backend Integration**
   - Collaborated on connecting frontend components to backend API endpoints
   - Implemented proper error boundary handling and user feedback mechanisms
   - Tested data flow between frontend and backend systems
   - Debugged integration issues between multiple system components

4. **Feature Enhancement & Refinement**
   - Assisted in implementing notification center functionality
   - Contributed to user profile management feature development
   - Helped optimize database queries and API response times
   - Participated in feature testing and quality assurance

5. **Documentation & Knowledge Sharing**
   - Created API endpoint documentation with request/response examples
   - Documented integration procedures for third-party services
   - Maintained implementation notes for future developers
   - Participated in code reviews and provided constructive feedback

### Approach
The development followed an integration-focused approach:
- **Phase 1 (Week 1-2):** Research third-party service documentation, plan integration strategy, set up service accounts
- **Phase 2 (Week 3-4):** Implement OAuth and Firebase integration, configure AWS S3 bucket, test authentication flows
- **Phase 3 (Week 5-6):** Integrate 100ms voice channels, implement payment system skeleton, conduct comprehensive API testing
- **Phase 4 (Week 7-8):** Optimize integrations, improve error handling, finalize documentation, conduct system-wide testing

---

## Outcome Matrix

| Outcome | Plan for Demonstrating Outcome |
|---------|--------------------------------|
| a) An ability to apply knowledge of mathematics, science, and engineering | Applied software engineering principles for system integration; utilized authentication protocols and encryption standards; understood distributed system concepts for real-time communication. |
| c) An ability to design a system, component, or process to meet desired needs within realistic constraints | Designed integration architecture considering API rate limits, cost constraints, and service reliability. Implemented fallback mechanisms and error handling for third-party service failures. |
| d) An ability to function on multidisciplinary teams | Worked with backend developers on integration points, collaborated with frontend team on error handling, coordinated testing efforts, and participated in team knowledge sharing sessions. |
| e) An ability to identify, formulate, and solve engineering problems | Resolved authentication token management issues, debugged third-party service integration problems, fixed WebSocket connection stability issues, and optimized data validation workflows. |
| g) An ability to communicate effectively | Documented all third-party service integrations with setup instructions, created troubleshooting guides, provided API testing results, and communicated issues and solutions to team members. |
| k) An ability to use the techniques, skills, and modern engineering tools necessary for engineering practice | Utilized Google OAuth, Firebase SDK, AWS SDK, 100ms SDK, Stripe API, Postman for API testing, Git version control, and debugging tools for integration development. |

---

## Realistic Constraints

- **API Rate Limits:** Managed rate limiting from third-party services (Google, Firebase, AWS) within free tier quotas
- **Cost Management:** Selected free or low-cost tiers for third-party services; implemented cost monitoring for production deployments
- **Service Reliability:** Implemented timeout and retry logic for external API calls; added fallback mechanisms for service failures
- **Authentication Complexity:** Initially focused on Google OAuth; built extensible architecture for adding more authentication methods
- **Payment Integration:** Implemented Stripe skeleton without full production payment flow for MVP phase
- **Real-time Scalability:** 100ms voice channels configured for group sizes up to 10 concurrent users
- **Data Security:** Ensured proper credential management using environment variables and secrets management

---

## Engineering Standards

- **API Integration Standards:** Followed RESTful principles for API consumption, proper HTTP status code handling, and JSON schema validation
- **Authentication Standards:** Implemented OAuth 2.0 protocol correctly, maintained secure token storage, and implemented proper session management
- **Error Handling:** Applied consistent error handling patterns, provided meaningful error messages, and logged errors for debugging
- **Testing Standards:** Followed unit testing approaches, maintained test documentation, and executed integration test scenarios
- **Code Quality:** Applied clean code principles, maintained type safety with TypeScript, and followed naming conventions
- **Documentation Standards:** Provided integration setup guides, API usage documentation, and troubleshooting procedures
- **Security Standards:** Implemented proper credential management, followed secure coding practices, and validated all external inputs
- **Version Control:** Maintained clean commits, meaningful commit messages, and proper branch management for integration features
