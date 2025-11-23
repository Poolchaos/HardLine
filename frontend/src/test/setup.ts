import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: () => true,
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: () => {},
});

// Mock window.location.reload properly for jsdom
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    ...window.location,
    reload: vi.fn(),
  },
});
