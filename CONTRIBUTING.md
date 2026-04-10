# Contributing to pi-speak

Thank you for your interest in contributing to pi-speak!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/pi-speak.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Quality Checks

Before submitting a PR, ensure all checks pass:

```bash
# Run all quality checks
npm run test:all

# Or run individually:
npm run test:lint      # ESLint
npm run test:format    # Prettier
npm run test:compile   # TypeScript
npm run test:config    # Config validation
```

### Fixing Issues

```bash
# Auto-fix lint issues and format
npm run lint
npm run format
```

## Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples

```
feat(tts): add audio caching for instant replay
fix(summarizer): handle empty API responses gracefully
docs(readme): add troubleshooting section
refactor(config): use Zod for runtime validation
test(helpers): add tests for stripMarkdown function
```

## Code Style

- TypeScript with strict mode
- 2-space indentation
- Single quotes for strings
- Semicolons required
- ESLint + Prettier for formatting

## Pull Request Process

1. **Keep PRs focused**: Each PR should address a single concern
2. **Update tests**: Add tests for new functionality
3. **Update docs**: Keep README and code comments current
4. **Follow conventions**: Use Conventional Commits for commit messages
5. **Pass CI**: Ensure all checks pass before requesting review

## Reporting Issues

When reporting bugs, please include:

- Node.js version (`node --version`)
- macOS version
- pi-speak version (from package.json)
- Steps to reproduce
- Expected vs actual behavior
- Relevant log output from `~/.pi-speak-debug.log`

## Questions?

Feel free to open an issue for questions or discussions.
