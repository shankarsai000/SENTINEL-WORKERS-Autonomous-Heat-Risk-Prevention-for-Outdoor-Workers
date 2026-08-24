# Phoenix Heatwave Offline Replay Demo Guide

## Overview
The Phoenix Heatwave scenario simulates a 12-hour construction shift (06:00 to 18:00 MST) across 5 Maricopa County job sites with 500 synthetic workers.

## Demo Narrative Progression

1. **06:00 - Morning Baseline (31.2°C / 42% RH)**
   - All 500 workers start at `GREEN` status.
   - Normal monitoring active.

2. **09:00 - Thermal Rise (38.5°C / 30% RH)**
   - High task intensity workers (e.g. Welders and Heavy Laborers) transition to `WATCH` and `ELEVATED`.
   - Autonomous hydration notices are dispatched.

3. **12:00 - Solar Peak & High Load (44.2°C / 20% RH)**
   - Exposure accumulation pushes unacclimatized and elevated workers to `HIGH` risk.
   - System recommends mandatory shaded rest periods (20m).
   - Priority queue highlights the top actionable workers for supervisor review.

4. **14:00 - 15:00 - Extreme Heat Dome Peak (46.8°C / 16% RH)**
   - Ambient conditions trigger hard physical safety guardrails (`CRITICAL`).
   - Mandatory `STOP_WORK` orders are auto-executed.
   - Clustered incidents trigger automatically at `PHX-SITE-02` (Downtown High-Rise) and `PHX-SITE-04` (West Valley Solar), aggregating alerts for the supervisor instead of flooding them with 50 individual notifications.

5. **Supervisor Interaction & Audit**
   - Click any worker in the priority queue to view explainable reason codes.
   - Click `[Acknowledge]` or `[Override]`.
   - Open the Cryptographic Decision Trail at the bottom to verify the SHA-256 event hash.
