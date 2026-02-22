import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock fetch if needed
global.fetch = vi.fn();
