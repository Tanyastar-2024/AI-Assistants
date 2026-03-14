// src/pages/Dashboard.jsx
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            // Tell the PHP backend to destroy the session
            const response = await fetch('http://localhost/study_app/api/logout.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include' // This is crucial so PHP knows WHICH session to destroy
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Instantly route back to the login page
                navigate('/login');
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            alert('Could not connect to server.');
        }
    };

    return (
        <div style={{ padding: '40px', color: 'white', zIndex: 10, position: 'relative' }}>
            {/* Background Orbs */}
            <div className="bg-orbs">
                <div className="orb orb1"></div>
                <div className="orb orb2"></div>
                <div className="orb orb3"></div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '32px', margin: 0 }}>
                    Welcome to StudyQuest ✦
                </h1>
                
                {/* Logout Button */}
                <button 
                    onClick={handleLogout} 
                    className="btn btn-outline" 
                    style={{ borderColor: 'var(--pink)', color: 'var(--pink)' }}
                >
                    Log Out
                </button>
            </div>

            <p style={{ color: 'var(--text-dim)' }}>You have successfully logged in via React to your PHP backend!</p>
            
            <div className="card" style={{ marginTop: '30px', maxWidth: '400px' }}>
                <p>We will migrate your beautiful dashboard UI into this component next.</p>
            </div>
        </div>
    );
}