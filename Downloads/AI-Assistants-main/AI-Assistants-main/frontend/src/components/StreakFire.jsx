import React from 'react';
import './StreakFire.css';

export default function StreakFire({ streak, small = false }) {
    // Determine the fire's state based on the streak count
    let streakState = 'calm';
    if (streak === 1) streakState = 'new';
    else if (streak >= 2 && streak <= 4) streakState = 'growing';
    else if (streak >= 5 && streak <= 9) streakState = 'blaze';
    else if (streak >= 10) streakState = 'inferno';

    const classes = `streak-fire-container ${streakState} ${small ? 'small' : ''}`;

    return (
        <div className={classes}>
            <div className="flame main-flame"></div>
            <div className="flame inner-flame"></div>
            {streakState === 'blaze' || streakState === 'inferno' ? (
                <>
                    <div className="flame spark spark1"></div>
                    <div className="flame spark spark2"></div>
                </>
            ) : null}
            {streakState === 'inferno' ? (
                <>
                    <div className="flame spark spark3"></div>
                    <div className="flame spark spark4"></div>
                </>
            ) : null}
        </div>
    );
}
