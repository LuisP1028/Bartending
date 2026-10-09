Here is the comprehensive functional specification designed specifically for handoff to a coding assistant. It outlines the architectural requirements and data flow of the Category-Based RAG pipeline without dictating the exact code execution, giving the assistant the semantic guardrails it needs to build the system accurately.

You can copy and paste everything below the line directly to your assistant.

---

# Architecture Handoff: Category-Based RAG Menu Mapping Pipeline

## 1. Context and Objective

We are refactoring the `LLMMenuMapper` service for the DITHER-OS bartending simulation. The system is tasked with converting raw, unstructured restaurant menu data (e.g., markdown files like `drinks.md`) into a strictly typed `NormalizedRestaurantPayload` JSON object.

Currently, the system uses a monolithic "single-shot" approach, injecting the entire universal database (`Manifest.ts`) into the LLM prompt. This exceeds the context window of our serverless HuggingFace `DeepSeek-V4-Pro` endpoint, resulting in zero-token returns and fatal `JSON.parse` crashes.

**The Objective:** Transition from a single-shot monolithic prompt to a dynamic, multi-step **Category-Based Retrieval-Augmented Generation (RAG)** pipeline. The system must intelligently chunk the menu, route individual items to their respective database categories, and provide the LLM with only the context it needs to perform strict semantic mapping.

## 2. Core Functional Requirements

### Requirement A: Menu Chunking & Isolation

The system must no longer send the entire raw menu file to the LLM at once.

* The pipeline must feature a pre-processing step that programmatically parses the raw input text and isolates it into individual cocktail blocks (e.g., "Margarita" and its associated ingredients, vessels, and variations).
* The mapping process must iterate over these isolated blocks one by one, constructing independent payloads for each drink to strictly cap token expenditure.

### Requirement B: Component Extraction (The Routing Layer)

Before querying the main database, the system must establish what *types* of items it is looking at.

* For a given isolated cocktail block, the system must extract the raw, unmapped nouns (e.g., "Casamigos Reposado", "Coupe Glass", "Tajin").
* The system must act as a router, assigning a broad category to each unmapped string (e.g., recognizing that "Casamigos" requires the *Liquor* category, while "Coupe" requires the *Glassware* category).

### Requirement C: Dynamic Category Retrieval (The RAG Payload)

The system must never load the entire `FreestyleManifest` catalog simultaneously.

* Based on the routing established in Requirement B, the pipeline must dynamically fetch *only* the specific arrays needed for that cocktail from the database.
* **Crucial Behavior:** When retrieving a category, the system must pull the *complete* list of available items within that category (e.g., all 40+ Liquors). This acts as a multiple-choice "cheat sheet" for the downstream LLM, allowing it to evaluate novel or proprietary ingredients and snap them to the closest existing database archetype.

### Requirement D: Targeted LLM Mapping (The Translator)

The final invocation to the LLM must be highly focused and strictly bounded.

* The LLM receives:
1. The isolated raw cocktail text.
2. The tailored subset of the database (e.g., only the Liquors, Syrups, and Glasses arrays).


* The LLM's explicit directive is to act as a semantic matcher. It must evaluate the raw ingredients against the provided category arrays and select the closest 1-to-1 matching ID.
* The mapping must be mutually exclusive and "Winner-Takes-All" per categorical axis. If a brand is specified, the LLM must find the absolute closest generic archetype in the provided list. It may not hallucinate or invent IDs.

## 3. Data Flow & Expected Behaviors

1. **Input Stage:** The system receives a raw text payload representing a menu item with variations (e.g., a "Margarita" with a "Classic" variant and a "Flavored" variant).
2. **Context Assembly:** The system determines this drink utilizes liquors, juices (syrups), and rims. It fetches `getLiquors()`, `getSyrups()`, and `getRims()` from the manifest. Hardware and Garnishes are intentionally omitted to save tokens.
3. **LLM Execution:** The minified payload is dispatched to the HuggingFace endpoint.
4. **Output Stage:** The LLM returns a JSON object strictly adhering to the `NormalizedRestaurantPayload` interface. The response correctly structures arrays for `validRims` and handles the mapping of `variants` without appending conversational markdown.
5. **Validation:** The system verifies the LLM output string is not empty before attempting `JSON.parse`. If the HuggingFace endpoint returns 0 tokens, the system must throw a specific "Context Limit Exceeded" error rather than a generic syntax error, allowing for clean debugging or automated retries.

## 4. Technical Constraints

* **LLM Engine:** The mapping logic must be optimized for `deepseek-ai/DeepSeek-V4-Pro` running on a Serverless Inference API.
* **Token Efficiency:** The prompt templates must be stripped of unnecessary whitespace, indentation, or verbose formatting before transmission.
* **Database Source of Truth:** `Manifest.ts` remains the absolute source of truth. The LLM must not be allowed to deviate from the IDs presented in its retrieved context subset.