# Contributing to FinChatBot

First off, thank you for considering contributing to FinChatBot! It's people like you that make FinChatBot such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots if possible**
* **Include your environment details** (OS, Node version, Python version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and explain which behavior you expected to see instead**
* **Explain why this enhancement would be useful**

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Follow the JavaScript/Python style guides
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

### Setup Development Environment

1. Fork the repo
2. Clone your fork
3. Install dependencies:
   ```bash
   cd Backend && npm install
   cd ../Frontend && npm install
   cd ../Python-Backend && pip install -r requirements.txt
   ```
4. Create a branch: `git checkout -b feature/my-feature`
5. Make your changes
6. Test your changes
7. Commit your changes: `git commit -m 'Add some feature'`
8. Push to the branch: `git push origin feature/my-feature`
9. Submit a pull request

### Coding Standards

#### JavaScript/Node.js
- Use ES6+ features
- Use async/await over promises
- Use meaningful variable names
- Add JSDoc comments for functions
- Follow existing code style
- Use Prettier for formatting

#### Python
- Follow PEP 8 style guide
- Use type hints
- Add docstrings for functions
- Use meaningful variable names
- Follow existing code style

#### React
- Use functional components with hooks
- Use meaningful component names
- Add PropTypes or TypeScript types
- Keep components small and focused
- Follow existing code style

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Run the test suite: `node test-functionality.js`
- Test manually in the browser

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Documentation

- Update README.md if needed
- Add inline comments for complex logic
- Update API documentation if you change endpoints
- Add JSDoc/docstring comments for new functions

## Project Structure

```
Backend/          - Node.js Express API
Frontend/         - React application
Python-Backend/   - FastAPI AI engine
```

## Questions?

Feel free to open an issue with your question or contact the maintainers directly.

Thank you for contributing! 🎉
