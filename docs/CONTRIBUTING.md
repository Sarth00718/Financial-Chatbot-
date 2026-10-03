# Contributing to Financial ChatBot

Thank you for your interest in contributing to Financial ChatBot! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit your changes: `git commit -m "Description of changes"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Guidelines

### Code Style

**JavaScript/React:**
- Use ES6+ syntax
- Follow Airbnb JavaScript Style Guide
- Use meaningful variable and function names
- Add comments for complex logic

**Python:**
- Follow PEP 8 style guide
- Use type hints where applicable
- Write docstrings for functions and classes
- Keep functions small and focused

### Commit Messages

- Use clear and descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 50 characters
- Add detailed description if needed

Example:
```
Add user authentication feature

- Implement JWT-based authentication
- Add login and register endpoints
- Create auth middleware
```

### Testing

- Write tests for new features
- Ensure all existing tests pass
- Test edge cases and error scenarios
- Test on different browsers (for frontend)

### Pull Requests

- Provide a clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Ensure CI/CD checks pass
- Request review from maintainers

## Types of Contributions

### Bug Reports

- Use the issue tracker
- Provide clear reproduction steps
- Include environment details
- Add screenshots if applicable

### Feature Requests

- Describe the feature clearly
- Explain the use case
- Discuss implementation approach
- Consider backwards compatibility

### Documentation

- Fix typos and errors
- Improve clarity
- Add examples
- Update outdated information

### Code Contributions

- Bug fixes
- New features
- Performance improvements
- Code refactoring
- Test coverage improvements

## Project Structure

```
Backend/          - Node.js Express API
Python-Backend/   - Python FastAPI AI service
Frontend/         - React application
```

## Development Environment

### Required Tools
- Node.js 18+
- Python 3.9+
- MongoDB
- Git

### Setup
```bash
# Install backend dependencies
cd Backend && npm install

# Install Python dependencies
cd Python-Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Install frontend dependencies
cd Frontend && npm install
```

## Code Review Process

1. Maintainers review pull requests
2. Address review comments
3. Make necessary changes
4. Request re-review
5. Merge when approved

## Questions?

Feel free to ask questions by:
- Opening an issue
- Commenting on existing issues
- Contacting maintainers

Thank you for contributing!
