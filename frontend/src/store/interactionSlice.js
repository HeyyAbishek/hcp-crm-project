import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// This talks to the FastAPI server we just built
export const sendInteraction = createAsyncThunk(
  'interaction/send',
  async (messages, { rejectWithValue }) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Backend error');
      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        return rejectWithValue('Request timed out after 15 seconds');
      }
      return rejectWithValue(err.message);
    }
  }
);

const interactionSlice = createSlice({
  name: 'interaction',
  initialState: {
    messages: [
      { role: 'assistant', content: 'Hello! I am your AI CRM assistant. Describe your interaction with the HCP, or use the form.' }
    ],
    formData: {
      hcp_id: '',
      interaction_type: 'In-Person',
      drugs_detailed: '',
      samples_requested: 0,
      summary: ''
    },
    loading: false,
  },
  reducers: {
    updateForm: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', content: action.payload });
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendInteraction.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendInteraction.fulfilled, (state, action) => {
        state.loading = false;
        // Update chat history with LangGraph's response
        if (action.payload.messages) {
          state.messages = action.payload.messages;
        }
        // If the LLM extracted data via tools, auto-fill the form!
        if (action.payload.extracted_data) {
           const data = action.payload.extracted_data;
           if(data.hcp_id) state.formData.hcp_id = data.hcp_id;
           if(data.interaction_type) state.formData.interaction_type = data.interaction_type;
           if(data.drugs_detailed) state.formData.drugs_detailed = data.drugs_detailed.join(', ');
           if(data.samples_requested !== undefined) state.formData.samples_requested = data.samples_requested;
           if(data.summary) state.formData.summary = data.summary;
        }
      })
      .addCase(sendInteraction.rejected, (state, action) => {
        state.loading = false;
        state.messages.push({ role: 'assistant', content: action.payload || 'Error connecting to the LangGraph backend.' });
      });
  }
});

export const { updateForm, addUserMessage } = interactionSlice.actions;
export default interactionSlice.reducer;