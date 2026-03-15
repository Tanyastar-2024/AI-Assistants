// src/pages/Tutor.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase'; // Import Firebase
import { onAuthStateChanged } from 'firebase/auth';
import { useSpeechToText, useTextToSpeech } from "../hooks/useSpeech";
// import ChatMessage from "../components/ChatMessage";
// import TeacherAvatar from "../components/TeacherAvatar";
import { supabase } from '../integrations/supabase/client';

export default function Tutor() {
    const navigate = useNavigate();
    const { transcript, startListening, stopListening, isListening } = useSpeechToText();
    const { speak, isSpeaking } = useTextToSpeech();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Firebase Auth Check
    useEffect(() => {
        try {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (!user) {
                    // navigate('/login');
                } else {
                    // User is logged in, continue
                }
            });
            return () => unsubscribe();
        } catch (error) {
            console.error('Auth error:', error);
        }
    }, []);

    const askTutor = async () => {
        if (!transcript.trim()) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('ai-teacher', {
                body: { question: transcript }
            });

            if (error) {
                throw error;
            }

            setMessages(prev => [
                ...prev,
                { role: "student", text: transcript },
                { role: "assistant", text: data.answer }
            ]);

            speak(data.answer);
        } catch (error) {
            console.error("Error asking tutor:", error);
            setMessages(prev => [
                ...prev,
                { role: "student", text: transcript },
                { role: "assistant", text: "Sorry, I couldn't process your question right now. Please try again." }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>AI Tutor</h1>
            <p>Ask me anything about your studies!</p>

            <div style={{ marginTop: '20px', maxWidth: '600px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        backgroundColor: isSpeaking ? 'green' : 'gray',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '40px'
                    }}>
                        🧑‍🏫
                    </div>
                    <p>{isSpeaking ? "Speaking..." : "Listening..."}</p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={isLoading}
                        style={{ padding: '10px 20px', marginRight: '10px' }}
                    >
                        {isListening ? 'Stop Listening' : 'Start Listening'}
                    </button>

                    <button
                        onClick={askTutor}
                        disabled={!transcript.trim() || isLoading}
                        style={{ padding: '10px 20px' }}
                    >
                        {isLoading ? 'Thinking...' : 'Ask Tutor'}
                    </button>
                </div>

                {transcript && (
                    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                        <strong>Your question:</strong> {transcript}
                    </div>
                )}

                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
                    {messages.map((message, index) => (
                        <div key={index} style={{
                            marginBottom: '10px',
                            textAlign: message.role === 'student' ? 'right' : 'left'
                        }}>
                            <div style={{
                                display: 'inline-block',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: message.role === 'student' ? '#007bff' : '#f0f0f0',
                                color: message.role === 'student' ? 'white' : 'black'
                            }}>
                                {message.text}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}