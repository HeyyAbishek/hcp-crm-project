# AI-First HCP CRM (Customer Relationship Management)

## 📌 Project Overview
This project is an AI-first Customer Relationship Management (CRM) system designed specifically for the life sciences sector. It provides pharmaceutical field representatives with a frictionless "Log Interaction Screen," allowing them to log complex interactions with Healthcare Professionals (HCPs) using a conversational AI interface rather than rigid, manual forms.

The system utilizes an autonomous LangGraph agent powered by Groq's Llama 3 model to process natural language, extract exact medical parameters, and execute structured database tools securely.

## 🏗️ Core Architecture & Tech Stack
* **Frontend:** React with Redux (State Management) and Vite.
* **Backend:** Python with FastAPI.
* **AI Agent Framework:** LangGraph & LangChain.
* **LLM Engine:** Groq API (`llama-3.1-8b-instant`).
* **Database:** MySQL / PostgreSQL (Relational schema mapping).
* **Typography:** Google Inter.

### 🚀 Key Engineering Highlights
1. **Zero-CORS Local Routing:** Implemented a Vite Proxy network layer to eliminate browser preflight (`OPTIONS`) drops, allowing seamless cross-origin data payloads.
2. **Asynchronous Event Loop:** LangGraph agent nodes are fully executed via `await agent_api.ainvoke()` within FastAPI, preventing complex AI routing from blocking the server's thread.
3. **Deterministic Tool Stripping:** Designed a strict state-machine guardrail that dynamically strips tools from the LLM immediately after a successful database commit, permanently eliminating recursive execution loops inherent to smaller, fast LLMs.

---

## 🤖 The Role of the LangGraph Agent
In traditional CRMs, field representatives spend excessive time navigating dropdowns and multi-tab forms. In this architecture, the LangGraph agent serves as an **Autonomous Orchestrator** between the representative's natural speech and the system of record. 

* **State Management:** Maintains a persistent memory stream (`AgentState`), appending human statements, tool executions, and strict system guardrails.
* **Intent Grounding:** Intercepts ambiguous statements (e.g., *"He wanted 5 samples of Lipitor"*) and maps them directly to strict code parameters via automated entity extraction.
* **Deterministic Guardrails:** Utilizes conditional edges and system prompts to balance conversational flexibility with strict runtime safety, preventing the interface from executing false database operations.

---

## 🛠️ The 5 LangGraph Tools (Sales Operations)
The agent is equipped with five specific tools mapped to life science compliance workflows:

1. **`log_interaction` (Core Requirement)**
   * **Purpose:** Captures compliant interaction parameters immediately post-visit.
   * **Mechanism:** Takes the unstructured message string, extracts the target HCP ID, identifies explicit drug names, and quantifies sample requests to ensure legal inventory tracking.
2. **`edit_interaction` (Core Requirement)**
   * **Purpose:** Allows real-time modification of pending records prior to final database synchronization.
   * **Mechanism:** Accepts an `interaction_id` and targets a flexible schema, allowing field reps to fix typos, alter drug selections, or append updated notes via voice commands.
3. **`get_hcp_profile`**
   * **Purpose:** Provides pre-call planning insight (medical specialty, historical preferences, and contact restrictions) right before stepping into a clinic.
4. **`check_inventory`**
   * **Purpose:** Mitigates compliance risks under drug distribution regulations by verifying available allocations before a rep promises physical samples to a physician.
5. **`schedule_follow_up`**
   * **Purpose:** Automates calendar entry creation by identifying dates and intent markers within natural conversation, dropping actionable tasks into the rep's pipeline.
     

---

### 📝 Technical Note on LLM Selection
*Note: The original project specification requested the use of Groq's `gemma2-9b-it` model. However, during development, Groq's API returned a `400 Model Decommissioned` status for that specific endpoint. To ensure a stable, functional prototype, the architecture was dynamically adapted to utilize Groq's active `llama-3.1-8b-instant` model. The LangGraph tool-binding and extraction logic remains model-agnostic.*

## 💻 Local Setup Instructions

Repository: https://github.com/HeyyAbishek/hcp-crm-project

### 1. Clone the repository

```bash
git clone https://github.com/HeyyAbishek/hcp-crm-project.git
cd hcp-crm-project
```
2. Start the Backend (FastAPI)
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
3. Start the Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev
```


## 🗄️ Database Schema (MySQL / PostgreSQL)
The backend tools map the AI's extracted JSON parameters into the following relational structure:

```sql
-- Core Table for tracking Medical Professionals
CREATE TABLE hcps (
    hcp_id INT PRIMARY KEY AUTOINCREMENT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    specialty VARCHAR(100),
    preferred_contact_method VARCHAR(50)
);

-- Table for tracking compliant field interactions
CREATE TABLE interactions (
    interaction_id INT PRIMARY KEY AUTOINCREMENT,
    hcp_id INT,
    interaction_type VARCHAR(50) DEFAULT 'In-Person',
    drugs_detailed TEXT, -- Stores JSON array of strings
    samples_requested INT DEFAULT 0,
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hcp_id) REFERENCES hcps(hcp_id)
);
