# CAP4001 – Capstone Project Proposal Report
## Individual Report

**Student Name:** Tatikonda Srilekha  
**Student Register Number:** 22BCE20420  
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
The project, "A Real-Time Player Matching System," is an MVP social platform designed to help users find and connect with others for specific gaming activities. The application addresses the challenge of finding compatible teammates or opponents for online games. The MVP focuses on core functionality with an intuitive UI, including user profiles, a public request board, a 1v1 and team finder, and a real-time status system. The approach utilizes modern full-stack technologies to build a responsive, serverless application that prioritizes immediate, action-oriented requests with real-time status updates.

### Individual Role and Tasks
As a frontend development specialist, my primary responsibilities focused on the user interface and user experience design. Specifically, I:

1. **Frontend Architecture & Setup**
   - Configured React with Vite for optimized development and production builds
   - Established component structure following modern React patterns and best practices
   - Set up Tailwind CSS for styling with custom theme configuration and dark mode support
   - Implemented routing using Wouter for client-side navigation

2. **UI Component Development**
   - Designed and built reusable UI components using shadcn/ui component library
   - Created form components for user input (profile creation, match requests, filters)
   - Developed card-based layouts for displaying match requests and user profiles
   - Implemented interactive modals for match details, player profiles, and user settings

3. **User Interface Implementation**
   - Created responsive landing page with hero section and feature showcase
   - Designed user dashboard with match request management interface
   - Built player discovery/matching interface with filtering capabilities
   - Implemented notification center for real-time match updates

4. **State Management & Data Fetching**
   - Integrated TanStack React Query for efficient data fetching and caching
   - Implemented custom hooks for form handling and data management
   - Set up proper error handling and loading states across the application
   - Managed user authentication state and session persistence

5. **Real-time Integration**
   - Integrated WebSocket connection for live status updates
   - Implemented real-time notification display system
   - Connected frontend to backend API endpoints with proper request/response handling

### Approach
The development followed a component-driven approach:
- **Phase 1 (Week 1-2):** UI/UX design specification, component library setup, and design system creation
- **Phase 2 (Week 3-4):** Core page development (landing, dashboard, match finder), form implementation
- **Phase 3 (Week 5-6):** Real-time features, notification system, state management optimization
- **Phase 4 (Week 7-8):** Responsive design refinement, accessibility improvements, performance optimization

---

## Outcome Matrix

| Outcome | Plan for Demonstrating Outcome |
|---------|--------------------------------|
| a) An ability to apply knowledge of mathematics, science, and engineering | Applied UI/UX principles and cognitive psychology to design intuitive interfaces; utilized responsive design algorithms for multiple screen sizes; implemented efficient rendering strategies. |
| c) An ability to design a system, component, or process to meet desired needs within realistic constraints | Designed the frontend architecture considering browser limitations, network latency, and performance constraints. Implemented lazy loading, code splitting, and optimized re-renders. |
| d) An ability to function on multidisciplinary teams | Collaborated closely with backend developers on API contract definition, coordinated design decisions with team members, and provided feedback on user experience aspects of the application. |
| e) An ability to identify, formulate, and solve engineering problems | Addressed state management challenges, resolved real-time data synchronization issues, solved responsive design problems across devices, and optimized component re-render performance. |
| g) An ability to communicate effectively | Created UI/UX documentation, provided clear component prop documentation, created user flow diagrams, and communicated design rationale to team members through code reviews. |
| k) An ability to use the techniques, skills, and modern engineering tools necessary for engineering practice | Utilized React, Vite, TypeScript, Tailwind CSS, TanStack React Query, Wouter router, shadcn/ui components, and modern browser APIs (WebSocket, LocalStorage). |

---

## Realistic Constraints

- **Browser Compatibility:** Targeted modern browsers (Chrome, Firefox, Safari, Edge) with graceful degradation
- **Performance Budget:** Optimized bundle size and load times; implemented code splitting to meet < 3s initial load time
- **Screen Sizes:** Responsive design supporting mobile (320px), tablet (768px), and desktop (1920px) viewports
- **Real-time Updates:** Managed WebSocket connection reliability with automatic reconnection logic
- **Data Consistency:** Implemented optimistic updates and proper cache invalidation strategies
- **Accessibility:** Followed WCAG 2.1 guidelines for color contrast, keyboard navigation, and semantic HTML
- **Development Time:** Leveraged pre-built component libraries to accelerate development within 8-week timeline

---

## Engineering Standards

- **React Standards:** Followed functional component patterns, hooks best practices, and proper dependency management
- **CSS Standards:** Utilized Tailwind CSS utility-first approach with consistent spacing and color system
- **Component Standards:** Maintained single responsibility principle, prop validation, and component composition patterns
- **Code Quality:** Applied ESLint rules, TypeScript strict mode for type safety, and consistent code formatting
- **Performance Standards:** Implemented React.memo for optimization, lazy loading for routes, and efficient re-render strategies
- **Accessibility Standards:** Implemented semantic HTML, ARIA labels, keyboard navigation, and color contrast compliance
- **Version Control:** Maintained clean commit history and proper branch management for frontend features
- **Documentation:** Provided Storybook-like documentation and component usage examples for team reference
