# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-03

### Added
- Complete admin dashboard with user management
- Dark mode support across entire application
- Voice input/output functionality
- Smart suggestions based on conversation context
- Export conversations as PDF or Markdown
- Data visualization with Chart.js
- Real-time chat with Socket.IO
- Comprehensive test suite
- Admin user creation script
- Role-based access control
- System health monitoring
- Activity logs and audit trails

### Changed
- Upgraded to React 18
- Improved UI/UX with TailwindCSS
- Enhanced mobile responsiveness
- Optimized API performance
- Improved error handling
- Better security measures

### Fixed
- Admin dashboard dark mode styling
- Login authentication flow
- Document upload processing
- CORS configuration
- JWT token refresh mechanism

### Removed
- Unused debug scripts
- Redundant documentation files
- Excessive console logging in production code
- Legacy migration scripts

### Security
- Implemented bcrypt password hashing
- Added JWT HTTP-only cookies
- Enhanced input validation with Zod
- Added rate limiting middleware
- Implemented CORS protection
- Added Helmet.js security headers

## [1.0.0] - 2025-12-01

### Added
- Initial release
- Basic chat functionality
- Document upload and processing
- User authentication
- MongoDB integration
- Groq AI integration
- RAG with FAISS vector store
- Basic admin features

---

## Version History

- **2.0.0** - Major update with admin dashboard and enhanced features
- **1.0.0** - Initial release with core functionality
