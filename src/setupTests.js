/**
 * TextEncoder/TextDecoder polyfill must run first (Node 24 / Vitest jsdom).
 */
import "./setupTextEncoder.js";
import "@testing-library/jest-dom/vitest";
