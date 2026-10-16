
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

const client = new OpenAI({ apiKey });

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20kb" }));

const conversations = new Map();

const INSTRUCTIONS =
  "You are a friendly chatbot inside a Scratch project. " +
  "Remember the conversation and use earlier messages when answering. " +
  "Answer clearly and keep answers fairly short. " +
  "Your name is ScratchGPT.";

app.get("/", (_req, res) => {
  res.send("ScratchAI server is running!");
});

app.post("/chat", async (req, res) => {
  try {
    const { question, sessionId = "scratch-default" } = req.body;

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        error: "Please enter a question."
      });
    }

    if (
      typeof sessionId !== "string" ||
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

    history.push({
      role: "user",
      content: question.trim()
    });

    // Keep at most 20 messages in memory.
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    try {
      const response = await client.responses.create({
        model: "gpt-6-luna",
        instructions: INSTRUCTIONS,
        input: history
      });

      const answer = response.output_text;

      history.push({
        role: "assistant",
        content: answer
      });

      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      res.json({ answer });
    } catch (error) {
      // Remove the unanswered question so it isn't
      // accidentally repeated in the next API request.
      history.pop();
      throw error;
    }
  } catch (error) {
    console.error("AI request failed:", error.message);

    res.status(500).json({
      error: "AI request failed. Check the server logs."
    });
  }
});

app.post("/history", (req, res) => {
  const { sessionId = "scratch-default" } = req.body;

  if (typeof sessionId !== "string" || sessionId.length > 100) {
    return res.status(400).json({ error: "Invalid session." });
  }

  const history = conversations.get(sessionId) || [];

  res.json({
    history: history.map(message => ({
      role: message.role,
      content: message.content
    }))
  });
});

app.post("/reset", (req, res) => {
  const { sessionId = "scratch-default" } = req.body;

  if (typeof sessionId !== "string" || sessionId.length > 100) {
    return res.status(400).json({ error: "Invalid session." });
  }

  conversations.delete(sessionId);

  res.json({ message: "Memory cleared!" });
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`ScratchAI server listening on port ${port}`);
});
