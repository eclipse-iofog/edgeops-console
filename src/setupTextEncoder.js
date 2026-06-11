/**
 * Polyfill for Vitest/jsdom (required by undici/cheerio on Node 24).
 * Must run before setupTests.
 */
import { TextEncoder, TextDecoder } from "node:util";
import { ReadableStream } from "node:stream/web";
import { MessagePort } from "node:worker_threads";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ReadableStream = ReadableStream;
global.MessagePort = MessagePort;
