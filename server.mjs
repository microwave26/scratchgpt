
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const MAX_USER_MESSAGES = 25;
const MAX_HISTORY_MESSAGES = 20;

const app = express();

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.error("Missing GROQ_API_KEY environment variable.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.groq.com/openai/v1"
});

const MODEL = "openai/gpt-oss-20b";

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

function validSessionId(sessionId) {
  return (
    typeof sessionId === "string" &&
    sessionId.length >= 1 &&
    sessionId.length <= 100
  );
}

app.get("/", (_req, res) => {
  res.send("ScratchGPT server is running with Groq!");
});

app.post("/chat", async (req, res) => {
  const { question, sessionId = "scratch-default" } = req.body;

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      error: "Please enter a question."
    });
  }

  if (!validSessionId(sessionId)) {
    return res.status(400).json({
      error: "Invalid session."
    });
  }

  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }

  const history = conversations.get(sessionId);
  const count = userMessageCounts.get(sessionId) || 0;

  if (count >= MAX_USER_MESSAGES) {
    return res.status(429).json({
      error: "You've reached the 25-message limit for this conversation!"
    });
  }

  userMessageCounts.set(sessionId, count + 1);

  const userMessage = {
    role: "user",
    content: question.trim()
  };

  history.push(userMessage);

  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input: history
    });

    const answer =
      response.output_text ||
      "ScratchGPT couldn't generate a reply.";

    history.push({
      role: "assistant",
      content: answer
    });

    if (history.length > MAX_HISTORY_MESSAGES) {
      history.splice(0, history.length - MAX_HISTORY_MESSAGES);
    }

    return res.json({ answer });
  } catch (error) {
    // Remove this unanswered question from the history.
    const index = history.indexOf(userMessage);
    if (index !== -1) {
      history.splice(index, 1);
    }

    userMessageCounts.set(
      sessionId,
      Math.max(0, (userMessageCounts.get(sessionId) || 1) - 1)
    );

    console.error(
      "Groq API request failed:",
      error.status || "",
      error.message
    );

    if (error.status === 429) {
      return res.status(429).json({
        error: "Groq's rate limit was reached. Please try again later."
      });
    }

    if (error.status === 401) {
      return res.status(500).json({
        error: "Groq rejected the API key. Check GROQ_API_KEY in Render."
      });
    }

    return res.status(500).json({
      error: "ScratchGPT couldn't reach Groq. Check the server logs."
    });
  }
});

app.post("/history", (req, res) => {
  const { sessionId = "scratch-default" } = req.body;

  if (!validSessionId(sessionId)) {
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

  if (!validSessionId(sessionId)) {
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
  console.log(`ScratchGPT server listening on port ${port}`);
  console.log(`AI provider: Groq | Model: ${MODEL}`);
});
