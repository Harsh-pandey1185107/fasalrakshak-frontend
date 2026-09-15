# FasalRakshak AI — SIH 2026

AI-assisted crop disease and crop-damage evidence intelligence platform with a farmer-facing PWA and human field-officer verification.

> **Human-in-the-loop by design:** AI assists with evidence validation, disease assessment, prioritization and explanation. Final verification remains with the authorized field officer.

## System Flow

`Farmer → Multi-View Evidence Capture → GPS + Timestamp → Evidence Validation → Crop-Specific AI Routing → Disease Assessment → Evidence Trust Engine → Duplicate / Integrity Intelligence → RAG Safety & Guidance → Officer Verification → Regional Intelligence (God View) → Human Final Decision`

## Key Features

### Farmer Portal

- Crop-damage reporting dashboard
- Multilingual UI: English, Hindi, Marathi and Kannada
- Structured crop and damage-type selection
- Four-step evidence capture:
  1. Affected leaf
  2. Whole plant
  3. Wider field
  4. Second location
- GPS/geolocation and automatic timestamp capture
- Farmer description and voice-assisted input
- Audio instructions and accessibility helpers
- Evidence-completeness feedback
- Offline-first evidence queue and later synchronization
- Progressive Web App support with manifest, service worker and app icons

### AI Disease Assessment

The current validated prototype model is focused on **Onion** disease classification. The supported prototype classes include:

- Caterpillar-P
- Fusarium-D
- Healthy Leaves
- Purple Blotch
- Stemphylium Leaf Blight

The backend uses crop-specific model routing. Unsupported or unreleased crop models are routed to human review instead of being passed through the Onion classifier.

### Evidence Trust Engine

AI confidence and evidence reliability are treated as separate signals. Evidence trust can incorporate:

- Image quality
- Crop validity
- AI safety status
- GPS presence
- Timestamp presence
- Evidence uniqueness

A low trust score is a review signal; it is not an automatic fraud decision.

### Duplicate & Evidence Integrity Intelligence

The backend supports exact and near-duplicate evidence checks. Duplicate evidence is treated as a reason for manual review rather than an automatic accusation of fraud.

### RAG Safety & Agronomic Guidance

The system includes a grounded agricultural knowledge layer with vector retrieval and safety controls. Guidance can be withheld when evidence is invalid, duplicated, unsupported, or otherwise requires human review.

### Officer Portal

Field officers can review:

- Farmer evidence
- AI prediction and confidence
- Evidence Trust Score
- Integrity and duplicate warnings
- RAG safety status
- Supporting multi-view evidence
- Independent officer diagnosis and remarks
- Verify / under-review / reject workflow

The officer diagnosis is intentionally separated from the AI prediction.

### Regional Intelligence — God View

The officer dashboard includes a regional intelligence view combining stored case information into decision-support signals such as:

- GPS case visualization
- Priority review queue
- Disease / condition distribution
- Crop and model coverage
- Evidence quality statistics
- RAG / guidance safety signals
- Unsupported-crop visibility
- Regional intelligence signals

Geographic concentration is treated as a review signal only; it does not automatically establish disease prevalence or confirm an outbreak.

## Offline-First Architecture

The farmer application is designed for low-connectivity environments. It includes local storage, queued submissions, synchronization states and retry handling so evidence can be captured before a reliable network connection is available.

## Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Progressive Web App
- Service Worker
- Browser local/offline storage
- Web Speech APIs

### Backend

- Python
- FastAPI
- SQLAlchemy
- REST APIs
- Authentication
- Evidence and assessment APIs
- Synchronization APIs
- God View / regional intelligence APIs

### AI & Intelligence Layer

- TensorFlow / Keras
- MobileNetV2 transfer learning
- Image quality validation
- Semantic crop validation
- Crop-specific model routing
- Evidence Trust Engine
- Duplicate detection
- AI safety logic
- Vector retrieval
- Agricultural RAG
- Treatment guidance
- Weather context
- Regional intelligence

## Frontend Repository Structure

```text
fasalrakshak-frontend/
├── index.html
├── farmer/
│   ├── dashboard.html
│   ├── report-new.html
│   └── assessment-result.html
├── officer/
│   ├── dashboard.html
│   └── report-detail.html
├── css/
│   ├── style.css
│   └── god-view.css
├── js/
│   ├── api.js
│   ├── farmer.js
│   ├── farmer-role3.js
│   ├── officer.js
│   ├── god-view.js
│   ├── offlineDB.js
│   ├── syncManager.js
│   ├── pwa.js
│   ├── accessibility.js
│   ├── voiceRecorder.js
│   ├── i18n.js
│   └── utils.js
├── locales/
│   ├── en.js
│   ├── hi.js
│   ├── mr.js
│   └── kn.js
├── icons/
├── manifest.webmanifest
└── sw.js
```

## Backend Repository

The backend, AI services, Evidence Trust Engine, RAG safety, duplicate detection, model routing, treatment guidance and regional intelligence are maintained separately at:

**Harsh-pandey1185107/fasalrakshak-ai-backend-**

## Human-in-the-Loop Principle

**AI recommends. Humans verify.**

FasalRakshak does not automatically approve insurance claims, declare fraud, confirm outbreaks or replace field officers. Its purpose is to make agricultural evidence collection and verification more structured, explainable and reliable.

## SIH 2026

- **Project:** FasalRakshak AI
- **Team:** ThinkLab
- **Category:** Software
- **Theme:** Agriculture, FoodTech & Rural Development

## Prototype Status

This repository contains the working SIH prototype. Additional crop models, datasets, agricultural knowledge sources and field workflows can be integrated as they are validated and released.
