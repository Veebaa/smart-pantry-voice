import '@testing-library/jest-dom/vitest';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: () => Promise.resolve({}),
    },
  });

  Object.defineProperty(window, 'SpeechRecognition', {
    writable: true,
    value: class MockSpeechRecognition {
      start() {}
      stop() {}
      addEventListener() {}
      removeEventListener() {}
    },
  });

  Object.defineProperty(window, 'webkitSpeechRecognition', {
    writable: true,
    value: class MockSpeechRecognition {
      start() {}
      stop() {}
      addEventListener() {}
      removeEventListener() {}
    },
  });
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
});
