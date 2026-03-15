import React from "react";

function TeacherAvatar({ speaking }) {
  return (
    <div style={{ textAlign: "center", marginBottom: "20px" }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          backgroundColor: speaking ? "#4CAF50" : "#ccc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "40px",
          margin: "0 auto",
          transition: "0.3s",
        }}
      >
        🧑‍🏫
      </div>

      <p>{speaking ? "Teacher is speaking..." : "Teacher is listening..."}</p>
    </div>
  );
}

export default TeacherAvatar;