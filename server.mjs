
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const MAX_USER_MESSAGES = 25;
const MAX_HISTORY_MESSAGES = 20;

const app = express();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20kb" }));

// Store conversations and message counts in server memory.
const conversations = new Map();
const userMessageCounts = new Map();

const INSTRUCTIONS =
  "You are a friendly chatbot inside a Scratch project. " +
  "Remember the conversation and use earlier messages when answering. " +
  "Answer clearly and keep answers fairly short. " +
  "Your name is ScratchGPT.";

app.get("/", (_req, res) => {
  res.send("ScratchAI server is running!");
});

app.post("/chat", async (req, res) => {
  const { question, sessionId = "scratch-default" } = req.body;

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      error: "Please enter a question."
    });
  }

  if (
    typeof sessionId !== "string" ||
    sessionId.length < 1 ||
    sessionId.length > 100
  ) {
    return res.status(400).json({
      error: "Invalid session."
    });
  }

  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }

  const history = conversations.get(sessionId);
  const userMessageCount = userMessageCounts.get(sessionId) || 0;

  // Enforce the limit before making an API request.
  if (userMessageCount >= MAX_USER_MESSAGES) {
    return res.status(429).json({
      error: "You've reached the 25-message limit for this conversation!"
    });
  }

  // Count this request so simultaneous requests cannot easily
  // slip past the limit in this single server process.
  userMessageCounts.set(sessionId, userMessageCount + 1);

  history.push({
    role: "user",
    content: question.trim()
  });

  try {
    const response = await client.responses.create({
      model: "gpt-6-luna",
      instructions: INSTRUCTIONS,
      input: history
    });

    const answer = response.output_text || "ScratchGPT couldn't generate a reply.";

    history.push({
      role: "assistant",
      content: answer
    });

    // Keep the most recent 20 messages for conversation context.
    if (history.length > MAX_HISTORY_MESSAGES) {
      history.splice(0, history.length - MAX_HISTORY_MESSAGES);
    }

    return res.json({ answer });
  } catch (error) {
    // Remove the unanswered question and restore the counter
    // if the AI request fails.
    history.pop();

    const currentCount = userMessageCounts.get(sessionId) || 0;
    userMessageCounts.set(
      sessionId,
      Math.max(0, currentCount - 1)
    );

    console.error("AI request failed:", error.message);

    return res.status(500).json({
      error: "AI request failed. Check the server logs."
    });
  }
});

app.post("/history", (req, res) => {
  const { sessionId = "scratch-default" } = req.body;

  if (
    typeof sessionId !== "string" ||
    sessionId.length < 1 ||
    sessionId.length > 100
  ) {
    return res.status(400).json({
      error: "Invalid session."
    });
  }

  const history = conversations.get(sessionId) || [];

  return res.json({
    history: history.map(message => ({
      role: message.role,
      content: message.content
    }))
  });
});

app.post("/reset", (req, res) => {
  const { sessionId = "scratch-default" } = req.body;

  if (
    typeof sessionId !== "string" ||
    sessionId.length < 1 ||
    sessionId.length > 100
  ) {
    return res.status(400).json({
      error: "Invalid session."
    });
  }

  conversations.delete(sessionId);
  userMessageCounts.delete(sessionId);

  return res.json({
    message: "Memory cleared!"
  });
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`ScratchAI server listening on port ${port}`);
});
