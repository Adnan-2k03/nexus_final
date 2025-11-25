# CAP4001 – Capstone Project Proposal Report
## Individual Report

**Student Name:** Thokala Sravan  
**Student Register Number:** 22BCE9745  
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
As a full-stack development contributor, my primary responsibilities centered on deployment, performance optimization, and system architecture. Specifically, I:

1. **Deployment & DevOps**
   - Set up project deployment configuration on Replit platform
   - Configured build and run scripts for production environments
   - Implemented environment variable management and secrets handling
   - Created deployment documentation and setup procedures for team

2. **Database & Performance Optimization**
   - Analyzed database query performance and implemented indexing strategies
   - Optimized WebSocket message handling for efficient real-time updates
   - Implemented connection pooling for database connections
   - Profiled application performance and identified bottlenecks

3. **System Architecture Support**
   - Contributed to overall system architecture planning and discussions
   - Helped establish project structure and folder organization
   - Implemented build configuration (Vite, esbuild) optimization
   - Ensured proper separation of concerns across modules

4. **Quality Assurance & Testing**
   - Performed end-to-end testing of user workflows
   - Tested real-time features and WebSocket connections
   - Validated API responses and error handling
   - Tested responsive design across different devices and browsers

5. **Documentation & Setup**
   - Created setup guide for development environment
   - Documented deployment procedures and troubleshooting steps
   - Maintained README and project documentation
   - Provided installation instructions for dependencies

### Approach
The development followed an infrastructure-focused approach:
- **Phase 1 (Week 1-2):** Project setup, environment configuration, build system initialization
- **Phase 2 (Week 3-4):** Performance profiling, database optimization, caching strategy implementation
- **Phase 3 (Week 5-6):** Deployment configuration, environment management, production build optimization
- **Phase 4 (Week 7-8):** Performance testing, optimization validation, documentation finalization, deployment verification

---

## Outcome Matrix

| Outcome | Plan for Demonstrating Outcome |
|---------|--------------------------------|
| a) An ability to apply knowledge of mathematics, science, and engineering | Applied computer systems knowledge for performance optimization; utilized algorithm analysis for query optimization; understood distributed systems concepts for deployment. |
| c) An ability to design a system, component, or process to meet desired needs within realistic constraints | Designed deployment architecture considering resource constraints, scalability requirements, and performance targets. Implemented optimization strategies to meet latency and throughput goals. |
| d) An ability to function on multidisciplinary teams | Collaborated with backend and frontend teams on performance requirements, coordinated deployment strategy, participated in architecture discussions, and shared performance metrics with team. |
| e) An ability to identify, formulate, and solve engineering problems | Identified performance bottlenecks through profiling, resolved WebSocket scalability issues, optimized database queries, and debugged deployment configuration issues. |
| g) An ability to communicate effectively | Created deployment and setup documentation, provided performance analysis reports, documented optimization strategies, and communicated system requirements to team members. |
| k) An ability to use the techniques, skills, and modern engineering tools necessary for engineering practice | Utilized Vite, esbuild, PostgreSQL optimization tools, Chrome DevTools for profiling, deployment platforms (Replit), Git, and environment management tools. |

---

## Realistic Constraints

- **Resource Limitations:** Deployed on Replit's free tier with limited memory and CPU resources; optimized application to run efficiently within constraints
- **Database Performance:** PostgreSQL query optimization to handle multiple concurrent connections efficiently
- **Real-time Scalability:** WebSocket connections optimized for handling 50-100 concurrent users within resource limits
- **Build Time:** Vite and esbuild configured to minimize build time while maintaining optimization
- **Development Environment:** Balanced fast development with reasonable production parity
- **Monitoring & Logging:** Implemented lightweight logging for production monitoring without excessive overhead
- **Cost Constraints:** Utilized free or low-cost deployment options and services
- **Development Timeline:** Completed optimization and deployment within 8-week project timeline

---

## Engineering Standards

- **Performance Standards:** Implemented query optimization, code splitting, lazy loading, and caching strategies
- **Deployment Standards:** Followed infrastructure-as-code principles, maintained reproducible builds, and documented deployment procedures
- **Optimization Standards:** Applied performance profiling methodologies, established performance metrics, and tracked optimization improvements
- **Code Quality:** Maintained clean code, proper error handling, and TypeScript type safety
- **Monitoring Standards:** Implemented application logging, error tracking, and performance monitoring where applicable
- **Documentation Standards:** Provided deployment guides, troubleshooting documentation, and system architecture diagrams
- **Version Control:** Maintained organized Git history with clear commit messages for infrastructure changes
- **Security Standards:** Properly managed secrets and credentials, implemented secure environment configurations, and followed deployment security practices
