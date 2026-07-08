import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateForm, addUserMessage, sendInteraction } from './store/interactionSlice';
import { Send, User, Bot, Activity } from 'lucide-react';

export default function App() {
  const dispatch = useDispatch();
  const { messages, formData, loading } = useSelector((state) => state.interaction);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMessages = [...messages, { role: 'user', content: inputText }];
    dispatch(addUserMessage(inputText));
    dispatch(sendInteraction(newMessages));
    setInputText('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif', backgroundColor: '#f3f4f6' }}>
      
      {/* LEFT PANE: AI Chat Interface */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#1e3a8a', color: 'white' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Activity /> LangGraph CRM Agent</h2>
        </div>
        
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '12px', color: '#6b7280', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'user' ? <><User size={14}/> You</> : <><Bot size={14}/> AI Assistant</>}
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: msg.role === 'user' ? '#2563eb' : '#f3f4f6', color: msg.role === 'user' ? 'white' : 'black' }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && <div style={{ color: '#6b7280', fontSize: '14px' }}>Agent is thinking...</div>}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="E.g., I met Dr. Smith today about Lipitor..."
            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
          <button 
            onClick={handleSendMessage}
            disabled={loading}
            style={{ padding: '12px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Send size={18} /> Send
          </button>
        </div>
      </div>

      {/* RIGHT PANE: Structured CRM Form */}
      <div style={{ flex: 1, padding: '40px', backgroundColor: '#f9fafb', overflowY: 'auto' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#111827' }}>Log Interaction Record</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>HCP ID (Auto-extracted or Manual)</label>
              <input type="number" value={formData.hcp_id} onChange={(e) => dispatch(updateForm({ hcp_id: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>Interaction Type</label>
              <select value={formData.interaction_type} onChange={(e) => dispatch(updateForm({ interaction_type: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                <option>In-Person</option>
                <option>Virtual</option>
                <option>Email</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>Drugs Discussed</label>
              <input type="text" value={formData.drugs_detailed} onChange={(e) => dispatch(updateForm({ drugs_detailed: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>Samples Requested</label>
              <input type="number" value={formData.samples_requested} onChange={(e) => dispatch(updateForm({ samples_requested: parseInt(e.target.value) || 0 }))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#374151' }}>Interaction Summary</label>
              <textarea value={formData.summary} onChange={(e) => dispatch(updateForm({ summary: e.target.value }))} rows={4} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }} />
            </div>

            <button style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}>
              Save to CRM Database
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}