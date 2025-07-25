# VibeCanvas Test Suite

This directory contains comprehensive tests for the VibeCanvas Spotify music visualization application.

## Test Structure

```
tests/
├── setup.js                    # Jest configuration and global mocks
├── server/
│   ├── spotify.test.js         # Unit tests for Spotify API class
│   └── routes.test.js          # Unit tests for Express routes
├── client/
│   └── app.test.js             # Frontend JavaScript tests
├── integration/
│   └── e2e.test.js             # End-to-end integration tests
└── README.md                   # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Files
```bash
# Run only server tests
npx jest tests/server/

# Run only client tests
npx jest tests/client/

# Run only integration tests
npx jest tests/integration/

# Run specific test file
npx jest tests/server/spotify.test.js
```

## Test Categories

### 1. Unit Tests - Server (`tests/server/`)

**`spotify.test.js`** - Tests for the Spotify API integration class:
- OAuth URL generation
- Token exchange and refresh
- Current track fetching
- Error handling (401, 429, network errors)
- Authentication state management
- Token expiry handling

**`routes.test.js`** - Tests for Express server routes:
- Authentication flow endpoints (`/login`, `/callback`)
- API endpoints (`/api/current-track`, `/api/auth-status`)
- Error handling and status codes
- CORS functionality
- JSON middleware

### 2. Unit Tests - Client (`tests/client/`)

**`app.test.js`** - Tests for frontend JavaScript functionality:
- VibeCanvas class initialization
- UI state management (auth, loading, music, error, no-music)
- API communication (fetch calls)
- Track data display and formatting
- Event handlers (login, refresh, logout)
- Polling mechanism
- Time formatting utilities

### 3. Integration Tests (`tests/integration/`)

**`e2e.test.js`** - End-to-end integration tests:
- Complete authentication flow simulation
- API endpoint integration
- Static file serving
- Error handling across the stack
- CORS and security headers
- Performance and reliability testing
- Concurrent request handling

## Test Environment

### Mocking Strategy

- **Axios**: Mocked globally for consistent HTTP request testing
- **Environment Variables**: Test-specific values set in `setup.js`
- **Console Methods**: Mocked to reduce test output noise
- **DOM**: JSDOM environment for frontend tests
- **Fetch API**: Mocked for frontend API calls

### Test Data

Tests use realistic mock data that mirrors actual Spotify API responses:
- Track information with artists, albums, and metadata
- Authentication tokens and OAuth flows
- Error responses and edge cases
- Various playback states (playing, paused, no music)

## Coverage Goals

The test suite aims for high coverage across:
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

### Key Areas Covered

1. **Authentication Flow**
   - OAuth URL generation
   - Token exchange and storage
   - Token refresh mechanism
   - Authentication state checking

2. **Spotify API Integration**
   - Current track fetching
   - Error handling (network, auth, rate limiting)
   - Data transformation and normalization
   - Edge cases (no music, missing data)

3. **Frontend Functionality**
   - UI state management
   - Real-time data updates
   - User interactions
   - Error display and recovery

4. **Server Routes**
   - Request/response handling
   - Middleware functionality
   - Error responses
   - Static file serving

## Test Best Practices

### Writing New Tests

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow the AAA pattern
3. **Mock Appropriately**: Mock external dependencies, not internal logic
4. **Test Edge Cases**: Include error conditions and boundary cases
5. **Cleanup**: Properly clean up mocks and intervals

### Example Test Structure

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup mocks and test data
  });

  afterEach(() => {
    // Cleanup
  });

  test('should handle normal case', () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected output');
  });

  test('should handle error case', () => {
    // Test error scenarios
  });
});
```

## Debugging Tests

### Common Issues

1. **Async Test Failures**: Ensure proper `await` usage
2. **Mock Persistence**: Clear mocks between tests
3. **DOM Cleanup**: Reset DOM state in frontend tests
4. **Timer Issues**: Clear intervals/timeouts in cleanup

### Debugging Commands

```bash
# Run tests with verbose output
npx jest --verbose

# Run specific test with debugging
npx jest --testNamePattern="test name" --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Continuous Integration

Tests are designed to run in CI environments:
- No external dependencies (Spotify API calls mocked)
- Deterministic results
- Reasonable execution time
- Clear failure messages

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add tests for new functionality
4. Update this README if adding new test categories
5. Maintain coverage thresholds

## Troubleshooting

### Common Test Failures

1. **Module Import Errors**: Check file paths and Jest configuration
2. **Async Timeout**: Increase Jest timeout or fix async handling
3. **Mock Issues**: Verify mock setup in `setup.js`
4. **DOM Errors**: Ensure JSDOM environment for frontend tests

### Getting Help

- Check Jest documentation: https://jestjs.io/docs/getting-started
- Review existing test patterns in the codebase
- Ensure environment variables are set correctly
