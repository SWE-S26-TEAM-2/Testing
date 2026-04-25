# Testing Strategy — SWE-S26-TEAM-2

## Overview
E2E and unit tests are co-located with their respective codebases:
- Web E2E tests: [Frontend repo](link) — Playwright
- Mobile unit tests: [Cross-Platform repo](link) — Flutter Test
- Backend unit tests: [Backend repo](link) — pytest + httpx
- Stress testing: k8s-based load simulation

## Coverage Targets
- Web E2E: 90%+
- Mobile: 95%+
- Backend: 95%+

## Tools
| Layer | Tool | Type |
|---|---|---|
| Web | Playwright | E2E |
| Mobile | Flutter Test | Unit |
| Backend | pytest + httpx | Unit + Integration |
| Stress | k8s | Load |

## Test Execution
[Instructions for running each suite]
