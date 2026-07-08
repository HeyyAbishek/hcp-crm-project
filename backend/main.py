import os
import traceback
import asyncio
from typing import List, Optional, Literal, TypedDict, Annotated, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages

# Load environment variables
load_dotenv()

app = FastAPI(title="AI-First HCP CRM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Schemas & State Definition ---
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

# --- 2. Initialize Groq LLM ---
llm = ChatGroq(
    temperature=0.1,
    model_name="llama-3.1-8b-instant",  
    groq_api_key=os.getenv("GROQ_API_KEY")
)

# --- 3. Define the 5 Sales & CRM Tools ---
@tool
def log_interaction(
    hcp_id: int = 0, 
    interaction_type: str = "In-Person", 
    drugs_detailed: List[str] = [], 
    samples_requested: int = 0, 
    summary: str = ""
) -> str:
    """Mandatory Tool 1: Permanently captures and logs structured interaction parameters into the CRM."""
    print(f"🛠️ [TOOL] log_interaction triggered! Samples requested: {samples_requested}")
    return f"Successfully committed interaction log to DB for HCP ID {hcp_id}."

@tool
def edit_interaction(interaction_id: int, field_to_update: str, new_value: Any) -> str:
    """Mandatory Tool 2: Modifies an existing log parameter to correct errors or update facts."""
    return f"Successfully updated {field_to_update} to '{new_value}' for interaction {interaction_id}."

@tool
def get_hcp_profile(name: str) -> str:
    """Tool 3: Fetches profile data, medical specialty, and historical logs for an HCP."""
    return f"HCP Profile Found: Dr. {name} (ID: 4029). Specialty: Oncology. Preferred contact: Email."

@tool
def check_inventory(drug_name: str) -> str:
    """Tool 4: Confirms physical sample distribution availability in rep's inventory."""
    return f"Inventory System: 120 units available for product '{drug_name}'."

@tool
def schedule_follow_up(hcp_id: int, date: str, purpose: str) -> str:
    """Tool 5: Creates a calendar appointment for the next interaction wave."""
    return f"Calendar Service: Follow-up task set for HCP {hcp_id} on {date} regarding {purpose}."

tools = [log_interaction, edit_interaction, get_hcp_profile, check_inventory, schedule_follow_up]
llm_with_tools = llm.bind_tools(tools)

# --- 4. LangGraph Control Logic (WITH HARD GUARDRAILS) ---
async def agent_node(state: AgentState):
    messages = state["messages"]
    print(f"🧠 [AGENT] Thinking... (Reading {len(messages)} messages)")
    
    # THE ULTIMATE FIX: The Tool Stripper
    # If the absolute last thing that happened was a successful tool execution...
    if len(messages) > 0 and isinstance(messages[-1], ToolMessage):
        print("🛡️ [GUARDRAIL] Tool just finished. Stripping tools from AI to force a text reply.")
        # We invoke the raw 'llm' WITHOUT tools bound. It CANNOT loop anymore.
        response = await llm.ainvoke(messages)
    else:
        # Otherwise, let it use tools normally
        response = await llm_with_tools.ainvoke(messages)
        
    print(f"🗣️ [AGENT] Replied! Did it use a tool? {hasattr(response, 'tool_calls') and bool(response.tool_calls)}")
    return {"messages": [response]}

def router_edge(state: AgentState) -> Literal["tools", "__end__"]:
    last_msg = state["messages"][-1]
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        print("🔄 [ROUTER] Tool requested! Sending to tools node...")
        return "tools"
    print("🛑 [ROUTER] No tools requested. Ending loop.")
    return "__end__"

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", ToolNode(tools=tools))

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", router_edge)
workflow.add_edge("tools", "agent")

agent_api = workflow.compile()

# --- 5. FastAPI Endpoints ---
class ChatRequest(BaseModel):
    messages: List[dict]

@app.post("/api/chat")
async def handle_agent_chat(request: ChatRequest):
    print("\n🔥 =========================================")
    print("🔥 [SERVER] Request received from React!")
    try:
        lc_messages = []
        for msg in request.messages:
            if msg.get("role") == "user":
                lc_messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                lc_messages.append(AIMessage(content=msg.get("content", ""), tool_calls=msg.get("tool_calls", [])))
            elif msg.get("role") == "tool":
                lc_messages.append(ToolMessage(content=msg.get("content", ""), tool_call_id=msg.get("tool_call_id", "")))
        
        print("🤖 [SERVER] Starting LangGraph...")
        
        response_state = await asyncio.wait_for(
            agent_api.ainvoke({"messages": lc_messages}, {"recursion_limit": 5}),
            timeout=60.0
        )
        
        print("✅ [SERVER] LangGraph successfully finished!")
        
        out_messages = []
        extracted = {}
        for m in response_state["messages"]:
            if isinstance(m, HumanMessage):
                out_messages.append({"role": "user", "content": m.content})
            elif isinstance(m, AIMessage):
                out_messages.append({"role": "assistant", "content": m.content, "tool_calls": getattr(m, 'tool_calls', [])})
                for tc in getattr(m, 'tool_calls', []):
                    if tc["name"] == "log_interaction":
                        extracted = tc["args"]
            elif isinstance(m, ToolMessage):
                out_messages.append({"role": "tool", "content": m.content, "tool_call_id": m.tool_call_id})
                
        return {"messages": out_messages, "extracted_data": extracted}
        
    except asyncio.TimeoutError:
        print("❌ [SERVER] Graph timed out after 60 seconds.")
        raise HTTPException(status_code=504, detail="AI processing timed out.")
    except Exception as e:
        print(f"❌ [SERVER] CRITICAL ERROR: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))