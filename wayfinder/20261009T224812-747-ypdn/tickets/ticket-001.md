---
ticket_id: "001"
title: "Registration Modal 'About Me' Profile Section & Client Validation Architecture"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: []
governing_specification: "functional_specification_108.md"
---

# Ticket 001: Registration Modal 'About Me' Profile Section & Client Validation Architecture

## Question
How does the "Join the bar!" patron registration modal (`src/components/PatronSignupForm.tsx`) expand to capture a dedicated, multi-line "About Me" personality bio, enforce client-side input boundaries (10–500 non-whitespace characters), surface descriptive user guidance and inline validation errors, and dispatch the sanitized bio in the multipart form payload?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_108.md`
  - §Desired Functionality (1): "The in-game registration modal must provide a dedicated, prominent 'About Me' multi-line text input field. Clear descriptive guidance must prompt the user to describe their patron's personality, conversational tone, quirks, or cocktail preferences (e.g., *'Grumpy retired sailor who loves bitter drinks'*, *'Excitable futuristic tourist who wants something neon'*)."
  - §Desired Functionality (1): "The bio field must require a minimum meaningful length (e.g., at least 10 non-whitespace characters) and enforce a reasonable upper boundary (e.g., up to 500 characters) to ensure sufficient context without exceeding context bounds. Submitting without satisfying the bio requirement must prevent submission and surface a clear, readable validation message."
  - §Desired Functionality (1): "The submission payload dispatched to the backend registration handler must include the sanitized `aboutMe` text alongside the existing name, contact, and image file data."
  - §Acceptance Criteria (AC1): "The 'Join the bar!' registration modal renders an 'About Me' textarea field with validation enforcing input boundaries (10–500 chars)."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Existing Registration Form Fields
In `src/components/PatronSignupForm.tsx` (L63–L71), component state currently tracks only:
```tsx
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
const [runPipeline, setRunPipeline] = useState(false);
const [photo, setPhoto] = useState<File | null>(null);
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string | null>(null);
const [result, setResult] = useState<string | null>(null);
```
No state or DOM element exists for capturing the character's personality profile or "About Me" bio.

### 2. Missing Input Validation and Multipart Dispatch
In `src/components/PatronSignupForm.tsx` (L74–L97), the `onSubmit` handler validates only name, email/phone presence, and photo requirements:
```tsx
if (!name.trim()) {
  setError('Name is required');
  return;
}
if (!email.trim() && !phone.trim()) {
  setError('Email or phone is required');
  return;
}
if (runPipeline && !photo) {
  setError('Photo required when generating art');
  return;
}

const body = new FormData();
body.set('name', name.trim());
if (email.trim()) body.set('email', email.trim());
if (phone.trim()) body.set('phone', phone.trim());
if (runPipeline) body.set('runPipeline', '1');
if (photo) body.set('photo', photo);
```
Because `aboutMe` is absent from form submission, downstream handlers cannot generate prompt documents or persist character personas.

## Architectural Decisions to Lock

### 1. Component State & Input Constraints
- In `src/components/PatronSignupForm.tsx`, introduce state variable:
  ```tsx
  const [aboutMe, setAboutMe] = useState('');
  ```
- Form validation constants:
  - Minimum non-whitespace characters: `10`
  - Maximum total characters: `500`
- Define validation rule:
  ```tsx
  const trimmedBio = aboutMe.trim();
  if (!trimmedBio) {
    setError('About Me personality bio is required');
    return;
  }
  if (trimmedBio.length < 10) {
    setError('About Me bio must be at least 10 characters long');
    return;
  }
  if (aboutMe.length > 500) {
    setError('About Me bio cannot exceed 500 characters');
    return;
  }
  ```

### 2. UI Layout & Descriptive Guidance
- Append a dedicated `<label>` containing a styled multi-line `<textarea>` inside the form panel between contact inputs and the photo input:
  ```tsx
  <label style={labelStyle}>
    About Me (Personality & Tone) *
    <textarea
      style={{
        ...inputStyle,
        minHeight: 72,
        maxHeight: 140,
        resize: 'vertical',
        fontFamily: 'inherit',
        fontSize: '0.85rem',
        lineHeight: 1.35,
      }}
      value={aboutMe}
      onChange={(e) => setAboutMe(e.target.value)}
      placeholder="e.g. Grumpy retired sailor who loves bitter drinks and speaks in short, dry remarks..."
      maxLength={500}
      required
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.75 }}>
      <span>Describe persona, tone, quirks, or cocktail preferences</span>
      <span>{aboutMe.length}/500</span>
    </div>
  </label>
  ```
- Visual styles strictly adopt the game's retro aesthetic (`#1a1816` background, `#c4a574` gold borders, `#2a2622` input surface, `#f2ebe3` text).

### 3. Multipart Payload Dispatch
- In `onSubmit`, serialize the sanitized text directly into the `FormData` instance under the key `'aboutMe'`:
  ```tsx
  body.set('aboutMe', trimmedBio);
  ```
- On successful submission and modal reset, reset `aboutMe` state to empty string (`setAboutMe('')`).
