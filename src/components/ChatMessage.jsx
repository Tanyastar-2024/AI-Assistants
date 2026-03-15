import React from "react";

function ChatMessage({ role, text }) {
  const isUser = role === "student";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        margin: "10px 0",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: "12px",
          background: isUser ? "#4CAF50" : "#eee",
          color: isUser ? "white" : "black",
          maxWidth: "60%",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default ChatMessage;