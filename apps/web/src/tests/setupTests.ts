// jsdom doesn't provide TextEncoder/TextDecoder globally, but
// react-router-dom needs them at module load time.
import { TextDecoder, TextEncoder } from 'node:util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

import '@testing-library/jest-dom';
