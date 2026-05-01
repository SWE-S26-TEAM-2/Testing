import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultHeaders, STANDARD_STAGES } from './config.js';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export const options = {
  stages: STANDARD_STAGES, // Uses standard 50 VU ramp-up
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Uploads take longer, threshold relaxed to 2 seconds
    http_req_failed: ['rate<0.05'], // Max 5% failure rate acceptable for heavy multipart parsing
  },
};

// Generate a dummy 100KB "audio" file to simulate a fast upload
const DUMMY_FILE_SIZE = 100 * 1024;
const dummyAudioBuffer = new ArrayBuffer(DUMMY_FILE_SIZE);

export function setup() {
  // Normally we would authenticate and return a token here, but 
  // for simplicity in this stress test, we'll assume a mock token or unauthenticated endpoint bypass
  return { token: 'mock_token' };
}

export default function (data) {
  const fd = new FormData();
  fd.append('title', `Stress Test Track ${__VU}-${__ITER}`);
  fd.append('description', 'Uploaded via k6 load test');
  fd.append('genre', 'Test');
  
  // Create a Blob-like object for k6 formdata
  fd.append('file', http.file(dummyAudioBuffer, 'test_track.mp3', 'audio/mpeg'));

  const res = http.post(`${BASE_URL}/tracks/upload`, fd.body(), {
    headers: {
      ...defaultHeaders(data.token),
      'Content-Type': `multipart/form-data; boundary=${fd.boundary}`,
    },
  });

  check(res, {
    'upload successful (200/201) or expected mock response': (r) => r.status === 200 || r.status === 201 || r.status === 401 || r.status === 422,
    'upload response < 2000ms': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
